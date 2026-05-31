import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
const FRONTEND_API_BASE = process.env.FRONTEND_API_BASE || "";

async function preparePage(browser, name, viewport, isMobile = false) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
    hasTouch: isMobile,
  });
  const messages = [];
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => messages.push(`pageerror: ${err.message}`));
  await page.addInitScript((apiBase) => {
    localStorage.setItem("vpro_session_token", crypto.randomUUID().replaceAll("-", ""));
    localStorage.setItem("vpro_alert_mode", "false");
    localStorage.setItem("vpro_profile", "PMR");
    localStorage.setItem("vpro_language", "es");
    localStorage.removeItem("vpro_detail_collapsed");
    localStorage.removeItem("vpro_legend_collapsed");
    localStorage.removeItem("vpro_poi_type");
    if (apiBase) {
      localStorage.setItem("vpro_api_base", apiBase);
    }
  }, FRONTEND_API_BASE);
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator(".event-card").first().waitFor({ timeout: 15000 });
  return { page, messages, name, isMobile };
}

async function assertOperationalDesktop(page) {
  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      const style = element ? getComputedStyle(element) : null;
      return box && style
        ? {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            display: style.display,
            position: style.position,
            overflowY: style.overflowY,
          }
        : null;
    };
    return {
      header: rect(".civic-header"),
      context: rect(".events-context-bar"),
      left: rect(".left-rail"),
      map: rect(".map-workspace"),
      detail: rect(".detail-rail"),
      panel: rect("#selectedEventPanel"),
      nav: rect(".section-nav.view-tabs"),
      heroExists: Boolean(document.querySelector(".decision-hero")),
      eventListInsideLeftRail: Boolean(document.querySelector(".left-rail #events #eventList")),
      bottomDetailToggleDisplay: getComputedStyle(document.querySelector("#detailPanelToggle")).display,
      alertDisplay: getComputedStyle(document.querySelector("#alertModeToggle")).display,
      bodyOverflowX: document.body.scrollWidth - window.innerWidth,
      navCenterDelta: Math.abs((document.querySelector(".section-nav.view-tabs").getBoundingClientRect().left
        + document.querySelector(".section-nav.view-tabs").getBoundingClientRect().width / 2) - window.innerWidth / 2),
    };
  });

  if (layout.header.height < 64 || layout.header.height > 72) {
    throw new Error(`Header is not compact: ${JSON.stringify(layout.header)}`);
  }
  if (layout.context.height < 48 || layout.context.height > 56 || layout.heroExists) {
    throw new Error(`Context bar/hero state is wrong: ${JSON.stringify(layout)}`);
  }
  if (!layout.eventListInsideLeftRail || !(layout.left.x < layout.map.x && layout.map.x < layout.detail.x)) {
    throw new Error(`Events desktop is not a three-column operational layout: ${JSON.stringify(layout)}`);
  }
  if (layout.detail.position !== "relative" || layout.detail.overflowY !== "auto" || layout.panel.overflowY !== "visible" || layout.bottomDetailToggleDisplay !== "none") {
    throw new Error(`Detail panel still behaves like a floating/bottom sheet: ${JSON.stringify(layout)}`);
  }
  if (layout.alertDisplay !== "none" || layout.bodyOverflowX !== 0) {
    throw new Error(`Header/overflow guard failed: ${JSON.stringify(layout)}`);
  }
  if (layout.navCenterDelta > 18) {
    throw new Error(`Primary navigation is not centered: ${JSON.stringify(layout)}`);
  }
}

