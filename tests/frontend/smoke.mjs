import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const FRONTEND_API_BASE = process.env.FRONTEND_API_BASE || "";

async function runViewport(browser, name, viewport, isMobile = false) {
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
    if (apiBase) {
      localStorage.setItem("vpro_api_base", apiBase);
    }
  }, FRONTEND_API_BASE);

  await page.goto(FRONTEND_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem("vpro_session_token", crypto.randomUUID().replaceAll("-", ""));
    localStorage.setItem("vpro_alert_mode", "false");
    localStorage.setItem("vpro_last_seen_at", "2000-01-01T00:00:00.000Z");
    localStorage.setItem("vpro_last_seen_profile", "PMR");
    localStorage.removeItem("vpro_detail_collapsed");
    localStorage.removeItem("vpro_legend_collapsed");
    localStorage.removeItem("vpro_poi_type");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#languageToggle").click();
  await page.locator("[data-lang='val']").click();
  await page.waitForFunction(() => document.documentElement.lang === "val", null, { timeout: 5000 });
  await page.locator(".event-card").first().waitFor({ timeout: 10000 });
  const entryDensityState = await page.evaluate(() => {
    const detailRail = document.querySelector(".detail-rail");
    const mapHelp = document.querySelector(".map-help");
    const assistPanel = document.querySelector(".assist-panel");
    const sourceNote = document.querySelector(".source-note");
    return {
      detailCollapsed: detailRail?.classList.contains("is-collapsed"),
      detailExpanded: document.querySelector("#detailPanelToggle")?.getAttribute("aria-expanded"),
      legendCollapsed: document.querySelector("#mapLegend")?.classList.contains("is-collapsed"),
      quickFiltersOpen: document.querySelector(".quick-filters")?.open,
      mapHelpDisplay: mapHelp ? getComputedStyle(mapHelp).display : "",
      assistDisplay: assistPanel ? getComputedStyle(assistPanel).display : "",
      sourceNoteDisplay: sourceNote ? getComputedStyle(sourceNote).display : "",
    };
  });
  if (!entryDensityState.detailCollapsed || entryDensityState.detailExpanded !== "false" || !entryDensityState.legendCollapsed || entryDensityState.quickFiltersOpen || entryDensityState.mapHelpDisplay !== "none") {
    throw new Error(`Entry view is too dense: ${JSON.stringify(entryDensityState)}`);
  }
  if (name === "desktop" && (entryDensityState.assistDisplay !== "none" || entryDensityState.sourceNoteDisplay !== "none")) {
    throw new Error(`Desktop entry rail still shows secondary panels: ${JSON.stringify(entryDensityState)}`);
  }
  await page.locator("#alertModeToggle").click();
  await page.locator("#toast").filter({ hasText: "Mode alerta preparat" }).waitFor({ timeout: 5000 });
  await page.locator(".quick-filters summary").click();
  await page.locator("[data-poi-filter='VALENBISI']").click();
  await page.locator(".event-card").first().waitFor({ timeout: 5000 });
  await page.locator(".event-card").nth(1).click();
  await page.locator(".event-card").nth(1).evaluate((card) => card.dataset.selected === "true");
  await page.locator("[data-view='sources']").click();
  await page.locator("#sourcesPanel").filter({ hasText: "Per a què servix" }).waitFor({ timeout: 5000 });
  const sourcesPanelState = await page.evaluate(() => ({
    eventsHidden: document.querySelector("#events")?.hidden,
    sourcesVisible: !document.querySelector("#sourcesPanel")?.hidden,
    sectionTab: document.body.classList.contains("has-section-tab"),
    mapHidden: getComputedStyle(document.querySelector(".map-shell")).display === "none",
    detailHidden: getComputedStyle(document.querySelector(".detail-rail")).display === "none",
    backdropHidden: document.querySelector("#panelBackdrop")?.hidden,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  if (!sourcesPanelState.eventsHidden || !sourcesPanelState.sourcesVisible || !sourcesPanelState.sectionTab || !sourcesPanelState.mapHidden || !sourcesPanelState.detailHidden || !sourcesPanelState.backdropHidden || sourcesPanelState.bodyOverflow === "hidden") {
    throw new Error(`Sources tab state is broken: ${JSON.stringify(sourcesPanelState)}`);
  }
  await page.locator("[data-view='methodology']").click();
  await page.locator("#methodologyPanel").filter({ hasText: "Guia d'interacció i simbologia" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='info']").click();
  await page.locator("#additionalInfoPanel").filter({ hasText: "Limitacions actuals" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='events']").click();
  await page.waitForFunction(() => !document.querySelector("#events")?.hidden, null, { timeout: 5000 });
  await page.locator(".event-card").first().waitFor({ timeout: 5000 });
  const eventToggleState = await page.evaluate(() => {
    const toggle = document.querySelector("#eventPanelToggle");
    const panel = document.querySelector("#events");
    toggle?.click();
    const collapsed = panel?.classList.contains("is-collapsed");
    const hiddenWhileCollapsed = getComputedStyle(document.querySelector("#eventList")).display === "none";
    toggle?.click();
    return {
      collapsed,
      hiddenWhileCollapsed,
      expanded: !panel?.classList.contains("is-collapsed"),
      ariaExpanded: toggle?.getAttribute("aria-expanded"),
    };
  });
  if (!eventToggleState.collapsed || !eventToggleState.hiddenWhileCollapsed || !eventToggleState.expanded || eventToggleState.ariaExpanded !== "true") {
    throw new Error(`Event panel toggle is broken: ${JSON.stringify(eventToggleState)}`);
  }
  const detailToggleState = await page.evaluate(() => {
    const toggle = document.querySelector("#detailPanelToggle");
    const rail = document.querySelector(".detail-rail");
    const panel = document.querySelector("#selectedEventPanel");
    const expandedLabel = toggle?.textContent;
    toggle?.click();
    const collapsed = rail?.classList.contains("is-collapsed");
    const hiddenWhileCollapsed = panel ? getComputedStyle(panel).display === "none" : false;
    toggle?.click();
    return {
      hasToggle: Boolean(toggle),
      expandedLabel,
      collapsed,
      hiddenWhileCollapsed,
      expanded: !rail?.classList.contains("is-collapsed"),
      ariaExpanded: toggle?.getAttribute("aria-expanded"),
    };
  });
  if (!detailToggleState.hasToggle || !detailToggleState.collapsed || !detailToggleState.hiddenWhileCollapsed || !detailToggleState.expanded || detailToggleState.ariaExpanded !== "true") {
    throw new Error(`Detail panel toggle is broken: ${JSON.stringify(detailToggleState)}`);
  }
  await page.screenshot({ path: `docs/reports/frontend-${name}.png`, fullPage: true });
  await page.locator("#toggleMap").click();
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("alternative-points")), null, { timeout: 12000 });
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => {
      const source = window.vproDebug?.map?.getSource("event-points");
      return (source?._data?.geojson?.features || source?._data?.features || []).length > 0;
    },
    null,
    { timeout: 5000 },
  );
  const eventPoint = await page.evaluate(() => {
    const map = window.vproDebug?.map;
    const canvas = document.querySelector("#map");
    if (!map || !canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    for (let x = 8; x < rect.width; x += 8) {
      for (let y = 8; y < rect.height; y += 8) {
        if (map.queryRenderedFeatures([x, y], { layers: ["event-points"] }).length > 0) {
          const absoluteX = rect.left + x;
          const absoluteY = rect.top + y;
          const target = document.elementFromPoint(absoluteX, absoluteY);
          if (target?.closest(".maplibregl-canvas-container")) {
            return { x: absoluteX, y: absoluteY };
          }
        }
      }
    }
    return null;
  });
  if (eventPoint) {
    if (isMobile) {
      await page.touchscreen.tap(eventPoint.x, eventPoint.y);
    } else {
      await page.mouse.click(eventPoint.x, eventPoint.y);
    }
    await page.locator(".maplibregl-popup-content").first().waitFor({ timeout: 5000 });
  }
  await page.locator("#toggleMap").click();
  await page.locator("#selectedEventPanel .feedback-button[data-vote='1']").click();
  await page.locator("#toast").filter({ hasText: "Valoració registrada" }).waitFor({ timeout: 5000 });

  const data = await page.evaluate(() => ({
    title: document.title,
    brand: document.querySelector(".brand-copy strong")?.textContent,
    primaryNavExists: Boolean(document.querySelector(".primary-nav")),
    cards: document.querySelectorAll(".event-card").length,
    empty: Boolean(document.querySelector(".empty-state")),
    status: document.querySelector("#statusText")?.textContent,
    mapHeight: document.querySelector("#map")?.getBoundingClientRect().height,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    heading: document.querySelector("h1")?.textContent,
    htmlLang: document.documentElement.lang,
    storedLanguage: localStorage.getItem("vpro_language"),
    sourceStrip: document.querySelector(".source-strip")?.textContent,
    localDeltaNotice: document.querySelector(".local-delta-notice")?.textContent,
    localDeltaProfile: localStorage.getItem("vpro_last_seen_profile"),
    localDeltaTimestamp: localStorage.getItem("vpro_last_seen_at"),
    eventCardVeracityBadges: document.querySelectorAll(".event-card .veracity-badge").length,
    sourceDatasetCount: document.querySelectorAll("#sourcesPanel .dataset-list li").length,
    sourceLinkCount: document.querySelectorAll("#sourcesPanel .source-row-head a").length,
    contestProofText: document.querySelector("#sourcesPanel .contest-proof")?.textContent,
    sourceHealthText: document.querySelector(".source-health")?.textContent,
    profileTooltips: Array.from(document.querySelectorAll("[data-profile]")).map((button) => button.dataset.tooltip),
    zbeVisible: Boolean(document.querySelector(".zbe-checker:not([hidden])")),
    routeButtons: document.querySelectorAll(".route-button").length,
    snapshotButtons: document.querySelectorAll(".snapshot-button").length,
    googleMention: document.body.textContent.includes("Google"),
    veracityText: document.querySelector(".veracity-badge")?.textContent,
    temporalImpact: document.querySelector(".detail-list")?.textContent,
    eventCardTitle: document.querySelector(".event-card h3")?.textContent,
    selectedLocation: document.querySelector(".detail-list dd")?.textContent,
    eventCardLocation: document.querySelector(".event-card .event-location")?.textContent,
    activeCardStyle: (() => {
      const selected = document.querySelector(".event-card[data-selected='true']");
      const firstIdle = document.querySelector(".event-card:not([data-selected='true'])");
      const selectedStyle = selected ? getComputedStyle(selected) : null;
      const idleStyle = firstIdle ? getComputedStyle(firstIdle) : null;
      return {
        selectedBoxShadow: selectedStyle?.boxShadow || "",
        idleBoxShadow: idleStyle?.boxShadow || "",
        selectedBackground: selectedStyle?.backgroundColor || "",
        idleBackground: idleStyle?.backgroundColor || "",
        selectedBorderLeftColor: selectedStyle?.borderLeftColor || "",
        idleBorderLeftColor: idleStyle?.borderLeftColor || "",
        themeBlue: (() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--blue)";
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        })(),
      };
    })(),
    detailSheet: (() => {
      const rail = document.querySelector(".detail-rail");
      const panel = document.querySelector("#selectedEventPanel");
      const toggle = document.querySelector("#detailPanelToggle");
      const railStyle = rail ? getComputedStyle(rail) : null;
      const panelStyle = panel ? getComputedStyle(panel) : null;
      return {
        hasToggle: Boolean(toggle),
        toggleText: toggle?.textContent || "",
        railOverflowY: railStyle?.overflowY || "",
        panelOverflowY: panelStyle?.overflowY || "",
        railBoxShadow: railStyle?.boxShadow || "",
        railBackdropFilter: railStyle?.backdropFilter || railStyle?.webkitBackdropFilter || "",
        railBackground: railStyle?.backgroundColor || "",
      };
    })(),
    feedbackLayout: (() => {
      const group = document.querySelector(".feedback-group");
      const buttons = Array.from(document.querySelectorAll(".feedback-button")).map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const groupStyle = group ? getComputedStyle(group) : null;
      return {
        gap: Number.parseFloat(groupStyle?.columnGap || groupStyle?.gap || "0"),
        buttons,
      };
    })(),
    modeGuidance: document.querySelector(".mode-guidance")?.textContent,
    visibleDataText: document.querySelector("#additionalInfoPanel .info-section")?.textContent,
    faqText: document.querySelector(".faq-list")?.textContent,
    faqItems: document.querySelectorAll(".faq-list .faq-item").length,
    adminDeepLinkText: document.querySelector(".admin-deeplink")?.textContent,
    alertMode: document.documentElement.dataset.alert,
    eventsPanelHidden: document.querySelector("#events")?.hidden,
    visibleEventCards: Array.from(document.querySelectorAll(".event-card")).filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length,
    eventStackScroll: (() => {
      const stack = document.querySelector("#eventList");
      return {
        scrollWidth: stack?.scrollWidth || 0,
        clientWidth: stack?.clientWidth || 0,
        scrollHeight: stack?.scrollHeight || 0,
        clientHeight: stack?.clientHeight || 0,
        overflowX: stack ? getComputedStyle(stack).overflowX : "",
        overflowY: stack ? getComputedStyle(stack).overflowY : "",
      };
    })(),
    activePoiFilter: localStorage.getItem("vpro_poi_type"),
    tabs: Array.from(document.querySelectorAll("[data-view]")).map((item) => item.textContent),
    layers: {
      impactZones: Boolean(window.vproDebug?.map?.getLayer("impact-zones-fill")),
      traffic: Boolean(window.vproDebug?.map?.getLayer("traffic-realtime")),
      events: Boolean(window.vproDebug?.map?.getLayer("event-points")),
      alternatives: Boolean(window.vproDebug?.map?.getLayer("alternative-points")),
    },
    layout: (() => {
      const tabs = document.querySelector(".view-tabs")?.getBoundingClientRect();
      const map = document.querySelector(".map-shell")?.getBoundingClientRect();
      return {
        overlapsTabs: tabs && map
          ? !(map.left >= tabs.right || map.right <= tabs.left || map.top >= tabs.bottom || map.bottom <= tabs.top)
          : null,
      };
    })(),
    guide: document.querySelector(".product-guide")?.textContent,
    mapHelp: document.querySelector(".map-help")?.textContent,
    legend: document.querySelector(".map-legend")?.textContent,
    popupBound: Boolean(window.vproDebug?.map?.__vproInteractionsBound),
    popupText: document.querySelector(".maplibregl-popup-content")?.textContent,
    feedbackText: document.querySelector("#toast")?.textContent,
  }));

  if (!data.title.includes("VLC PROACTIVA") || data.brand !== "VLC PROACTIVA") {
    throw new Error(`Unexpected public brand: ${data.title} / ${data.brand}`);
  }
  if (data.primaryNavExists) {
    throw new Error("Duplicated primary navigation is still present");
  }
  if (data.sourceDatasetCount < 10) {
    throw new Error(`Expected detailed source datasets, got ${data.sourceDatasetCount}`);
  }
  if (data.sourceLinkCount < 3 || !data.contestProofText?.includes("Dades obertes") || !data.tabs?.includes("Informació")) {
    throw new Error(`Informational evidence layout is missing: ${JSON.stringify({ sourceLinkCount: data.sourceLinkCount, contestProofText: data.contestProofText, tabs: data.tabs })}`);
  }
  if (data.faqItems < 8 || !data.faqText?.includes("Quin perfil trie") || !data.faqText?.includes("Com llisc una targeta") || !data.faqText?.includes("Quan he de canviar")) {
    throw new Error(`First-visit FAQ is too thin: ${JSON.stringify({ faqItems: data.faqItems, faqText: data.faqText })}`);
  }
  if (!data.sourceHealthText?.includes("EMT") || !data.visibleDataText?.includes("feed públic") || !data.visibleDataText?.includes("base operativa")) {
    throw new Error(`Missing source health or visible-data explanation: ${JSON.stringify({ sourceHealthText: data.sourceHealthText, visibleDataText: data.visibleDataText })}`);
  }
  if (data.adminDeepLinkText) {
    throw new Error(`Internal admin/deeplink hint should not be visible: ${data.adminDeepLinkText}`);
  }
  if (data.routeButtons !== 0 || data.googleMention) {
    throw new Error(`Google Maps route action should not be visible: ${JSON.stringify({ routeButtons: data.routeButtons, googleMention: data.googleMention })}`);
  }
  if (data.eventCardVeracityBadges !== 0) {
    throw new Error(`Event cards still use boxed verification badges: ${data.eventCardVeracityBadges}`);
  }
  if (!data.localDeltaNotice?.includes("incid") || !data.localDeltaNotice?.includes("última visita") || data.localDeltaProfile !== "PMR" || !data.localDeltaTimestamp) {
    throw new Error(`Local novelty notice is missing or not persisted privately: ${JSON.stringify({
      notice: data.localDeltaNotice,
      profile: data.localDeltaProfile,
      timestamp: data.localDeltaTimestamp,
    })}`);
  }
  if (data.snapshotButtons !== 0) {
    throw new Error(`Copy ficha action should be removed from the main detail: ${data.snapshotButtons}`);
  }
  if (data.zbeVisible || !data.modeGuidance?.includes("places PMR")) {
    throw new Error(`ZBE checker should be hidden and modal guidance preserved: ${JSON.stringify({ zbeVisible: data.zbeVisible, modeGuidance: data.modeGuidance })}`);
  }
  if (!data.profileTooltips?.some((text) => text?.includes("accessibles"))) {
    throw new Error(`Profile help tooltips are missing: ${JSON.stringify(data.profileTooltips)}`);
  }
  if (data.alertMode !== "prepared" || !data.veracityText?.includes("Verificat per")) {
    throw new Error(`Missing alert/veracity signals: ${JSON.stringify({ alertMode: data.alertMode, veracityText: data.veracityText })}`);
  }
  if (!data.temporalImpact?.includes("Impacte previst")) {
    throw new Error("Temporal impact detail is missing");
  }
  const eventCardPlace = data.eventCardLocation || data.eventCardTitle;
  if (!data.selectedLocation || /-?\d+\.\d{4,}/.test(data.selectedLocation) || !eventCardPlace || /-?\d+\.\d{4,}/.test(eventCardPlace)) {
    throw new Error(`Human-readable location is missing: ${JSON.stringify({ selectedLocation: data.selectedLocation, eventCardPlace })}`);
  }
  if (data.eventCardTitle && data.eventCardLocation?.startsWith(data.eventCardTitle)) {
    throw new Error(`Event card repeats the same street as title and location: ${JSON.stringify({ title: data.eventCardTitle, location: data.eventCardLocation })}`);
  }
  if (!data.detailSheet.hasToggle || data.detailSheet.railOverflowY !== "hidden" || !data.detailSheet.panelOverflowY.includes("auto") || data.detailSheet.railBoxShadow === "none") {
    throw new Error(`Detail bottom sheet hierarchy is weak: ${JSON.stringify(data.detailSheet)}`);
  }
  if (!data.detailSheet.railBackdropFilter || data.detailSheet.railBackdropFilter === "none") {
    throw new Error(`Detail bottom sheet is missing backdrop blur: ${JSON.stringify(data.detailSheet)}`);
  }
  if (data.activeCardStyle.selectedBoxShadow === data.activeCardStyle.idleBoxShadow && data.activeCardStyle.selectedBackground === data.activeCardStyle.idleBackground) {
    throw new Error(`Selected event card does not visually dominate idle cards: ${JSON.stringify(data.activeCardStyle)}`);
  }
  if (name === "desktop" && data.activeCardStyle.selectedBorderLeftColor === data.activeCardStyle.themeBlue) {
    throw new Error(`Selected event card still relies on a hard left-border color: ${JSON.stringify(data.activeCardStyle)}`);
  }
  if (name === "mobile") {
    const smallFeedbackButtons = data.feedbackLayout.buttons.filter((button) => button.width < 52 || button.height < 48);
    if (data.feedbackLayout.gap < 10 || smallFeedbackButtons.length > 0) {
      throw new Error(`Mobile feedback controls are too tight: ${JSON.stringify(data.feedbackLayout)}`);
    }
  }
  if (data.eventsPanelHidden || data.visibleEventCards < 1) {
    throw new Error("Events panel disappeared after switching informational tabs");
  }
  if (name === "desktop" && data.eventStackScroll.scrollHeight <= data.eventStackScroll.clientHeight) {
    throw new Error(`Expected scrollable operational event feed on desktop: ${JSON.stringify(data.eventStackScroll)}`);
  }

  await page.close();
  return { name, data, messages };
}

const browser = await chromium.launch({ headless: true });
const results = [
  await runViewport(browser, "mobile", { width: 390, height: 844 }, true),
  await runViewport(browser, "desktop", { width: 1280, height: 900 }, false),
];

console.log(JSON.stringify(results, null, 2));
await browser.close();
