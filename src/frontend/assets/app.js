const API_BASE = localStorage.getItem("vpro_api_base") || defaultApiBase();
const DEFAULT_CENTER = [-0.3763, 39.4699];
const POI_FILTERS = [
  "ALL",
  "APARCAMIENTO_PMR",
  "PARKING",
  "VALENBISI",
  "PARADA_EMT",
  "ESTACION_FGV",
  "BOCA_FGV",
  "APARCAMIENTO_BICI",
  "ITINERARIO_CICLISTA",
  "CARGADOR_VE",
];
const PROFILE_DEFAULT_POI = {
  GENERIC: "ALL",
  COMMERCIAL: "PARKING",
  PMR: "APARCAMIENTO_PMR",
  CYCLIST: "VALENBISI",
  PUBLIC_TRANSPORT: "PARADA_EMT",
};
const SOURCE_CATALOG = [
  {
    id: "open_data_core",
    datasetCount: 14,
    kindKey: "sourceKindOpenData",
    url: "https://opendata.vlci.valencia.es/",
  },
  {
    id: "emt_valencia_estado_servicio",
    datasetCount: 1,
    kindKey: "sourceKindOfficialFeed",
    url: "https://www.emtvalencia.es/ciudadano/index.php?option=com_content&view=article&id=728&Itemid=120&lang=es",
  },
  {
    id: "vpro_feedback",
    datasetCount: 1,
    kindKey: "sourceKindDerived",
    url: "https://github.com/Huntsman1756/Valencia_Proactiva",
  },
];
const GITHUB_URL = "https://github.com/Huntsman1756/Valencia_Proactiva";
const CONTEST_URL = "https://sede.valencia.es/sede/registro/procedimiento/AD.TR.15";
const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css";
const MAPLIBRE_JS_URL = "https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js";
const INITIAL_PROFILE = localStorage.getItem("vpro_profile") || "PMR";
const INITIAL_VEHICLE_BADGE = localStorage.getItem("vpro_vehicle_badge") || "UNKNOWN";
const LOCAL_VISIT_KEYS = {
  lastSeenAt: "vpro_last_seen_at",
  lastSeenProfile: "vpro_last_seen_profile",
};
const INITIAL_LAST_SEEN_AT = localStorage.getItem(LOCAL_VISIT_KEYS.lastSeenAt);
const INITIAL_LAST_SEEN_PROFILE = localStorage.getItem(LOCAL_VISIT_KEYS.lastSeenProfile) || INITIAL_PROFILE;

const state = {
  profile: INITIAL_PROFILE,
  language: localStorage.getItem("vpro_language") || languageFromNavigator(),
  messages: {},
  theme: localStorage.getItem("vpro_theme") || "light",
  alertMode: localStorage.getItem("vpro_alert_mode") === "true",
  vehicleBadge: INITIAL_VEHICLE_BADGE,
  events: [],
  cards: [],
  visibleCards: [],
  impactZones: [],
  trafficEvents: [],
  activeView: "events",
  poiTypeFilter: localStorage.getItem("vpro_poi_type") || PROFILE_DEFAULT_POI[INITIAL_PROFILE] || "ALL",
  activeOnly: localStorage.getItem("vpro_active_only") !== "false",
  showZbe: localStorage.getItem("vpro_show_zbe") !== "false",
  map: null,
  sessionToken: getSessionToken(),
  selectedCardIndex: 0,
  dashboardLoadTimer: null,
  dashboardRequestId: 0,
  localDelta: {
    previousAt: INITIAL_LAST_SEEN_AT,
    previousProfile: INITIAL_LAST_SEEN_PROFILE,
    notice: null,
  },
};

const eventList = document.querySelector("#eventList");
const eventsPanel = document.querySelector("#events");
let localDeltaNotice = document.querySelector("#localDeltaNotice");
const statusText = document.querySelector("#statusText");
const toast = document.querySelector("#toast");
const mapShell = document.querySelector(".map-shell");
const toggleMap = document.querySelector("#toggleMap");
const mapEventTray = document.querySelector("#mapEventTray");
const eventPanelToggle = document.querySelector("#eventPanelToggle");
const poiFilters = document.querySelector("#poiFilters");
const sourcesPanel = document.querySelector("#sourcesPanel");
const methodologyPanel = document.querySelector("#methodologyPanel");
const additionalInfoPanel = document.querySelector("#additionalInfoPanel");
const detailRail = document.querySelector(".detail-rail");
const detailPanelToggle = document.querySelector("#detailPanelToggle");
const selectedEventPanel = document.querySelector("#selectedEventPanel");
const profileImpact = document.querySelector("#profileImpact");
const panelBackdrop = document.querySelector("#panelBackdrop");
const themeToggle = document.querySelector("#themeToggle");
const alertModeToggle = document.querySelector("#alertModeToggle");
const vehicleBadge = document.querySelector("#vehicleBadge");
const zbeVehicleResult = document.querySelector("#zbeVehicleResult");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadMessages();
  applyTranslations();
  setupThemeToggle();
  setupAlertModeToggle();
  setupProfiles();
  setupLanguageSelector();
  setupViews();
  setupEventPanelToggle();
  setupDetailPanelToggle();
  setupQuickFilters();
  setupZbeChecker();
  setupPoiFilters();
  setupMapToggle();
  await loadDashboard();
  scheduleMapSetup();
}

async function loadMessages() {
  try {
    state.messages = await fetchJson(`./i18n/${state.language}.json`);
    document.documentElement.lang = state.messages.lang || state.language;
  } catch (error) {
    state.language = "es";
    state.messages = await fetchJson("./i18n/es.json");
    document.documentElement.lang = "es";
  }
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attribute, key] = pair.split(":");
      element.setAttribute(attribute, t(key));
    });
  });
  document.querySelectorAll("[data-profile]").forEach((button) => {
    renderProfileButton(button);
  });
  document.querySelectorAll("[data-poi-filter]").forEach((button) => {
    button.textContent = labelForPoiFilter(button.dataset.poiFilter);
  });
  document.querySelectorAll("#vehicleBadge [data-i18n]").forEach((option) => {
    option.textContent = t(option.dataset.i18n);
  });
  updateEventPanelToggleText();
  updateDetailPanelToggleText();
  toggleMap.textContent = mapShell.classList.contains("is-expanded") ? t("close") : t("expand");
  updateThemeButton();
  updateAlertModeButton();
  updateZbeChecker();
  renderInfoPanels();
  renderSelectedEvent(state.visibleCards[state.selectedCardIndex]);
}

function setupThemeToggle() {
  applyTheme();
  themeToggle?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("vpro_theme", state.theme);
    applyTheme();
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  updateThemeButton();
}

function updateThemeButton() {
  if (!themeToggle) {
    return;
  }
  const dark = state.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.querySelector("span").textContent = dark ? t("themeLightShort") : t("themeDarkShort");
}

function setupAlertModeToggle() {
  applyAlertMode();
  alertModeToggle?.addEventListener("click", () => {
    state.alertMode = !state.alertMode;
    localStorage.setItem("vpro_alert_mode", String(state.alertMode));
    applyAlertMode();
    showToast(state.alertMode ? t("alertModeToast") : t("alertModeOffToast"));
    vibrate(12);
  });
}

function applyAlertMode() {
  document.documentElement.dataset.alert = state.alertMode ? "prepared" : "off";
  updateAlertModeButton();
}