async function assertOperationalContent(page, name) {
  const data = await page.evaluate(() => ({
    title: document.title,
    brand: document.querySelector(".brand-copy strong")?.textContent,
    status: document.querySelector("#statusText")?.textContent,
    cards: document.querySelectorAll(".event-card").length,
    eventCountBadge: document.querySelector("#eventCountBadge")?.textContent,
    searchPlaceholder: document.querySelector("#eventSearch")?.getAttribute("placeholder"),
    streetIndexCount: window.vproStreetIndex?.count || 0,
    profileButtons: Array.from(document.querySelectorAll("[data-profile]")).map((button) => button.textContent),
    activeProfile: document.querySelector("[data-profile][aria-pressed='true']")?.dataset.profile,
    detailText: document.querySelector("#selectedEventPanel")?.textContent,
    evidenceLinks: Array.from(document.querySelectorAll(".evidence-actions a")).map((link) => ({
      text: link.textContent,
      href: link.href,
    })),
    filters: {
      impact: Boolean(document.querySelector("#impactFilter")),
      withAlternative: Boolean(document.querySelector("#withAlternativeFilter")),
      official: Boolean(document.querySelector("#officialSourceFilter")),
    },
    tabs: Array.from(document.querySelectorAll("[data-view]")).map((item) => item.textContent),
    mapHeight: document.querySelector("#map")?.getBoundingClientRect().height,
    heroExists: Boolean(document.querySelector(".decision-hero")),
  }));

  if (!data.title.includes("València Proactiva") || !data.brand?.includes("Proactiva")) {
    throw new Error(`Brand is broken: ${JSON.stringify(data)}`);
  }
  if (!data.status?.includes("incidencia") || !data.status?.includes("alternativa") || data.cards < 1 || data.eventCountBadge !== String(data.cards)) {
    throw new Error(`Real event count/status is missing: ${JSON.stringify(data)}`);
  }
  if (data.searchPlaceholder !== "Buscar evento o calle oficial de València..." || data.filters.impact || !data.filters.withAlternative || data.filters.official || data.streetIndexCount < 1000) {
    throw new Error(`Sidebar controls are incomplete: ${JSON.stringify(data)}`);
  }
  if (data.activeProfile !== "PMR" || !data.profileButtons.join(" ").includes("Comercio")) {
    throw new Error(`Profile selector is broken: ${JSON.stringify(data)}`);
  }
  for (const expected of ["Qué ocurre", "Dónde", "A quién puede afectar", "Qué alternativa hay", "Por qué esta alternativa", "De dónde sale el dato"]) {
    if (!data.detailText?.includes(expected)) {
      throw new Error(`Detail panel lacks ${expected}: ${data.detailText}`);
    }
  }
  for (const expected of ["Fuente municipal", "Ficha pública", "Export JSON"]) {
    if (!data.evidenceLinks.some((link) => link.text.includes(expected))) {
      throw new Error(`Evidence link missing ${expected}: ${JSON.stringify(data.evidenceLinks)}`);
    }
  }
  if (data.heroExists || data.mapHeight < (name === "desktop" ? 500 : 300) || !data.tabs.includes("Información")) {
    throw new Error(`Operational surface regressed: ${JSON.stringify(data)}`);
  }
  await assertEventCardStructure(page);
  await assertEventListAccess(page);
}

async function assertEventCardStructure(page) {
  const card = await page.evaluate(() => {
    const first = document.querySelector(".event-card");
    if (!first) return null;
    const rectFor = (selector) => {
      const element = first.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      const style = element ? getComputedStyle(element) : null;
      return rect && style
        ? {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            position: style.position,
          }
        : null;
    };
    return {
      card: (() => {
        const rect = first.getBoundingClientRect();
        const style = getComputedStyle(first);
        return {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          scrollHeight: first.scrollHeight,
          overflow: style.overflow,
        };
      })(),
      type: rectFor(".event-type"),
      distance: rectFor(".event-distance"),
      impact: rectFor(".severity-badge"),
      impactRow: rectFor(".event-impact-row"),
      title: rectFor("h3"),
      alternative: rectFor(".event-alt-summary"),
      beforeContent: getComputedStyle(first, "::before").content,
    };
  });
  if (!card?.type || !card?.distance || !card?.title || !card?.alternative) {
    throw new Error(`Event card misses required operational rows: ${JSON.stringify(card)}`);
  }
  if (card.impact || card.impactRow) {
    throw new Error(`Event card still exposes impact controls: ${JSON.stringify(card)}`);
  }
  const rows = [card.type, card.title, card.alternative];
  const verticalOrderOk = rows.every((rect, index) => index === 0 || rows[index - 1].bottom <= rect.top + 2);
  const headerNoOverlap = card.type.right <= card.distance.left || card.distance.right <= card.type.left || Math.abs(card.type.top - card.distance.top) > 24;
  const noAbsoluteControls = [card.type, card.distance, card.title, card.alternative].every((rect) => rect.position !== "absolute" && rect.position !== "fixed");
  const titleLooksReadable = card.title.width > 110 && card.title.height < 50;
  const contentInsideCard = card.alternative.bottom <= card.card.bottom + 1 && card.card.scrollHeight <= Math.ceil(card.card.height) + 1;
  if (!verticalOrderOk || !headerNoOverlap || !noAbsoluteControls || !titleLooksReadable || !contentInsideCard || card.beforeContent !== "none") {
    throw new Error(`Event card rows overlap or use absolute layout: ${JSON.stringify(card)}`);
  }
  const overlapState = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".event-card"));
    return cards.map((cardElement, index) => {
      const cardRect = cardElement.getBoundingClientRect();
      const altRect = cardElement.querySelector(".event-alt-summary")?.getBoundingClientRect();
      const nextRect = cards[index + 1]?.getBoundingClientRect();
      return {
        index,
        cardBottom: cardRect.bottom,
        altBottom: altRect?.bottom || 0,
        nextTop: nextRect?.top || null,
        altInsideCard: !altRect || altRect.bottom <= cardRect.bottom + 1,
        overlapsNext: Boolean(altRect && nextRect && altRect.bottom > nextRect.top - 1),
      };
    });
  });
  if (overlapState.some((item) => !item.altInsideCard || item.overlapsNext)) {
    throw new Error(`Event cards visually overlap: ${JSON.stringify(overlapState)}`);
  }
}

