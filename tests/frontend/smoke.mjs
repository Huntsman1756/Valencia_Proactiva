import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function runViewport(browser, name, viewport, isMobile = false) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
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
  await page.locator("h1").filter({ hasText: "El que esta passant prop" }).waitFor({ timeout: 5000 });
  await page.locator(".source-strip").first().waitFor({ timeout: 10000 });
  await page.locator("[data-poi-filter='VALENBISI']").click();
  await page.locator(".event-card").first().waitFor({ timeout: 5000 });
  await page.locator("[data-view='sources']").click();
  await page.locator("#sourcesPanel").filter({ hasText: "Geoportal municipal" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='methodology']").click();
  await page.locator("#methodologyPanel").filter({ hasText: "PostGIS" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='info']").click();
  await page.locator("#additionalInfoPanel").filter({ hasText: "13.710" }).waitFor({ timeout: 5000 });
  await page.locator("[data-view='events']").click();
  await page.locator("#toggleMap").click();
  await page.waitForFunction(() => Boolean(window.vproDebug?.map?.getLayer("alternative-points")), null, { timeout: 12000 });
  await page.screenshot({ path: `docs/reports/frontend-${name}.png`, fullPage: true });
  await page.locator("#toggleMap").click();
  await page.locator(".feedback-button[data-vote='1']").first().click();
  await page.locator("#toast").waitFor({ state: "visible", timeout: 5000 });

  const data = await page.evaluate(() => ({
    title: document.title,
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
    activePoiFilter: localStorage.getItem("vpro_poi_type"),
    tabs: Array.from(document.querySelectorAll("[data-view]")).map((item) => item.textContent),
    layers: {
      impactZones: Boolean(window.vproDebug?.map?.getLayer("impact-zones-fill")),
      traffic: Boolean(window.vproDebug?.map?.getLayer("traffic-realtime")),
      events: Boolean(window.vproDebug?.map?.getLayer("event-points")),
      alternatives: Boolean(window.vproDebug?.map?.getLayer("alternative-points")),
    },
    feedbackText: document.querySelector("#toast")?.textContent,
  }));

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