function updateAlertModeButton() {
  if (!alertModeToggle) {
    return;
  }
  alertModeToggle.setAttribute("aria-pressed", String(state.alertMode));
  alertModeToggle.querySelector("span").textContent = t("alertModeShort");
}

function setupProfiles() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    const active = button.dataset.profile === state.profile;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      state.profile = button.dataset.profile;
      localStorage.setItem("vpro_profile", state.profile);
      state.poiTypeFilter = PROFILE_DEFAULT_POI[state.profile] || "ALL";
      localStorage.setItem("vpro_poi_type", state.poiTypeFilter);
      state.localDelta.notice = null;
      document.querySelectorAll("[data-profile]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      updatePoiFilterButtons();
      updateProfileImpact();
      scheduleDashboardLoad();
    });
  });
  updateProfileImpact();
}

function renderProfileButton(button) {
  const profile = button.dataset.profile;
  button.innerHTML = `
    <span class="profile-icon" aria-hidden="true">${profileIcon(profile)}</span>
    <span class="profile-copy">
      <strong>${escapeHtml(profileLabel(profile))}</strong>
      <span>${escapeHtml(profileDescription(profile))}</span>
    </span>
  `;
}

function setupLanguageSelector() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    const active = button.dataset.lang === state.language;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", async () => {
      state.language = button.dataset.lang;
      localStorage.setItem("vpro_language", state.language);
      document.querySelectorAll("[data-lang]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      await loadMessages();
      applyTranslations();
      updateProfileImpact();
      if (state.cards.length > 0) {
        state.events = normalizeEvents(state.events);
        state.cards = state.cards.map((card) => ({
          ...card,
          event: normalizeEvent(card.event),
          action: selectActionForProfile(card.event.mitigation_actions || [], state.profile, card.event),
        }));
        const visibleCards = filteredCards();
        renderCards(visibleCards);
        statusText.textContent = formatMessage("activeEvents", { count: visibleCards.length });
        updateMap(visibleCards);
      }
    });
  });
}

function setupViews() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeView !== "events") {
      closeInfoPanel();
    }
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.view;
      state.activeView = nextView;
      document.querySelectorAll("[data-view]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      if (nextView === "events") {
        closeInfoPanel({ keepEventsPressed: true, revealEvents: true });
        setTimeout(() => state.map?.resize(), 120);
        return;
      }
      openInfoPanel(nextView);
    });
  });
}

function openInfoPanel(view) {
  document.body.classList.add("has-section-tab");
  if (eventsPanel) {
    eventsPanel.hidden = true;
  }
  document.querySelectorAll(".info-panel[data-panel]").forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.hidden = !active;
    if (active) {
      panel.setAttribute("role", "tabpanel");
      panel.focus({ preventScroll: true });
    } else {
      panel.removeAttribute("role");
    }
  });
  if (panelBackdrop) {
    panelBackdrop.hidden = true;
  }
}

function closeInfoPanel(options = {}) {
  state.activeView = "events";
  document.body.classList.remove("has-section-tab");
  if (eventsPanel) {
    eventsPanel.hidden = false;
  }
  document.querySelectorAll(".info-panel[data-panel]").forEach((panel) => {
    panel.hidden = true;
    panel.removeAttribute("role");
  });
  if (panelBackdrop) {
    panelBackdrop.hidden = true;
  }
  if (!options.keepEventsPressed) {
    document.querySelectorAll("[data-view]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.view === "events"));
    });
  }
  if (options.revealEvents) {
    revealEventsPanel();
  }
}

function revealEventsPanel() {
  eventsPanel?.classList.remove("is-collapsed");
  updateEventPanelToggleText();
  eventsPanel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  document.querySelector("[data-view='events']")?.focus({ preventScroll: true });
}

function setupEventPanelToggle() {
  eventPanelToggle?.addEventListener("click", () => {
    const collapsed = eventsPanel?.classList.toggle("is-collapsed") || false;
    eventPanelToggle.setAttribute("aria-expanded", String(!collapsed));
    updateEventPanelToggleText();
  });
  updateEventPanelToggleText();
}

function updateEventPanelToggleText() {
  if (!eventPanelToggle) {
    return;
  }
  eventPanelToggle.textContent = eventsPanel?.classList.contains("is-collapsed")
    ? t("expandEvents")
    : t("collapseEvents");
}

function setupDetailPanelToggle() {
  detailPanelToggle?.addEventListener("click", () => {
    const collapsed = detailRail?.classList.toggle("is-collapsed") || false;
    detailPanelToggle.setAttribute("aria-expanded", String(!collapsed));
    updateDetailPanelToggleText();
  });
  updateDetailPanelToggleText();
}

function updateDetailPanelToggleText() {
  if (!detailPanelToggle) {
    return;
  }
  const collapsed = detailRail?.classList.contains("is-collapsed");
  const key = collapsed ? "expandDetail" : "collapseDetail";
  const fallback = state.language === "val"
    ? (collapsed ? "Veure detall" : "Contraure detall")
    : (collapsed ? "Ver detalle" : "Contraer detalle");
  const label = t(key);
  detailPanelToggle.textContent = label === key ? fallback : label;
}

function setupQuickFilters() {
  document.querySelectorAll("[data-quick-filter]").forEach((button) => {
    const key = button.dataset.quickFilter;
    button.setAttribute("aria-checked", String(Boolean(state[key])));
    button.addEventListener("click", () => {
      state[key] = !state[key];
      localStorage.setItem(key === "activeOnly" ? "vpro_active_only" : "vpro_show_zbe", String(state[key]));
      button.setAttribute("aria-checked", String(state[key]));
      if (key === "activeOnly") {
        scheduleDashboardLoad();
        return;
      }
      if (key === "showZbe") {
        applyLayerVisibility();
      }
      renderCards(filteredCards());
      updateMap(filteredCards());
    });
  });
}

function setupPoiFilters() {
  poiFilters.innerHTML = "";
  POI_FILTERS.forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.poiFilter = type;
    button.textContent = labelForPoiFilter(type);
    button.setAttribute("aria-pressed", String(type === state.poiTypeFilter));
    button.addEventListener("click", () => {
      state.poiTypeFilter = type;
      localStorage.setItem("vpro_poi_type", type);
      updatePoiFilterButtons();
      scheduleDashboardLoad();
    });
    poiFilters.appendChild(button);
  });
}

function updatePoiFilterButtons() {
  document.querySelectorAll("[data-poi-filter]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.poiFilter === state.poiTypeFilter));
  });
}

function updateProfileImpact() {
  if (!profileImpact) {
    return;
  }
  const key = `profileImpact_${state.profile}`;
  profileImpact.textContent = t(key);
}

function setupZbeChecker() {
  if (!vehicleBadge) {
    return;
  }
  vehicleBadge.value = state.vehicleBadge;
  vehicleBadge.addEventListener("change", () => {
    state.vehicleBadge = vehicleBadge.value;
    localStorage.setItem("vpro_vehicle_badge", state.vehicleBadge);
    updateZbeChecker();
  });
  updateZbeChecker();
}

function updateZbeChecker() {
  if (!vehicleBadge || !zbeVehicleResult) {
    return;
  }
  vehicleBadge.value = state.vehicleBadge;
  const level = zbeStatusLevel(state.vehicleBadge);
  zbeVehicleResult.dataset.level = level;
  zbeVehicleResult.textContent = zbeStatusText(state.vehicleBadge);
}

function scheduleMapSetup() {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => setupMap(), { timeout: 4500 });
    return;
  }
  setTimeout(() => setupMap(), 3000);
}