async function assertEventListAccess(page) {
  const listState = await page.evaluate(() => {
    const stack = document.querySelector("#eventList");
    const cards = Array.from(document.querySelectorAll(".event-card"));
    const badgeText = document.querySelector("#eventCountBadge")?.textContent || "";
    if (!stack || cards.length === 0) {
      return { ok: false, reason: "missing-list", cards: cards.length, badgeText };
    }
    const last = cards.at(-1);
    last.scrollIntoView({ block: "nearest" });
    const stackRect = stack.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const badgeCount = Number.parseInt(badgeText, 10);
    return {
      ok: true,
      cards: cards.length,
      badgeCount,
      badgeText,
      stackClientHeight: stack.clientHeight,
      stackScrollHeight: stack.scrollHeight,
      lastInsideStack: lastRect.top >= stackRect.top - 1 && lastRect.bottom <= stackRect.bottom + 1,
    };
  });
  if (!listState.ok || listState.badgeCount !== listState.cards || !listState.lastInsideStack) {
    throw new Error(`Event list count/scroll is not accessible: ${JSON.stringify(listState)}`);
  }
}

async function assertInteractions(page) {
  await page.locator("[data-profile='COMMERCIAL']").click();
  await page.waitForFunction(() => document.querySelector("[data-profile='COMMERCIAL']")?.getAttribute("aria-pressed") === "true");
  await page.locator(".event-card").first().waitFor({ timeout: 10000 });

  await page.locator("[data-profile='COMMERCIAL'] .profile-help").click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-profile='COMMERCIAL'] .profile-help-popover")).display !== "none");

  const eventSearchTerm = await page.locator(".event-card h3").first().evaluate((heading) => {
    const fallback = heading.textContent.trim();
    return fallback.split(/\s+/).find((part) => part.length >= 4 && !/^\d+$/.test(part)) || fallback;
  });
  await page.locator("#eventSearch").fill(eventSearchTerm);
  await page.waitForFunction(() => document.querySelectorAll(".event-card").length >= 1);
  await page.locator("#eventSearch").press("Enter");
  await page.waitForFunction(
    (term) => document.querySelector("#selectedEventPanel")?.textContent.toLowerCase().includes(term.toLowerCase()),
    eventSearchTerm,
  );
  await page.locator("#eventSearch").fill("sin-resultados-valencia-proactiva");
  await page.locator("#eventList").filter({ hasText: "No hay eventos que coincidan con la búsqueda." }).waitFor({ timeout: 5000 });
  await page.locator("#eventSearch").fill("");
  await page.locator("#withAlternativeFilter").check();
  await page.waitForFunction(() => window.vproDebug?.state?.visibleCards?.length >= 1 && window.vproDebug.state.visibleCards.every((card) => Boolean(card.alternative)));
  await page.locator("#withAlternativeFilter").uncheck();

  await page.locator("[data-view='sources']").click();
  await page.locator("#sourcesPanel").filter({ hasText: "Fuentes y trazabilidad" }).waitFor({ timeout: 5000 });
  await assertNoOperationalContext(page, "sources");
  await page.locator("[data-view='methodology']").click();
  await page.locator("#methodologyPanel").filter({ hasText: "Metodología" }).waitFor({ timeout: 5000 });
  await assertNoOperationalContext(page, "methodology");
  await assertMethodologyLayout(page);
  await page.locator("[data-view='info']").click();
  await page.locator("#additionalInfoPanel").filter({ hasText: "Información del proyecto" }).waitFor({ timeout: 5000 });
  await assertNoOperationalContext(page, "info");
  await assertContestCopy(page);
  await assertTraceableCaseLayout(page);
  await assertInformationalTabsUseSharedSystem(page);
  await page.locator("[data-view='events']").click();
  await page.locator(".event-card").first().waitFor({ timeout: 5000 });

  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("event-points")), null, { timeout: 12000 });
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("impact-zones-fill")), null, { timeout: 12000 });
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("selected-alternative-point")), null, { timeout: 12000 });
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("selected-decision-line")), null, { timeout: 12000 });
  await assertMapLegendContract(page);
  await assertStreetSearch(page);
  await clickFirstMapMarker(page);

  await page.locator("#selectedEventPanel .feedback-button[data-vote='1']").click();
  await page.locator("#toast").filter({ hasText: /Valoración (registrada|anotada)/ }).waitFor({ timeout: 5000 });
}

