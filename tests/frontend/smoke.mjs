import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

  await page.goto(FRONTEND_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem("vpro_session_token", crypto.randomUUID().replaceAll("-", ""));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-lang='val']").click();
  await page.locator("h1").filter({ hasText: "El que està passant prop" }).waitFor({ timeout: 5000 });
  await page.locator(".source-strip").first().waitFor({ timeout: 10000 });
  await page.locator("[data-poi-filter='VALENBISI']").click();
  await page.locator(".event-card").first().waitFor({ timeout: 5000 });
  await page.locator("[data-view='sources']").click();
  await page.locator("#sourcesPanel").filter({ hasText: "Governança proactiva" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='methodology']").click();
  await page.locator("#methodologyPanel").filter({ hasText: "Guia d'interacció i simbologia" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='info']").click();
  await page.locator("#additionalInfoPanel").filter({ hasText: "Limitacions actuals" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='events']").click();
  await page.locator("#toggleMap").click();
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("alternative-points")), null, { timeout: 12000 });
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => (window.vproDebug?.map?.querySourceFeatures("event-points") || []).length > 0,
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
          return { x: rect.left + x, y: rect.top + y };
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
  await page.screenshot({ path: `docs/reports/frontend-${name}.png`, fullPage: true });
  await page.locator("#toggleMap").click();
  await page.locator("#selectedEventPanel .feedback-button[data-vote='1']").click();
  await page.locator("#toast").waitFor({ state: "visible", timeout: 5000 });

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
    sourceDatasetCount: document.querySelectorAll("#sourcesPanel .dataset-list li").length,
    profileImpact: document.querySelector("#profileImpact")?.textContent,
    routeText: document.querySelector(".route-button")?.textContent,
    routeDisclaimer: document.querySelector(".route-note")?.textContent,
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
  if (!data.routeDisclaimer?.includes("Google")) {
    throw new Error("Route disclaimer missing Google Maps limitation");
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