async function setupMap() {
  if (state.map) {
    return;
  }

  await loadMapLibre();

  if (!window.maplibregl) {
    return;
  }

  state.map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: DEFAULT_CENTER,
    zoom: 13,
    attributionControl: false,
  });

  window.vproDebug = { map: state.map, state };
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  state.map.on("load", () => {
    reduceBaseMapVisualNoise();
    updateMap(filteredCards());
  });
  state.map.on("error", (event) => {
    const message = event?.error?.message;
    if (message) {
      console.warn(`MapLibre: ${message}`);
    }
  });
}

async function loadMapLibre() {
  if (window.maplibregl) {
    return;
  }
  if (!document.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MAPLIBRE_CSS_URL;
    document.head.appendChild(link);
  }
  await loadScript(MAPLIBRE_JS_URL);
}

function loadScript(src) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function setupMapToggle() {
  toggleMap.addEventListener("click", async () => {
    await setupMap();
    const expanded = mapShell.classList.toggle("is-expanded");
    toggleMap.textContent = expanded ? t("close") : t("expand");
    toggleMap.setAttribute("aria-expanded", String(expanded));
    setTimeout(() => state.map?.resize(), 190);
  });
}

async function loadDashboard() {
  const requestId = ++state.dashboardRequestId;
  renderLoadingSkeleton();
  statusText.textContent = formatMessage("activeProfileLoading", { profile: profileLabel(state.profile) });

  try {
    const eventLimit = state.activeOnly ? 8 : 16;
    const [events, impactZones, trafficEvents] = await Promise.all([
      fetchJson(`${API_BASE}/api/v1/events/?limit=${eventLimit}`),
      fetchJson(`${API_BASE}/api/v1/spatial/impact-zones?limit=120`),
      fetchJson(`${API_BASE}/api/v1/spatial/events-layer?limit=160&event_type=TRAFICO`),
    ]);
    if (requestId !== state.dashboardRequestId) {
      return;
    }
    const normalizedEvents = normalizeEvents(events);
    state.events = (state.activeOnly ? normalizedEvents.filter(isEventActive) : normalizedEvents).slice(0, state.activeOnly ? 6 : 10);
    state.impactZones = impactZones;
    state.trafficEvents = trafficEvents;

    if (state.events.length === 0) {
      renderEmpty(t("emptyEvents"));
      updateMap([]);
      return;
    }

    const cards = await Promise.all(state.events.map(buildCardModel));
    state.cards = cards.sort((a, b) => b.event.severity - a.event.severity);
    renderCards(filteredCards());
    renderInfoPanels();
    updateMap(filteredCards());
    statusText.textContent = formatMessage("activeEvents", { count: filteredCards().length });
    persistLocalVisitBaseline();
  } catch (error) {
    if (requestId !== state.dashboardRequestId) {
      return;
    }
    renderEmpty(t("apiError"));
    statusText.textContent = t("apiUnavailable");
    showToast(t("apiUnavailable"));
  }
}

function scheduleDashboardLoad() {
  clearTimeout(state.dashboardLoadTimer);
  state.dashboardLoadTimer = setTimeout(() => {
    loadDashboard();
  }, 220);
}

async function buildCardModel(event) {
  const [lon, lat] = event.center || DEFAULT_CENTER;
  const params = new URLSearchParams({
    lon,
    lat,
    radius_meters: "5000",
    event_id: String(event.id),
  });
  if (state.poiTypeFilter === "ALL" || state.poiTypeFilter === "APARCAMIENTO_PMR") {
    params.set("profile", state.profile);
  }
  if (state.poiTypeFilter !== "ALL") {
    params.set("poi_type", state.poiTypeFilter);
  }
  const alternatives = await fetchJson(`${API_BASE}/api/v1/spatial/alternatives?${params}`);
  return {
    event,
    alternative: alternatives[0] || null,
    action: selectActionForProfile(event.mitigation_actions || [], state.profile, event),
  };
}

function normalizeEvents(events) {
  return events
    .filter((event) => Array.isArray(event.center) && event.center.length === 2)
    .map(normalizeEvent);
}

function normalizeEvent(event) {
  const rawTitle = event.rawTitle ?? event.title ?? "";
  const rawDescription = event.rawDescription ?? event.description ?? "";
  return {
    ...event,
    rawTitle,
    rawDescription,
    title: normalizeEventTitle({ ...event, title: rawTitle }),
    description: cleanTitle(rawDescription || t("defaultDescription")),
    severity: Number(event.severity || 1),
  };
}

function isEventActive(event) {
  if (!event?.end_time) {
    return true;
  }
  return new Date(event.end_time).getTime() >= Date.now();
}

function renderCards(cards) {
  state.visibleCards = cards;
  eventList.innerHTML = "";
  updateLocalDeltaNotice(cards);
  renderMapEventTray(cards);
  if (cards.length === 0) {
    renderSelectedEvent(null);
    eventList.innerHTML = `<div class="empty-state">${escapeHtml(t("emptyEvents"))}</div>`;
    return;
  }
  cards.forEach((card, index) => eventList.appendChild(createEventCard(card, index)));
  selectCard(Math.min(state.selectedCardIndex, Math.max(cards.length - 1, 0)), { flyTo: false });
}

function updateLocalDeltaNotice(cards = state.visibleCards) {
  const noticeElement = ensureLocalDeltaNotice();
  if (!noticeElement) {
    return;
  }
  if (!state.localDelta.notice) {
    state.localDelta.notice = computeLocalDeltaNotice(cards);
  }
  if (!state.localDelta.notice) {
    noticeElement.hidden = true;
    noticeElement.textContent = "";
    return;
  }
  const { count, profile } = state.localDelta.notice;
  const noticeText = formatMessage("localDeltaNoticeText", {
    count,
    profile: profileLabel(profile),
  });
  noticeElement.hidden = false;
  noticeElement.innerHTML = `
    <strong>${escapeHtml(t("localDeltaNoticeTitle"))}</strong>
    <span>${escapeHtml(noticeText)}</span>
  `;
}

function ensureLocalDeltaNotice() {
  if (localDeltaNotice || !eventList?.parentNode) {
    return localDeltaNotice;
  }
  localDeltaNotice = document.createElement("div");
  localDeltaNotice.id = "localDeltaNotice";
  localDeltaNotice.className = "local-delta-notice";
  localDeltaNotice.setAttribute("role", "status");
  localDeltaNotice.setAttribute("aria-live", "polite");
  eventList.before(localDeltaNotice);
  return localDeltaNotice;
}

function computeLocalDeltaNotice(cards) {
  const previousAt = Date.parse(state.localDelta.previousAt || "");
  if (!Number.isFinite(previousAt) || state.localDelta.previousProfile !== state.profile) {
    return null;
  }
  const count = cards.filter((card) => eventTimestamp(card.event) > previousAt).length;
  if (count <= 0) {
    return null;
  }
  return { count, profile: state.profile };
}