async function assertContestCopy(page) {
  const copy = await page.evaluate(() => {
    const text = document.querySelector("#additionalInfoPanel")?.textContent || "";
    const contestLinks = [...document.querySelectorAll(`#additionalInfoPanel a[href*="AD.TR.15"]`)]
      .map((link) => link.textContent.trim());
    return {
      hasFormalName: text.includes("Premios para proyectos de datos abiertos y periodismo de datos Valencia 2026"),
      contestLinksUseFormalName: contestLinks.length > 0
        && contestLinks.every((label) => label === "Premios para proyectos de datos abiertos y periodismo de datos Valencia 2026"),
      hasOldContest: text.includes("Convocatoria AD.TR.15"),
      hasOldProject: text.includes("Proyecto AD.TR.15"),
      hasOldOpenDataProject: text.includes("Proyecto AD.TR.15 de datos abiertos"),
    };
  });
  if (!copy.hasFormalName || !copy.contestLinksUseFormalName || copy.hasOldContest || copy.hasOldProject || copy.hasOldOpenDataProject) {
    throw new Error(`Contest copy is not using the public formal name: ${JSON.stringify(copy)}`);
  }
}

async function assertMapLegendContract(page) {
  const legend = await page.evaluate(() => {
    const trafficFeatures = window.vproDebug?.map?.getSource("traffic-lines")?.serialize?.()?.data?.features || [];
    const trafficItem = document.querySelector("#legendTrafficItem");
    const selected = document.querySelector(".legend-selected-alternative");
    const alternative = document.querySelector(".legend-alternative");
    const style = (element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        boxShadow: computed.boxShadow,
      };
    };
    return {
      trafficFeatures: trafficFeatures.length,
      trafficLegendHidden: Boolean(trafficItem?.hidden),
      selectedImage: window.vproDebug?.map?.hasImage("vpro-alt-selected-marker") || false,
      alternativeImage: window.vproDebug?.map?.hasImage("vpro-alt-marker") || false,
      selectedStyle: selected ? style(selected) : null,
      alternativeStyle: alternative ? style(alternative) : null,
      labels: [...document.querySelectorAll(".legend-items > span:not([hidden])")]
        .map((item) => item.textContent.trim()),
    };
  });

  if (!legend.selectedImage || !legend.alternativeImage) {
    throw new Error(`Alternative marker images are missing: ${JSON.stringify(legend)}`);
  }
  if (legend.trafficFeatures === 0 && !legend.trafficLegendHidden) {
    throw new Error(`Traffic legend is visible without traffic incidents: ${JSON.stringify(legend)}`);
  }
  if (legend.selectedStyle?.background === legend.alternativeStyle?.background || !legend.selectedStyle?.boxShadow || legend.selectedStyle.boxShadow === "none") {
    throw new Error(`Recommended and other alternatives are not visually distinct: ${JSON.stringify(legend)}`);
  }
}

async function assertStreetSearch(page) {
  await page.locator("#eventSearch").fill("colon");
  await page.locator("#streetSearchResults button").first().waitFor({ timeout: 5000 });
  await page.waitForFunction(() => window.vproDebug?.state?.visibleCards?.length >= 1);
  await page.locator("#streetSearchResults").filter({ hasText: "Geoportal municipal" }).waitFor({ timeout: 5000 });
  await page.locator("#streetSearchResults button").first().click();
  const streetState = await page.evaluate(() => ({
    selectedStreet: window.vproDebug?.state?.selectedStreet?.name || "",
    streetCount: window.vproStreetIndex?.count || 0,
    source: window.vproStreetIndex?.source?.url || "",
    hasStreetLayer: Boolean(window.vproDebug?.map?.getLayer("street-search-point")),
    visibleCards: window.vproDebug?.state?.visibleCards?.length || 0,
    eventFeatures: window.vproDebug?.map?.getSource("event-points")?.serialize?.()?.data?.features?.length || 0,
    selectedAlternativeFeatures: window.vproDebug?.map?.getSource("selected-alternative-point")?.serialize?.()?.data?.features?.length || 0,
  }));
  if (!streetState.selectedStreet || streetState.streetCount < 1000 || !streetState.source.includes("geoportal.valencia.es") || !streetState.hasStreetLayer || streetState.visibleCards < 1 || streetState.eventFeatures < 1 || streetState.selectedAlternativeFeatures < 1) {
    throw new Error(`Official street search is not working locally: ${JSON.stringify(streetState)}`);
  }
  await page.locator("[data-profile='PMR']").click();
  await page.waitForFunction(() => document.querySelector("[data-profile='PMR']")?.getAttribute("aria-pressed") === "true");
  await page.waitForFunction(() => {
    const map = window.vproDebug?.map;
    const state = window.vproDebug?.state;
    const selectedCenter = state?.visibleCards?.[state.selectedCardIndex]?.event?.center;
    if (!map || !selectedCenter) {
      return false;
    }
    const center = map.getCenter().toArray();
    return Math.hypot(center[0] - selectedCenter[0], center[1] - selectedCenter[1]) < 0.012;
  }, null, { timeout: 5000 });
  const profileState = await page.evaluate(() => ({
    selectedStreet: window.vproDebug?.state?.selectedStreet?.name || "",
    visibleCards: window.vproDebug?.state?.visibleCards?.length || 0,
    eventFeatures: window.vproDebug?.map?.getSource("event-points")?.serialize?.()?.data?.features?.length || 0,
    selectedAlternativeFeatures: window.vproDebug?.map?.getSource("selected-alternative-point")?.serialize?.()?.data?.features?.length || 0,
    searchValue: document.querySelector("#eventSearch")?.value || "",
    mapCenterDistance: (() => {
      const map = window.vproDebug?.map;
      const state = window.vproDebug?.state;
      const selectedCenter = state?.visibleCards?.[state.selectedCardIndex]?.event?.center;
      if (!map || !selectedCenter) {
        return null;
      }
      const center = map.getCenter().toArray();
      return Math.hypot(center[0] - selectedCenter[0], center[1] - selectedCenter[1]);
    })(),
  }));
  if (profileState.selectedStreet || profileState.searchValue || profileState.visibleCards < 1 || profileState.eventFeatures < 1 || profileState.selectedAlternativeFeatures < 1) {
    throw new Error(`Profile change left street search/map state dominant: ${JSON.stringify(profileState)}`);
  }
  await page.locator("#eventSearch").fill("");
}