function eventTimestamp(event) {
  const candidates = [event?.updated_at, event?.created_at, event?.start_time, event?.end_time];
  for (const value of candidates) {
    const timestamp = Date.parse(value || "");
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return 0;
}

function persistLocalVisitBaseline() {
  const now = new Date().toISOString();
  localStorage.setItem(LOCAL_VISIT_KEYS.lastSeenAt, now);
  localStorage.setItem(LOCAL_VISIT_KEYS.lastSeenProfile, state.profile);
}

function renderLoadingSkeleton() {
  if (!eventList) {
    return;
  }
  eventList.innerHTML = Array.from({ length: 3 }, () => `
    <article class="skeleton-card" aria-label="${escapeHtml(t("loadingSkeletonLabel"))}">
      <span></span>
      <strong></strong>
      <p></p>
      <i></i>
    </article>
  `).join("");
}

function renderMapEventTray(cards) {
  if (!mapEventTray) {
    return;
  }
  if (cards.length === 0) {
    mapEventTray.innerHTML = "";
    return;
  }
  mapEventTray.innerHTML = cards.slice(0, 6).map((card, index) => {
    const impact = impactInfo(card.event);
    return `
      <button type="button" data-map-card="${index}" aria-pressed="${index === state.selectedCardIndex}">
        <span class="tray-marker ${eventMarkerClass(card.event)}" aria-hidden="true"></span>
        <span>
          <strong>${escapeHtml(trimText(card.event.title, 42))}</strong>
          <small>${escapeHtml(impact.label)}</small>
        </span>
      </button>
    `;
  }).join("");
  mapEventTray.querySelectorAll("[data-map-card]").forEach((button) => {
    button.addEventListener("click", () => selectCard(Number(button.dataset.mapCard)));
  });
}

function filteredCards() {
  return state.cards.filter((card) => {
    if (!state.showZbe && card.event.type === "ZBE") {
      return false;
    }
    if (state.activeOnly && card.event.status && card.event.status !== "active") {
      return false;
    }
    return true;
  });
}

function createEventCard(card, index) {
  const { event, alternative } = card;
  const article = document.createElement("article");
  article.className = "event-card";
  article.dataset.severity = String(event.severity);
  article.dataset.cardIndex = String(index);
  article.dataset.selected = String(index === state.selectedCardIndex);
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-pressed", String(index === state.selectedCardIndex));

  const distance = alternative?.distance_meters ? `${Math.round(alternative.distance_meters)} m` : t("near");
  const places = alternative?.extra_data?.numplazas
    ? formatMessage("places", { count: alternative.extra_data.numplazas })
    : t("dataAvailable");
  const actionLabel = labelForAction(card.action);
  const impact = impactInfo(event);
  const alternativeName = displayAlternativeName(alternative, actionLabel || labelForPoi(alternative?.poi_type));
  const sourceText = formatMessage("sourceLine", {
    source: labelForSource(event.source),
    updated: formatUpdated(event.updated_at || event.created_at),
  });
  const veracityText = veracityLabel(event);
  const alternativeSource = alternative
    ? formatMessage("alternativeSourceLine", { source: labelForSource(alternative.source) })
    : "";
  const eventLocation = formatEventLocation(event);
  const showSeparateLocation = !isSameStreetLabel(event.title, eventLocation);
  const cardTitle = showSeparateLocation ? event.title : eventLocation;

  article.innerHTML = `
    <div class="source-strip">
      <span>${escapeHtml(sourceText)}</span>
      <span class="event-trust-line">${escapeHtml(veracityText)}</span>
      <span>${escapeHtml(event.source_id || "")}</span>
    </div>
    <div class="event-header">
      <div>
        <div class="event-type">
          <span>${labelForType(event.type)}</span>
          <span class="severity-badge">${escapeHtml(impact.label)}</span>
        </div>
        <h3>${escapeHtml(cardTitle)}</h3>
      </div>
      <span class="event-distance">${distance}</span>
    </div>
    ${showSeparateLocation ? `<p class="event-location">${escapeHtml(eventLocation)}</p>` : ""}
    <p class="event-description">${escapeHtml(trimText(event.description, 104))}</p>
    <div class="key-data">
      <span class="key-data-icon" aria-hidden="true">ALT</span>
      <p>
        <strong>${escapeHtml(alternativeName)}</strong>
        ${alternativeSource ? `<span>${escapeHtml(alternativeSource)}</span>` : ""}
        <span>${alternative ? `${distance} · ${places}` : t("noAlternative")}</span>
      </p>
    </div>
  `;

  article.addEventListener("click", (eventClick) => {
    if (!eventClick.target.closest("button,a")) {
      vibrate(8);
      selectCard(index);
    }
  });
  article.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      vibrate(8);
      selectCard(index);
    }
  });
  return article;
}

function selectCard(index, options = {}) {
  if (!state.visibleCards.length) {
    renderSelectedEvent(null);
    return;
  }
  const nextIndex = Number.isFinite(index) ? index : 0;
  state.selectedCardIndex = Math.max(0, Math.min(nextIndex, state.visibleCards.length - 1));
  document.querySelectorAll(".event-card").forEach((cardElement) => {
    const selected = Number(cardElement.dataset.cardIndex) === state.selectedCardIndex;
    cardElement.dataset.selected = String(selected);
    cardElement.setAttribute("aria-pressed", String(selected));
  });
  mapEventTray?.querySelectorAll("[data-map-card]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.mapCard) === state.selectedCardIndex));
  });
  const card = state.visibleCards[state.selectedCardIndex];
  renderSelectedEvent(card);
  if (options.flyTo !== false && state.map && card?.event?.center) {
    state.map.flyTo({
      center: card.event.center,
      zoom: 14,
      offset: mapSelectionOffset(),
      essential: false,
    });
  }
}

function renderSelectedEvent(card) {
  if (!selectedEventPanel) {
    return;
  }
  if (!card) {
    selectedEventPanel.innerHTML = `<p class="empty-state">${escapeHtml(t("selectEventHint"))}</p>`;
    return;
  }

  const { event, alternative } = card;
  const distance = alternative?.distance_meters ? `${Math.round(alternative.distance_meters)} m` : t("near");
  const places = alternative?.extra_data?.numplazas
    ? formatMessage("places", { count: alternative.extra_data.numplazas })
    : t("dataAvailable");
  const actionLabel = labelForAction(card.action) || t("noAdminAction");
  const alternativeName = displayAlternativeName(alternative, labelForPoi(alternative?.poi_type));
  const adminUrl = citizenActionUrl(card.action);
  const adminLinkLabel = labelForActionLink(card.action);
  const adminLink = adminUrl
    ? `<a class="detail-link primary-admin-link" href="${adminUrl}" target="_blank" rel="noopener">${escapeHtml(adminLinkLabel)}</a>`
    : "";
  const adminDeepLink = `<p class="admin-deeplink">${escapeHtml(formatMessage("adminDeepLinkHint", { sourceId: event.source_id || event.id }))}</p>`;
  const impact = impactInfo(event);
  const severityClass = event.severity >= 4 ? " is-high" : "";
  const veracityText = veracityLabel(event);
  const temporalText = temporalImpactText(event);
  const eventLocation = formatEventLocation(event);

  selectedEventPanel.innerHTML = `
    <div class="detail-meta">
      <span class="detail-status${severityClass}">${t("activeStatus")} - ${escapeHtml(impact.label)}</span>
      <h2>${escapeHtml(event.title)}</h2>
      <p>${escapeHtml(trimText(event.description, 160))}</p>
      <span class="veracity-badge detail-veracity">${escapeHtml(veracityText)}</span>
    </div>
    <dl class="detail-list">
      <div>
        <dt>${t("locationLabel")}</dt>
        <dd>${escapeHtml(eventLocation)}</dd>
      </div>
      <div>
        <dt>${t("affectedAreaLabel")}</dt>
        <dd>${escapeHtml(formatMessage("affectedAreaValue", { meters: impact.meters }))}</dd>
      </div>
      <div>
        <dt>${t("temporalImpactTitle")}</dt>
        <dd>${escapeHtml(temporalText)}</dd>
      </div>
      <div>
        <dt>${t("sourceLabel")}</dt>
        <dd>${escapeHtml(formatMessage("sourceLine", {
          source: labelForSource(event.source),
          updated: formatUpdated(event.updated_at || event.created_at),
        }))}</dd>
      </div>
    </dl>
    <section class="detail-block">
      <h3>${t("recommendedAlternativeTitle")}</h3>
      <p class="mode-guidance">${escapeHtml(profileAlternativeGuidance(card))}</p>
      <p><strong>${escapeHtml(alternativeName || t("noAlternative"))}</strong></p>
      <p>${alternative ? escapeHtml(`${distance} · ${places} · ${labelForPoi(alternative.poi_type)}`) : escapeHtml(t("noAlternative"))}</p>
    </section>
    <section class="detail-block">
      <h3>${t("adminActionTitle")}</h3>
      <p>${escapeHtml(actionLabel)}</p>
      ${adminDeepLink}
      ${adminLink}
    </section>
    <section class="detail-block">
      <h3>${t("feedbackQuestion")}</h3>
      <div class="detail-actions">
        <button type="button" class="snapshot-button">${t("exportSnapshot")}</button>
        <div class="feedback-group" aria-label="${t("feedbackGroupLabel")}">
          <button type="button" class="feedback-button" data-vote="1" aria-label="${t("useful")}"><span aria-hidden="true">+</span><span>${t("useful")}</span></button>
          <button type="button" class="feedback-button" data-vote="-1" aria-label="${t("notUseful")}"><span aria-hidden="true">-</span><span>${t("notUseful")}</span></button>
        </div>
      </div>
    </section>
  `;

  selectedEventPanel.querySelector(".snapshot-button").addEventListener("click", () => exportSnapshot(card));
  selectedEventPanel.querySelectorAll(".feedback-button").forEach((button) => {
    button.addEventListener("click", () => submitFeedback(button, card));
  });
}