async function assertMethodologyLayout(page) {
  const methodology = await page.evaluate(() => {
    const panel = document.querySelector("#methodologyPanel");
    const h1 = panel?.querySelector("h1")?.textContent || "";
    const text = panel?.textContent || "";
    const rect = panel?.getBoundingClientRect();
    const visible = (selector) => {
      const element = panel?.querySelector(selector);
      const box = element?.getBoundingClientRect();
      const style = element ? getComputedStyle(element) : null;
      return box && style
        ? {
            display: style.display,
            width: box.width,
            height: box.height,
            top: box.top,
          }
        : null;
    };
    return {
      h1,
      width: rect?.width || 0,
      text,
      hero: visible(".methodology-hero"),
      chain: visible(".method-chain"),
      steps: visible(".method-steps"),
      bounds: visible(".method-bounds"),
      audit: visible(".method-audit"),
      stepMarkerPosition: getComputedStyle(panel?.querySelector(".method-list li"), "::before").position,
      stepColumns: getComputedStyle(panel?.querySelector(".method-list")).gridTemplateColumns.split(" ").length,
      mapShellDisplay: getComputedStyle(document.querySelector(".map-shell")).display,
    };
  });
  const required = [
    "Cómo se transforma un dato abierto municipal en una recomendación auditable.",
    "Fuente oficial → Normalización → Evento interpretable → Impacto orientativo → Alternativa → Evidencia pública",
    "Método en cinco pasos",
    "Qué viene de fuentes oficiales",
    "Qué calcula VLC Proactiva",
    "Límites del modelo",
    "Reproducibilidad y auditoría",
  ];
  const missing = required.filter((item) => !methodology.text.includes(item));
  if (methodology.h1 !== "Metodología" || missing.length > 0 || methodology.mapShellDisplay !== "none") {
    throw new Error(`Methodology content is incomplete: ${JSON.stringify({ h1: methodology.h1, missing, mapShellDisplay: methodology.mapShellDisplay })}`);
  }
  if (methodology.hero.width < 1000) {
    throw new Error(`Methodology hero does not match the informational tab width: ${JSON.stringify(methodology.hero)}`);
  }
  if (methodology.stepMarkerPosition !== "static" || methodology.stepColumns < 2) {
    throw new Error(`Methodology steps still use cramped/overlapping markers: ${JSON.stringify({ marker: methodology.stepMarkerPosition, columns: methodology.stepColumns })}`);
  }
  for (const [name, box] of Object.entries({
    hero: methodology.hero,
    chain: methodology.chain,
    steps: methodology.steps,
    bounds: methodology.bounds,
    audit: methodology.audit,
  })) {
    if (!box || box.display === "none" || box.width < 280 || box.height < 40) {
      throw new Error(`Methodology section is not visibly formatted: ${name} ${JSON.stringify(box)}`);
    }
  }
}

async function assertTraceableCaseLayout(page) {
  const traceableCase = await page.evaluate(() => {
    const section = document.querySelector("#additionalInfoPanel .civic-proof");
    const title = section?.querySelector("h2")?.textContent.trim() || "";
    const place = section?.querySelector(".case-proof-place strong")?.textContent.trim() || "";
    const titleBox = section?.querySelector("h2")?.getBoundingClientRect();
    const placeBox = section?.querySelector(".case-proof-place")?.getBoundingClientRect();
    const tableBox = section?.querySelector(".case-proof-list")?.getBoundingClientRect();
    return {
      title,
      place,
      titleHeight: titleBox?.height || 0,
      placeBeforeTable: Boolean(placeBox && tableBox && placeBox.bottom <= tableBox.bottom),
      allCapsPlace: Boolean(place && place === place.toLocaleUpperCase("es-ES") && /[A-ZÁÉÍÓÚÜÑ]{4}/.test(place)),
    };
  });
  if (traceableCase.title !== "Caso calculado desde la vista" || !traceableCase.place || traceableCase.allCapsPlace || traceableCase.title.includes("C/") || traceableCase.titleHeight > 90 || !traceableCase.placeBeforeTable) {
    throw new Error(`Traceable case layout is not editorial: ${JSON.stringify(traceableCase)}`);
  }
}