function labelForActionLink(action) {
  if (action?.payload?.template_id === "comercio-ocupacion") {
    return t("requestHelpLink");
  }
  return t("openActionLink");
}

function displayAlternativeName(alternative, fallback = "") {
  const rawName = String(alternative?.name || "").trim();
  const normalized = rawName.toLowerCase();
  if (!rawName || normalized === "sin titulo" || /^[0-9a-z]$/i.test(rawName)) {
    return fallback || labelForPoi(alternative?.poi_type);
  }
  return rawName;
}

function mapSelectionOffset() {
  if (window.matchMedia("(min-width: 1180px)").matches) {
    return [-96, -140];
  }
  if (window.matchMedia("(max-width: 719px)").matches) {
    return [0, -90];
  }
  return [0, -70];
}

function impactInfo(event) {
  const severity = Number(event?.severity || 1);
  const meters = Math.min(Math.max(severity * 100, 100), 500);
  let level = t("impactLow");
  if (severity >= 4) {
    level = t("impactHigh");
  } else if (severity >= 3) {
    level = t("impactMedium");
  } else if (severity >= 2) {
    level = t("impactModerate");
  }
  return {
    meters,
    label: formatMessage("impactBadge", { level, meters }),
  };
}

function profileAlternativeGuidance(card) {
  const poiType = card?.alternative?.poi_type;
  if (state.profile === "PUBLIC_TRANSPORT") {
    if (poiType === "PARADA_EMT") {
      return t("alternativeGuidanceBus");
    }
    if (poiType === "ESTACION_FGV" || poiType === "BOCA_FGV") {
      return t("alternativeGuidanceMetro");
    }
    return t("alternativeGuidancePublicTransport");
  }
  if (state.profile === "CYCLIST") {
    return poiType === "VALENBISI" ? t("alternativeGuidanceValenbisi") : t("alternativeGuidanceBike");
  }
  if (state.profile === "PMR") {
    return t("alternativeGuidancePmr");
  }
  if (state.profile === "COMMERCIAL") {
    return t("alternativeGuidanceCommercial");
  }
  return t("alternativeGuidanceGeneric");
}

function zbeStatusLevel(badge) {
  if (badge === "NONE") {
    return "restricted";
  }
  if (badge === "UNKNOWN" || badge === "B") {
    return "review";
  }
  return "allowed";
}

function zbeStatusText(badge) {
  if (badge === "NONE") {
    return t("zbeStatusRestricted");
  }
  if (badge === "B") {
    return t("zbeStatusReviewB");
  }
  if (badge === "UNKNOWN") {
    return t("zbeStatusUnknown");
  }
  return t("zbeStatusAllowed");
}

function renderEmpty(message) {
  eventList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  state.cards = [];
  state.visibleCards = [];
  state.selectedCardIndex = 0;
  renderSelectedEvent(null);
}

function cityPulseMetrics() {
  const visibleEvents = state.visibleCards.length || state.cards.length || state.events.length;
  const impactRadii = state.visibleCards
    .map(({ event }) => impactInfo(event).meters)
    .filter((meters) => Number.isFinite(meters));
  const affectedStreets = Math.max(visibleEvents, Math.round(impactRadii.reduce((sum, meters) => sum + meters, 0) / 85));
  const districts = Math.max(1, new Set(state.visibleCards.map(({ event }) => Math.round((event.center?.[0] || 0) * 100))).size);
  const verifiedEvents = state.visibleCards.filter(({ event }) => event.source && !String(event.source).includes("feedback")).length;
  const verified = visibleEvents ? Math.round((verifiedEvents / visibleEvents) * 100) : 0;
  return {
    affectedStreets,
    districts,
    verified: Math.max(verified, verifiedEvents ? 85 : 0),
  };
}

function datasetHealthRows() {
  const eventCount = state.events.length;
  const trafficCount = state.trafficEvents.length;
  const noticeCount = 20;
  return [
    {
      level: eventCount ? "good" : "warn",
      name: t("sourceHealthEventsName"),
      detail: formatMessage("sourceHealthEventsDetail", { count: eventCount || 0 }),
      status: eventCount ? t("sourceHealthGood") : t("sourceHealthReview"),
    },
    {
      level: trafficCount ? "good" : "quiet",
      name: t("sourceHealthTrafficName"),
      detail: formatMessage("sourceHealthTrafficDetail", { count: trafficCount || 0 }),
      status: trafficCount ? t("sourceHealthGood") : t("sourceHealthQuiet"),
    },
    {
      level: "review",
      name: t("sourceHealthNoticesName"),
      detail: formatMessage("sourceHealthNoticesDetail", { count: noticeCount }),
      status: t("sourceHealthDeferred"),
    },
  ];
}