async function assertInformationalTabsUseSharedSystem(page) {
  const views = [
    ["sources", "#sourcesPanel"],
    ["methodology", "#methodologyPanel"],
    ["info", "#additionalInfoPanel"],
  ];
  const measured = {};
  for (const [view, selector] of views) {
    await page.locator(`[data-view='${view}']`).click();
    await page.locator(selector).waitFor({ timeout: 5000 });
    measured[view] = await page.evaluate((panelSelector) => {
      const panel = document.querySelector(panelSelector);
      const styleFor = (selector) => {
        const element = panel?.querySelector(selector);
        if (!element) {
          return null;
        }
        const style = getComputedStyle(element);
        return {
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10),
          lineHeight: Number.parseFloat(style.lineHeight),
        };
      };
      const sectionBorders = [...panel.querySelectorAll(`
        .source-trace,
        .source-metrics,
        .source-actions,
        .source-list-redesigned,
        .source-health,
        .method-chain,
        .method-steps,
        .method-bounds,
        .method-audit,
        .method-example,
        .info-story,
        .audit-package,
        .civic-proof,
        .contest-proof,
        .info-evidence,
        .info-accordion,
        .info-evidence-grid
      `)].map((element) => {
        const style = getComputedStyle(element);
        return {
          top: Number.parseFloat(style.borderTopWidth),
          bottom: Number.parseFloat(style.borderBottomWidth),
        };
      });
      return {
        h1: styleFor("h1"),
        h2: styleFor("h2"),
        h3: styleFor("h3"),
        body: styleFor("p:not(.eyebrow)"),
        strong: styleFor(".source-trace strong, .method-chain strong, .audit-resource-list strong, .case-proof-list dt"),
        sectionTitle: styleFor(".method-steps > h3, .source-trace h2, .info-story h2"),
        sourceMetricValue: styleFor(".source-metrics strong"),
        heroBorderBottom: (() => {
          const hero = panel.querySelector(".info-hero, .methodology-hero");
          return hero ? Number.parseFloat(getComputedStyle(hero).borderBottomWidth) : null;
        })(),
        maxDirectChildGap: (() => {
          const boxes = [...panel.children]
            .filter((element) => getComputedStyle(element).display !== "none")
            .map((element) => element.getBoundingClientRect())
            .filter((box) => box.height > 0)
            .sort((a, b) => a.top - b.top);
          return boxes.reduce((maxGap, box, index) => {
            if (index === 0) {
              return maxGap;
            }
            return Math.max(maxGap, Math.round(box.top - boxes[index - 1].bottom));
          }, 0);
        })(),
        sourceTraceMarkerPosition: panel.querySelector(".source-trace li")
          ? getComputedStyle(panel.querySelector(".source-trace li"), "::before").position
          : null,
        sourceTraceColumns: panel.querySelector(".source-trace ol")
          ? getComputedStyle(panel.querySelector(".source-trace ol")).gridTemplateColumns.split(" ").length
          : null,
        sourceRowColumns: panel.querySelector(".source-row")
          ? getComputedStyle(panel.querySelector(".source-row")).gridTemplateColumns.split(" ").length
          : null,
        sourceActions: panel.querySelector(".source-actions")
          ? {
              count: panel.querySelectorAll(".source-actions a").length,
              descriptions: [...panel.querySelectorAll(".source-actions a span")].map((element) => element.textContent.trim()).filter(Boolean).length,
              columns: getComputedStyle(panel.querySelector(".source-actions")).gridTemplateColumns.split(" ").length,
            }
          : null,
        infoEvidenceMetric: styleFor(".info-evidence-grid dt"),
        infoStorySideHeadingDelta: (() => {
          const headings = [...panel.querySelectorAll(".info-story-side h3")].map((element) => element.getBoundingClientRect());
          return headings.length === 2 ? Math.abs(Math.round(headings[0].top - headings[1].top)) : null;
        })(),
        infoSplitColumns: (() => {
          const blocks = [...panel.querySelectorAll(".info-story, .audit-package, .civic-proof")];
          return blocks.map((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
        })(),
        hasDoubleSectionLines: sectionBorders.some((border) => border.top > 0 && border.bottom > 0),
      };
    }, selector);
  }
  const comparedKeys = ["h1", "h2", "body", "strong"];
  const mismatch = comparedKeys.filter((key) => {
    const values = [measured.sources[key], measured.methodology[key], measured.info[key]];
    return values.some(Boolean) && (
      Math.max(...values.map((value) => value?.fontSize || 0)) - Math.min(...values.map((value) => value?.fontSize || 0)) > 1
      || Math.max(...values.map((value) => value?.fontWeight || 0)) - Math.min(...values.map((value) => value?.fontWeight || 0)) > 20
    );
  });
  const doubleLines = Object.entries(measured)
    .filter(([, value]) => value.hasDoubleSectionLines)
    .map(([view]) => view);
  const oversizedGaps = Object.entries(measured)
    .filter(([, value]) => value.maxDirectChildGap > 70)
    .map(([view]) => view);
  const weakMetrics = measured.sources.sourceMetricValue?.fontSize < 28;
  const heavyHeroLines = Object.entries(measured)
    .filter(([, value]) => value.heroBorderBottom > 1.5)
    .map(([view]) => view);
  const weakInfoMetrics = measured.info.infoEvidenceMetric?.fontSize < 28;
  const misalignedInfoSideHeadings = measured.info.infoStorySideHeadingDelta !== null && measured.info.infoStorySideHeadingDelta > 2;
  const brokenInfoSplit = measured.info.infoSplitColumns?.some((count) => count !== 2);
  const weakSourceActions = measured.sources.sourceActions?.count !== 4 || measured.sources.sourceActions?.descriptions !== 4 || measured.sources.sourceActions?.columns !== 4;
  if (mismatch.length > 0 || doubleLines.length > 0 || oversizedGaps.length > 0 || weakMetrics || weakInfoMetrics || misalignedInfoSideHeadings || brokenInfoSplit || weakSourceActions || heavyHeroLines.length > 0 || measured.sources.sourceTraceMarkerPosition !== "static" || measured.sources.sourceRowColumns !== 1) {
    throw new Error(`Informational tabs layout is inconsistent: ${JSON.stringify({ mismatch, doubleLines, oversizedGaps, measured })}`);
  }
}

async function assertNoOperationalContext(page, view) {
  const state = await page.evaluate(() => ({
    contextDisplay: getComputedStyle(document.querySelector(".events-context-bar")).display,
    statusDisplay: getComputedStyle(document.querySelector("#statusText")).display,
    contextText: document.querySelector(".events-context-bar")?.textContent || "",
    visibleMap: getComputedStyle(document.querySelector(".map-workspace")).display,
    mapShellDisplay: getComputedStyle(document.querySelector(".map-shell")).display,
  }));
  if (state.contextDisplay !== "none" || state.statusDisplay !== "none" || state.mapShellDisplay !== "none") {
    throw new Error(`Operational event context leaks into ${view}: ${JSON.stringify(state)}`);
  }
}

async function clickFirstMapMarker(page) {
  const target = await page.evaluate(() => {
    const map = window.vproDebug?.map;
    const card = window.vproDebug?.state?.visibleCards?.[0];
    const mapElement = document.querySelector("#map");
    if (!map || !card?.event?.center || !mapElement) {
      return null;
    }
    const point = map.project(card.event.center);
    const rect = mapElement.getBoundingClientRect();
    return {
      x: rect.left + point.x,
      y: rect.top + point.y,
      title: card.event.title,
    };
  });
  if (!target) {
    throw new Error("Could not locate a rendered map marker target");
  }
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(
    (title) => document.querySelector("#selectedEventPanel")?.textContent.includes(title.toUpperCase()),
    target.title,
  );
}

async function assertMobile(page) {
  const mobile = await page.evaluate(() => {
    const left = document.querySelector(".left-rail").getBoundingClientRect();
    const map = document.querySelector(".map-workspace").getBoundingClientRect();
    const detail = document.querySelector(".detail-rail").getBoundingClientRect();
    return {
      bodyOverflowX: document.body.scrollWidth - window.innerWidth,
      mapBeforeDetail: map.top < detail.top,
      detailBeforeSidebar: detail.top < left.top,
      detailPosition: getComputedStyle(document.querySelector(".detail-rail")).position,
      contextDisplay: getComputedStyle(document.querySelector(".events-context-bar")).display,
    };
  });
  if (mobile.bodyOverflowX !== 0 || !mobile.mapBeforeDetail || !mobile.detailBeforeSidebar || mobile.contextDisplay !== "none") {
    throw new Error(`Mobile layout is not map + bottom sheet + filters: ${JSON.stringify(mobile)}`);
  }
}

async function runViewport(browser, name, viewport, isMobile = false) {
  const { page, messages } = await preparePage(browser, name, viewport, isMobile);
  await assertOperationalContent(page, name);
  if (name === "desktop") {
    await assertOperationalDesktop(page);
    await assertInteractions(page);
  } else {
    await assertMobile(page);
  }
  await page.screenshot({ path: `docs/reports/frontend-${name}.png`, fullPage: true });
  const seriousMessages = messages.filter((message) => /pageerror|error:/i.test(message));
  if (seriousMessages.length > 0) {
    throw new Error(`Console errors detected: ${seriousMessages.join("\n")}`);
  }
  await page.close();
  return { name, messages };
}

const browser = await chromium.launch({ headless: true });
const results = [
  await runViewport(browser, "mobile", { width: 390, height: 844 }, true),
  await runViewport(browser, "desktop", { width: 1280, height: 900 }, false),
];

console.log(JSON.stringify(results, null, 2));
await browser.close();