function renderInfoPanels() {
  const eventSourceCount = new Set(state.events.map((event) => event.source).filter(Boolean)).size;
  const alternativeTypes = new Set(
    state.cards.map((card) => card.alternative?.poi_type).filter(Boolean),
  ).size;
  const pulse = cityPulseMetrics();

  sourcesPanel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${t("sourcesEyebrow")}</p>
      <h2>${t("sourcesTitle")}</h2>
      <p>${formatMessage("sourcesIntro", { eventSources: eventSourceCount || 1, poiTypes: alternativeTypes || 0 })}</p>
    </div>
    <section class="info-section">
      <h3>${t("sourcesWhyTitle")}</h3>
      <p class="info-copy">${t("sourcesWhyText")}</p>
    </section>
    <div class="source-list">
      ${SOURCE_CATALOG.map((source) => `
        <article class="source-row">
          <div>
            <strong>${t(`sourceName_${source.id}`)}</strong>
            <span>${t(`sourceDescription_${source.id}`)}</span>
            <ul class="dataset-list">
              ${sourceDatasets(source.id).map((dataset) => `
                <li>
                  <span class="dataset-icon" aria-hidden="true">${escapeHtml(datasetIconLabel(dataset))}</span>
                  <span>${escapeHtml(dataset)}</span>
                </li>
              `).join("")}
            </ul>
          </div>
          <small>${t(source.kindKey)} · ${formatMessage("datasetCount", { count: source.datasetCount })}</small>
          <a href="${source.url}" target="_blank" rel="noopener">${t("openSourceLink")}</a>
        </article>
      `).join("")}
    </div>
    <section class="info-section source-health" aria-label="${t("sourceHealthTitle")}">
      <h3>${t("sourceHealthTitle")}</h3>
      <p class="info-copy">${t("sourceHealthIntro")}</p>
      <div class="health-list">
        ${datasetHealthRows().map((row) => `
          <div class="health-row" data-health="${row.level}">
            <span class="health-led" aria-hidden="true"></span>
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(row.detail)}</span>
            <small>${escapeHtml(row.status)}</small>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="info-section">
      <h3>${t("derivedDataTitle")}</h3>
      <p class="info-copy">${t("derivedDataText")}</p>
    </section>
  `;

  methodologyPanel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${t("methodologyEyebrow")}</p>
      <h2>${t("methodologyTitle")}</h2>
      <p>${t("methodologyIntro")}</p>
    </div>
    <ol class="method-list">
      <li>${t("methodStep1")}</li>
      <li>${t("methodStep2")}</li>
      <li>${t("methodStep3")}</li>
      <li>${t("methodStep4")}</li>
      <li>${t("methodStep5")}</li>
    </ol>
    <p class="info-copy">${t("methodologyNote")}</p>
    <details class="info-accordion" open>
      <summary>${t("mapMethodTitle")}</summary>
      <article class="map-explainer">
        <strong>${t("mapLayerEventsTitle")}</strong>
        <p>${t("mapLayerEventsText")}</p>
      </article>
      <article class="map-explainer">
        <strong>${t("mapLayerImpactTitle")}</strong>
        <p>${t("mapLayerImpactText")}</p>
      </article>
      <article class="map-explainer">
        <strong>${t("mapLayerAlternativesTitle")}</strong>
        <p>${t("mapLayerAlternativesText")}</p>
      </article>
    </details>
  `;

  additionalInfoPanel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${t("infoEyebrow")}</p>
      <h2>${t("infoTitle")}</h2>
      <p>${t("infoIntro")}</p>
    </div>
    <p class="info-copy">${t("projectPurpose")}</p>
    <section class="urban-pulse" aria-label="${t("urbanPulseTitle")}">
      <div>
        <p class="eyebrow">${t("urbanPulseEyebrow")}</p>
        <h3>${t("urbanPulseTitle")}</h3>
        <p>${t("urbanPulseText")}</p>
      </div>
      <dl>
        <div><dt>${t("urbanPulseAffectedStreets")}</dt><dd>${pulse.affectedStreets}</dd></div>
        <div><dt>${t("urbanPulseDistricts")}</dt><dd>${pulse.districts}</dd></div>
        <div><dt>${t("urbanPulseVerified")}</dt><dd>${pulse.verified}%</dd></div>
      </dl>
    </section>
    <div class="info-metrics">
      <div><strong>663</strong><span>${t("metricEvents")}</span></div>
      <div><strong>13.710</strong><span>${t("metricPois")}</span></div>
      <div><strong>20</strong><span>${t("metricNotices")}</span></div>
    </div>
    <details class="info-accordion" open>
      <summary>${t("journalismWidgetTitle")}</summary>
      <p class="info-copy">${t("journalismWidgetText")}</p>
    </details>
    <details class="info-accordion" open>
      <summary>${t("governanceReferenceTitle")}</summary>
      <p class="info-copy">${t("governanceReferenceText")}</p>
    </details>
    <details class="info-accordion" open>
      <summary>${t("limitationsTitle")}</summary>
      <ul class="limitation-list">
        <li>${t("limitation1")}</li>
        <li>${t("limitation2")}</li>
        <li>${t("limitation3")}</li>
      </ul>
    </details>
    <details class="info-accordion" open>
      <summary>${t("faqTitle")}</summary>
      <div class="faq-list">
        ${renderFaqItems()}
      </div>
    </details>
    <div class="info-links">
      <a href="${GITHUB_URL}" target="_blank" rel="noopener">${t("githubLink")}</a>
      <a href="${CONTEST_URL}" target="_blank" rel="noopener">${t("contestLink")}</a>
    </div>
  `;
}

function renderFaqItems() {
  return Array.from({ length: 9 }, (_, index) => {
    const number = index + 1;
    return `
      <article class="faq-item">
        <strong>${t(`faqQ${number}`)}</strong>
        <p>${t(`faqA${number}`)}</p>
      </article>
    `;
  }).join("");
}

function updateMap(cards) {
  if (!state.map || !window.maplibregl) {
    return;
  }

  if (!state.map.loaded()) {
    state.map.once("load", () => updateMap(cards));
    return;
  }

  ensureMapLayers();
  const visibleEventIds = new Set(cards.map(({ event }) => Number(event.id)));
  const visibleImpactZones = state.impactZones.filter((zone) => visibleEventIds.has(Number(zone.event_id)));
  const relevantTrafficEvents = state.trafficEvents.filter((event) => Number(event.severity || 1) > 1);
  setGeoJsonSource("impact-zones", featureCollection(visibleImpactZones.map(impactZoneFeature)));
  setGeoJsonSource("traffic-lines", featureCollection(relevantTrafficEvents.map(eventGeometryFeature).filter(Boolean)));
  setGeoJsonSource("event-points", featureCollection(cards.map(({ event }) => eventPointFeature(event)).filter(Boolean)));
  setGeoJsonSource(
    "alternative-points",
    featureCollection(cards.map(({ alternative }) => alternativeFeature(alternative)).filter(Boolean)),
  );
  applyLayerVisibility();

  const selectedCenter = cards[state.selectedCardIndex]?.event?.center || cards[0]?.event?.center;
  if (selectedCenter) {
    state.map.flyTo({ center: selectedCenter, zoom: 13.4, offset: mapSelectionOffset(), essential: false });
  }
}

function ensureMapLayers() {
  if (state.map.getSource("event-points")) {
    return;
  }

  ensureMapMarkerImages();
  state.map.addSource("impact-zones", { type: "geojson", data: featureCollection([]) });
  state.map.addSource("traffic-lines", { type: "geojson", data: featureCollection([]) });
  state.map.addSource("event-points", { type: "geojson", data: featureCollection([]) });
  state.map.addSource("alternative-points", { type: "geojson", data: featureCollection([]) });

  state.map.addLayer({
    id: "impact-zones-fill",
    type: "fill",
    source: "impact-zones",
    paint: {
      "fill-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", "#c57b13"],
      "fill-opacity": 0.1,
    },
  });
  state.map.addLayer({
    id: "impact-zones-line",
    type: "line",
    source: "impact-zones",
    paint: {
      "line-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", "#c57b13"],
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  });
  state.map.addLayer({
    id: "traffic-realtime",
    type: "line",
    source: "traffic-lines",
    paint: {
      "line-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", [">=", ["get", "severity"], 3], "#c57b13", "#057a55"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 15, 3.5],
      "line-opacity": 0.58,
    },
  });
  state.map.addLayer({
    id: "event-points",
    type: "symbol",
    source: "event-points",
    layout: {
      "icon-image": ["get", "marker_icon"],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.78, 15, 1.05],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  state.map.addLayer({
    id: "alternative-points",
    type: "symbol",
    source: "alternative-points",
    layout: {
      "icon-image": "vpro-alt-marker",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.72, 15, 0.98],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  setupMapInteractions();
}

function ensureMapMarkerImages() {
  [
    ["vpro-event-low", "#057a55", "!"],
    ["vpro-event-mid", "#c57b13", "!"],
    ["vpro-event-high", "#c7362f", "!"],
    ["vpro-alt-marker", "#6551a8", "A"],
  ].forEach(([name, color, letter]) => {
    if (!state.map.hasImage(name)) {
      state.map.addImage(name, createMarkerImage(color, letter), { pixelRatio: 2 });
    }
  });
}

function createMarkerImage(color, letter) {
  const canvas = document.createElement("canvas");
  canvas.width = 76;
  canvas.height = 88;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = "rgba(11, 32, 56, 0.28)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(38, 32, 24, 0, Math.PI * 2);
  ctx.moveTo(38, 80);
  ctx.lineTo(24, 52);
  ctx.lineTo(52, 52);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 38, 32);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function setupMapInteractions() {
  if (state.map.__vproInteractionsBound) {
    return;
  }
  state.map.__vproInteractionsBound = true;

  [
    ["event-points", popupForEventPoint],
    ["alternative-points", popupForAlternativePoint],
    ["impact-zones-fill", popupForImpactZone],
    ["traffic-realtime", popupForTrafficLine],
  ].forEach(([layerId, popupBuilder]) => {
    state.map.on("click", layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(popupCoordinates(feature, event.lngLat))
        .setHTML(popupBuilder(feature.properties || {}))
        .addTo(state.map);
    });
    state.map.on("mouseenter", layerId, () => {
      state.map.getCanvas().style.cursor = "pointer";
    });
    state.map.on("mouseleave", layerId, () => {
      state.map.getCanvas().style.cursor = "";
    });
  });
}

function popupCoordinates(feature, lngLat) {
  if (feature.geometry?.type === "Point") {
    return feature.geometry.coordinates;
  }
  return lngLat;
}

function popupForEventPoint(properties) {
  const impact = impactInfo({ severity: properties.severity });
  return popupHtml(properties.title || labelForType(properties.type), [
    `${labelForType(properties.type)} - ${impact.label}`,
    t("popupEventHint"),
  ]);
}

function popupForAlternativePoint(properties) {
  const accessible = properties.accessible === true || properties.accessible === "true";
  return popupHtml(properties.name || labelForPoi(properties.poi_type), [
    `${t("legendAlternative")} - ${labelForPoi(properties.poi_type)}`,
    accessible ? t("popupAccessible") : t("popupAlternativeHint"),
  ]);
}

function popupForImpactZone(properties) {
  const impact = impactInfo({ severity: properties.severity });
  return popupHtml(t("legendImpact"), [
    `${labelForType(properties.event_type)} - ${impact.label}`,
    formatMessage("popupImpactRadius", { meters: Math.round(Number(properties.buffer_distance || 0)) }),
    t("popupImpactHint"),
  ]);
}

function popupForTrafficLine(properties) {
  const impact = impactInfo({ severity: properties.severity });
  return popupHtml(t("legendTraffic"), [
    `${labelForType(properties.type)} - ${impact.label}`,
    t("popupTrafficHint"),
  ]);
}

function popupHtml(title, lines) {
  return `
    <strong class="map-popup-title">${escapeHtml(title || "")}</strong>
    <span class="map-popup-meta">${lines.filter(Boolean).map(escapeHtml).join("<br>")}</span>
  `;
}

function setGeoJsonSource(sourceId, data) {
  const source = state.map.getSource(sourceId);
  if (source) {
    source.setData(data);
  }
}

function applyLayerVisibility() {
  if (!state.map) {
    return;
  }
  [
    "impact-zones-fill",
    "impact-zones-line",
  ].forEach((layerId) => {
    if (state.map.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", state.showZbe ? "visible" : "none");
    }
  });
}

function reduceBaseMapVisualNoise() {
  const noisyLayer = /(poi|transit|station|bus|rail|airport|aerialway|ferry|parking)/i;
  state.map.getStyle().layers
    .filter((layer) => layer.type === "symbol" && noisyLayer.test(layer.id))
    .forEach((layer) => {
      if (state.map.getLayer(layer.id)) {
        state.map.setLayoutProperty(layer.id, "visibility", "none");
      }
    });
}

function featureCollection(features) {
  return { type: "FeatureCollection", features };
}

function impactZoneFeature(zone) {
  return {
    type: "Feature",
    geometry: zone.geometry,
    properties: {
      id: zone.id,
      event_id: zone.event_id,
      event_type: zone.event_type,
      severity: Number(zone.severity || 1),
      buffer_distance: Number(zone.buffer_distance || 0),
    },
  };
}

function eventGeometryFeature(event) {
  if (!event.geometry) {
    return null;
  }
  return {
    type: "Feature",
    geometry: event.geometry,
    properties: {
      id: event.id,
      type: event.type,
      type_label: labelForType(event.type),
      severity: Number(event.severity || 1),
    },
  };
}

function eventPointFeature(event) {
  if (!Array.isArray(event.center)) {
    return null;
  }
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: event.center },
    properties: {
      id: event.id,
      type: event.type,
      type_label: labelForType(event.type),
      severity: Number(event.severity || 1),
      marker_icon: eventMarkerIcon(event),
      title: event.title,
    },
  };
}

function alternativeFeature(alternative) {
  if (!alternative?.geometry) {
    return null;
  }
  return {
    type: "Feature",
    geometry: alternative.geometry,
    properties: {
      id: alternative.id,
      poi_type: alternative.poi_type,
      name: alternative.name,
      accessible: Boolean(alternative.accessible),
    },
  };
}

async function submitFeedback(button, card) {
  vibrate([8, 28, 8]);
  button.closest(".feedback-group").querySelectorAll(".feedback-button").forEach((item) => {
    item.dataset.selected = "false";
  });
  button.dataset.selected = "true";

  const actionId = card.action?.id;
  if (!actionId) {
    showToast(t("feedbackLocal"));
    return;
  }

  try {
    await fetchJson(`${API_BASE}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mitigation_action_id: actionId,
        vote: Number(button.dataset.vote),
        session_token: state.sessionToken,
        profile: state.profile,
      }),
    });
    showToast(t("feedbackSaved"));
  } catch (error) {
    showToast(t("feedbackError"));
  }
}

async function exportSnapshot(card) {
  const payload = buildSnapshotPayload(card);
  const serialized = JSON.stringify(payload, null, 2);
  const copied = await copyText(serialized);
  showToast(copied ? t("snapshotCopied") : t("snapshotCopyFallback"));
  vibrate(10);
}

function buildSnapshotPayload(card) {
  const { event, alternative } = card;
  const impact = impactInfo(event);
  const snapshotUrl = `${window.location.origin}${window.location.pathname}#event-${event.id}`;
  const alternativeName = displayAlternativeName(alternative, labelForPoi(alternative?.poi_type));
  return {
    title: "VLC PROACTIVA snapshot",
    generated_at: new Date().toISOString(),
    license: "CC-BY 4.0",
    source_attribution: t("footerAttribution"),
    event: {
      id: event.id,
      title: event.title,
      type: labelForType(event.type),
      status: event.status || "active",
      impact: impact.label,
      source: labelForSource(event.source),
      source_id: event.source_id || null,
      location: formatEventLocation(event),
      updated: event.updated_at || event.created_at || null,
      center: event.center || null,
    },
    alternative: alternative ? {
      id: alternative.id,
      name: alternativeName,
      type: labelForPoi(alternative.poi_type),
      distance_meters: Math.round(alternative.distance_meters || 0),
      source: labelForSource(alternative.source),
      accessible: Boolean(alternative.accessible),
    } : null,
    embed_html: `<iframe title="VLC PROACTIVA - ${escapeHtml(event.title)}" src="${snapshotUrl}" width="100%" height="520" loading="lazy"></iframe>`,
  };
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fall through to the legacy path when browser permissions block clipboard.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function getSessionToken() {
  const existing = localStorage.getItem("vpro_session_token");
  if (existing) {
    return existing;
  }
  const token = crypto.randomUUID ? crypto.randomUUID().replaceAll("-", "") : String(Date.now());
  localStorage.setItem("vpro_session_token", token);
  return token;
}

function labelForType(type) {
  return state.messages.eventTypes?.[type] || state.messages.eventTypes?.DEFAULT || type;
}

function labelForPoi(type) {
  return state.messages.poiTypes?.[type] || state.messages.poiTypes?.DEFAULT || type || "";
}

function labelForPoiFilter(type) {
  return state.messages.poiFilters?.[type] || labelForPoi(type);
}

function eventMarkerIcon(event) {
  const severity = Number(event?.severity || 1);
  if (severity >= 4) {
    return "vpro-event-high";
  }
  if (severity >= 2) {
    return "vpro-event-mid";
  }
  return "vpro-event-low";
}

function eventMarkerClass(event) {
  const severity = Number(event?.severity || 1);
  if (severity >= 4) {
    return "is-high";
  }
  if (severity >= 2) {
    return "is-mid";
  }
  return "is-low";
}

function labelForSource(source) {
  return state.messages.sources?.[source] || state.messages.sources?.DEFAULT || source || "";
}

function veracityLabel(event) {
  const source = labelForSource(event?.source);
  const updated = formatUpdated(event?.updated_at || event?.created_at);
  if (event?.source === "vpro_feedback" || String(event?.source || "").includes("feedback")) {
    return t("dataCitizenPending");
  }
  return formatMessage("dataVerified", { source, updated });
}

function temporalImpactText(event) {
  if (event?.end_time) {
    return formatMessage("temporalImpactUntil", { date: formatUpdated(event.end_time) });
  }
  return t("temporalImpactUnknown");
}

function labelForAction(action) {
  if (!action) {
    return null;
  }
  return state.messages.actionTemplates?.[action.payload?.template_id] || action.title;
}

function profileLabel(profile) {
  return state.messages.profiles?.[profile] || profile;
}

function profileDescription(profile) {
  return state.messages.profileDescriptions?.[profile] || "";
}

function profileIcon(profile) {
  return {
    GENERIC: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>',
    COMMERCIAL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12l-1 10H7L6 10Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/><path d="M8 14h8"/></svg>',
    PMR: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="5" r="2"/><path d="M10 8v5h4l3 5"/><path d="M8.5 11a5 5 0 1 0 5 6"/></svg>',
    CYCLIST: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M8 17l4-7 3 7M12 10h4M11 7h3"/><circle cx="15" cy="5" r="1.5"/></svg>',
    PUBLIC_TRANSPORT: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="13" rx="2"/><path d="M8 8h8M8 12h8M9 20h.01M15 20h.01"/><path d="M9 17l-2 3M15 17l2 3"/></svg>',
  }[profile] || '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
}

function citizenActionUrl(action) {
  const rawUrl = action?.payload?.url || action?.payload?.secondary_url;
  if (!rawUrl || rawUrl === CONTEST_URL) {
    return null;
  }
  return rawUrl;
}

function selectActionForProfile(actions, profile, event = null) {
  return actions.find((action) => action.payload?.profiles?.includes(profile))
    || syntheticCommercialAction(profile, event)
    || (profile === "COMMERCIAL" ? actions.find((action) => citizenActionUrl(action)) : null)
    || actions.find((action) => action.payload?.profiles?.includes("GENERIC"))
    || actions[0]
    || null;
}

function syntheticCommercialAction(profile, event) {
  if (profile !== "COMMERCIAL" || event?.type !== "OCUPACION") {
    return null;
  }
  return {
    id: null,
    title: t("commercialFallbackActionTitle"),
    payload: {
      template_id: "comercio-ocupacion",
      profiles: ["COMMERCIAL"],
      url: "https://sede.valencia.es/sede/registro/procedimiento/TR.AR.45?lang=1",
      secondary_url: "https://sede.valencia.es/sede/registro/procedimiento/VP.VE.50?lang=1",
    },
  };
}

function sourceDatasets(sourceId) {
  const datasets = state.messages.sourceDatasets?.[sourceId];
  return Array.isArray(datasets) ? datasets : [];
}

function datasetIconLabel(dataset) {
  const value = String(dataset || "").toLowerCase();
  if (value.includes("emt") || value.includes("autob")) {
    return "BUS";
  }
  if (value.includes("fgv") || value.includes("metro")) {
    return "MET";
  }
  if (value.includes("valenbisi") || value.includes("bici") || value.includes("ciclist")) {
    return "BIC";
  }
  if (value.includes("pmr") || value.includes("mobilitat") || value.includes("acces")) {
    return "PMR";
  }
  if (value.includes("zbe")) {
    return "ZBE";
  }
  if (value.includes("tràfic") || value.includes("tráfico") || value.includes("transit")) {
    return "TRF";
  }
  if (value.includes("feedback")) {
    return "FB";
  }
  if (value.includes("impact")) {
    return "GIS";
  }
  if (value.includes("recarga") || value.includes("recarrega") || value.includes("eléctr")) {
    return "VE";
  }
  return "DAT";
}

function cleanTitle(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeEventTitle(event) {
  const title = cleanTitle(event.title || "");
  if (!title || title.toLowerCase() === "sin titulo") {
    return labelForType(event.type);
  }
  return title;
}

function trimText(value, max) {
  const text = cleanTitle(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

function vibrate(pattern = 8) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function t(key) {
  return state.messages[key] || key;
}

function formatMessage(key, values) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    t(key),
  );
}

function formatUpdated(value) {
  if (!value) {
    return t("updatedNow");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("updatedNow");
  }
  return new Intl.DateTimeFormat(state.language === "val" ? "ca-ES" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventLocation(event) {
  const label = event?.location_label || event?.extra_data?.location_label;
  if (typeof label === "string" && label.trim()) {
    return label.trim();
  }
  return t("unknownLocation");
}

function isSameStreetLabel(title, location) {
  const normalizedTitle = normalizePlaceForComparison(title);
  const normalizedLocation = normalizePlaceForComparison(location).replace(/\s+\d+[a-z]?$/i, "");
  return Boolean(normalizedTitle && normalizedTitle === normalizedLocation);
}

function normalizePlaceForComparison(value) {
  return cleanTitle(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .toLowerCase();
}

function languageFromNavigator() {
  return navigator.language?.toLowerCase().startsWith("ca") ? "val" : "es";
}

function defaultApiBase() {
  return window.location.port === "3000" ? "http://localhost:8000" : window.location.origin;
}
