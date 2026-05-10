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

const state = {
  profile: INITIAL_PROFILE,
  language: localStorage.getItem("vpro_language") || languageFromNavigator(),
  messages: {},
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
};

const eventList = document.querySelector("#eventList");
const statusText = document.querySelector("#statusText");
const toast = document.querySelector("#toast");
const mapShell = document.querySelector(".map-shell");
const toggleMap = document.querySelector("#toggleMap");
const poiFilters = document.querySelector("#poiFilters");
const sourcesPanel = document.querySelector("#sourcesPanel");
const methodologyPanel = document.querySelector("#methodologyPanel");
const additionalInfoPanel = document.querySelector("#additionalInfoPanel");
const detailRail = document.querySelector(".detail-rail");
const selectedEventPanel = document.querySelector("#selectedEventPanel");
const profileImpact = document.querySelector("#profileImpact");
const panelBackdrop = document.querySelector("#panelBackdrop");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadMessages();
  applyTranslations();
  setupProfiles();
  setupLanguageSelector();
  setupViews();
  setupQuickFilters();
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
  toggleMap.textContent = mapShell.classList.contains("is-expanded") ? t("close") : t("expand");
  renderInfoPanels();
  renderSelectedEvent(state.visibleCards[state.selectedCardIndex]);
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
  panelBackdrop?.addEventListener("click", closeInfoPanel);
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-panel]")) {
      closeInfoPanel();
    }
  });
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
        closeInfoPanel({ keepEventsPressed: true });
        setTimeout(() => state.map?.resize(), 120);
        return;
      }
      openInfoPanel(nextView);
    });
  });
}

function openInfoPanel(view) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.hidden = !active;
    panel.setAttribute("aria-modal", String(active));
  });
  if (panelBackdrop) {
    panelBackdrop.hidden = false;
  }
  document.body.classList.add("has-info-panel");
}

function closeInfoPanel(options = {}) {
  state.activeView = "events";
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = true;
    panel.removeAttribute("aria-modal");
  });
  if (panelBackdrop) {
    panelBackdrop.hidden = true;
  }
  document.body.classList.remove("has-info-panel");
  if (!options.keepEventsPressed) {
    document.querySelectorAll("[data-view]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.view === "events"));
    });
  }
}

function setupQuickFilters() {
  document.querySelectorAll("[data-quick-filter]").forEach((button) => {
    const key = button.dataset.quickFilter;
    button.setAttribute("aria-checked", String(Boolean(state[key])));
    button.addEventListener("click", () => {
      state[key] = !state[key];
      localStorage.setItem(key === "activeOnly" ? "vpro_active_only" : "vpro_show_zbe", String(state[key]));
      button.setAttribute("aria-checked", String(state[key]));
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
  state.map.on("load", () => updateMap(filteredCards()));
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
  eventList.innerHTML = "";
  statusText.textContent = formatMessage("activeProfileLoading", { profile: profileLabel(state.profile) });

  try {
    const [events, impactZones, trafficEvents] = await Promise.all([
      fetchJson(`${API_BASE}/api/v1/events/?limit=8`),
      fetchJson(`${API_BASE}/api/v1/spatial/impact-zones?limit=120`),
      fetchJson(`${API_BASE}/api/v1/spatial/events-layer?limit=160&event_type=TRAFICO`),
    ]);
    if (requestId !== state.dashboardRequestId) {
      return;
    }
    state.events = normalizeEvents(events).slice(0, 6);
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

function renderCards(cards) {
  state.visibleCards = cards;
  eventList.innerHTML = "";
  if (cards.length === 0) {
    renderSelectedEvent(null);
    eventList.innerHTML = `<div class="empty-state">${escapeHtml(t("emptyEvents"))}</div>`;
    return;
  }
  cards.forEach((card, index) => eventList.appendChild(createEventCard(card, index)));
  selectCard(Math.min(state.selectedCardIndex, Math.max(cards.length - 1, 0)), { flyTo: false });
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
  const alternativeName = alternative?.name && alternative.name !== "Sin titulo"
    ? alternative.name
    : actionLabel || labelForPoi(alternative?.poi_type);
  const sourceText = formatMessage("sourceLine", {
    source: labelForSource(event.source),
    updated: formatUpdated(event.updated_at || event.created_at),
  });
  const alternativeSource = alternative
    ? formatMessage("alternativeSourceLine", { source: labelForSource(alternative.source) })
    : "";

  article.innerHTML = `
    <div class="source-strip">
      <span>${escapeHtml(sourceText)}</span>
      <span>${escapeHtml(event.source_id || "")}</span>
    </div>
    <div class="event-header">
      <div>
        <div class="event-type">
          <span>${labelForType(event.type)}</span>
          <span class="severity-badge">${t("severity")} ${event.severity}</span>
        </div>
        <h3>${escapeHtml(event.title)}</h3>
      </div>
      <span class="event-distance">${distance}</span>
    </div>
    <p class="event-description">${escapeHtml(trimText(event.description, 104))}</p>
    <div class="key-data">
      <span class="key-data-icon" aria-hidden="true">⌖</span>
      <p>
        <strong>${escapeHtml(alternativeName)}</strong>
        ${alternativeSource ? `<span>${escapeHtml(alternativeSource)}</span>` : ""}
        <span>${alternative ? `${distance} · ${places}` : t("noAlternative")}</span>
      </p>
    </div>
    <p class="route-note">${escapeHtml(t("routeDisclaimer"))}</p>
    <div class="card-actions">
      <button type="button" class="route-button">${t("route")}</button>
      <div class="feedback-group" aria-label="${t("feedbackGroupLabel")}">
        <button type="button" class="feedback-button" data-vote="1" aria-label="${t("useful")}">+</button>
        <button type="button" class="feedback-button" data-vote="-1" aria-label="${t("notUseful")}">-</button>
      </div>
    </div>
  `;

  article.addEventListener("click", (eventClick) => {
    if (!eventClick.target.closest("button,a")) {
      selectCard(index);
    }
  });
  article.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      selectCard(index);
    }
  });
  article.querySelector(".route-button").addEventListener("click", () => openRoute(alternative, event));
  article.querySelectorAll(".feedback-button").forEach((button) => {
    button.addEventListener("click", () => submitFeedback(button, card));
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
  const card = state.visibleCards[state.selectedCardIndex];
  renderSelectedEvent(card);
  if (options.flyTo !== false && state.map && card?.event?.center) {
    state.map.flyTo({ center: card.event.center, zoom: 14, essential: false });
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
  const alternativeName = alternative?.name && alternative.name !== "Sin titulo"
    ? alternative.name
    : labelForPoi(alternative?.poi_type);
  const adminUrl = citizenActionUrl(card.action);
  const adminLinkLabel = labelForActionLink(card.action);
  const adminLink = adminUrl
    ? `<a class="detail-link primary-admin-link" href="${adminUrl}" target="_blank" rel="noopener">${escapeHtml(adminLinkLabel)}</a>`
    : "";
  const severityClass = event.severity >= 4 ? " is-high" : "";

  selectedEventPanel.innerHTML = `
    <div class="detail-meta">
      <span class="detail-status${severityClass}">${t("activeStatus")} · ${t("severity")} ${event.severity}</span>
      <h2>${escapeHtml(event.title)}</h2>
      <p>${escapeHtml(trimText(event.description, 160))}</p>
    </div>
    <dl class="detail-list">
      <div>
        <dt>${t("locationLabel")}</dt>
        <dd>${escapeHtml(formatCoordinates(event.center))}</dd>
      </div>
      <div>
        <dt>${t("affectedAreaLabel")}</dt>
        <dd>${escapeHtml(formatMessage("affectedAreaValue", { meters: event.severity >= 4 ? 450 : 250 }))}</dd>
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
      <p><strong>${escapeHtml(alternativeName || t("noAlternative"))}</strong></p>
      <p>${alternative ? escapeHtml(`${distance} · ${places} · ${labelForPoi(alternative.poi_type)}`) : escapeHtml(t("noAlternative"))}</p>
      <p class="route-note">${escapeHtml(t("routeDisclaimer"))}</p>
    </section>
    <section class="detail-block">
      <h3>${t("adminActionTitle")}</h3>
      <p>${escapeHtml(actionLabel)}</p>
      ${adminLink}
    </section>
    <section class="detail-block">
      <h3>${t("feedbackQuestion")}</h3>
      <div class="detail-actions">
        <button type="button" class="route-button">${t("route")}</button>
        <div class="feedback-group" aria-label="${t("feedbackGroupLabel")}">
          <button type="button" class="feedback-button" data-vote="1" aria-label="${t("useful")}">+</button>
          <button type="button" class="feedback-button" data-vote="-1" aria-label="${t("notUseful")}">-</button>
        </div>
      </div>
    </section>
  `;

  selectedEventPanel.querySelector(".route-button").addEventListener("click", () => openRoute(alternative, event));
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

function renderEmpty(message) {
  eventList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  state.cards = [];
  state.visibleCards = [];
  state.selectedCardIndex = 0;
  renderSelectedEvent(null);
}

function renderInfoPanels() {
  const eventSourceCount = new Set(state.events.map((event) => event.source).filter(Boolean)).size;
  const alternativeTypes = new Set(
    state.cards.map((card) => card.alternative?.poi_type).filter(Boolean),
  ).size;

  sourcesPanel.innerHTML = `
    ${panelCloseButton()}
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
              ${sourceDatasets(source.id).map((dataset) => `<li>${escapeHtml(dataset)}</li>`).join("")}
            </ul>
          </div>
          <small>${t(source.kindKey)} · ${formatMessage("datasetCount", { count: source.datasetCount })}</small>
          <a href="${source.url}" target="_blank" rel="noopener">${t("openSourceLink")}</a>
        </article>
      `).join("")}
    </div>
    <section class="info-section">
      <h3>${t("derivedDataTitle")}</h3>
      <p class="info-copy">${t("derivedDataText")}</p>
    </section>
  `;

  methodologyPanel.innerHTML = `
    ${panelCloseButton()}
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
    <section class="info-section">
      <h3>${t("mapMethodTitle")}</h3>
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
    </section>
  `;

  additionalInfoPanel.innerHTML = `
    ${panelCloseButton()}
    <div class="panel-heading">
      <p class="eyebrow">${t("infoEyebrow")}</p>
      <h2>${t("infoTitle")}</h2>
      <p>${t("infoIntro")}</p>
    </div>
    <p class="info-copy">${t("projectPurpose")}</p>
    <div class="info-metrics">
      <div><strong>663</strong><span>${t("metricEvents")}</span></div>
      <div><strong>13.710</strong><span>${t("metricPois")}</span></div>
      <div><strong>20</strong><span>${t("metricNotices")}</span></div>
    </div>
    <section class="info-section">
      <h3>${t("limitationsTitle")}</h3>
      <ul class="limitation-list">
        <li>${t("limitation1")}</li>
        <li>${t("limitation2")}</li>
        <li>${t("limitation3")}</li>
      </ul>
    </section>
    <section class="info-section">
      <h3>${t("faqTitle")}</h3>
      <div class="faq-list">
        <article class="faq-item">
          <strong>${t("faqQ1")}</strong>
          <p>${t("faqA1")}</p>
        </article>
        <article class="faq-item">
          <strong>${t("faqQ2")}</strong>
          <p>${t("faqA2")}</p>
        </article>
        <article class="faq-item">
          <strong>${t("faqQ3")}</strong>
          <p>${t("faqA3")}</p>
        </article>
      </div>
    </section>
    <div class="info-links">
      <a href="${GITHUB_URL}" target="_blank" rel="noopener">${t("githubLink")}</a>
      <a href="${CONTEST_URL}" target="_blank" rel="noopener">${t("contestLink")}</a>
    </div>
  `;
}

function panelCloseButton() {
  return `<button type="button" class="panel-close" data-close-panel aria-label="${escapeHtml(t("closePanel"))}">${escapeHtml(t("closePanel"))}</button>`;
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
  setGeoJsonSource("impact-zones", featureCollection(state.impactZones.map(impactZoneFeature)));
  setGeoJsonSource("traffic-lines", featureCollection(state.trafficEvents.map(eventGeometryFeature).filter(Boolean)));
  setGeoJsonSource("event-points", featureCollection(cards.map(({ event }) => eventPointFeature(event)).filter(Boolean)));
  setGeoJsonSource(
    "alternative-points",
    featureCollection(cards.map(({ alternative }) => alternativeFeature(alternative)).filter(Boolean)),
  );
  applyLayerVisibility();

  const selectedCenter = cards[state.selectedCardIndex]?.event?.center || cards[0]?.event?.center;
  if (selectedCenter) {
    state.map.flyTo({ center: selectedCenter, zoom: 13.4, essential: false });
  }
}

function ensureMapLayers() {
  if (state.map.getSource("event-points")) {
    return;
  }

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
      "fill-opacity": 0.18,
    },
  });
  state.map.addLayer({
    id: "impact-zones-line",
    type: "line",
    source: "impact-zones",
    paint: {
      "line-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", "#c57b13"],
      "line-width": 1.5,
    },
  });
  state.map.addLayer({
    id: "traffic-realtime",
    type: "line",
    source: "traffic-lines",
    paint: {
      "line-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", [">=", ["get", "severity"], 3], "#c57b13", "#057a55"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 15, 5],
      "line-opacity": 0.76,
    },
  });
  state.map.addLayer({
    id: "event-points",
    type: "circle",
    source: "event-points",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 15, 9],
      "circle-color": ["case", [">=", ["get", "severity"], 4], "#c7362f", "#057a55"],
      "circle-stroke-color": "#fffffb",
      "circle-stroke-width": 2,
    },
  });
  state.map.addLayer({
    id: "alternative-points",
    type: "circle",
    source: "alternative-points",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 15, 7],
      "circle-color": "#6551a8",
      "circle-stroke-color": "#fffffb",
      "circle-stroke-width": 2,
    },
  });
  setupMapInteractions();
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
  return popupHtml(properties.title || labelForType(properties.type), [
    `${labelForType(properties.type)} · ${t("severity")} ${properties.severity}`,
    t("popupEventHint"),
  ]);
}

function popupForAlternativePoint(properties) {
  const accessible = properties.accessible === true || properties.accessible === "true";
  return popupHtml(properties.name || labelForPoi(properties.poi_type), [
    labelForPoi(properties.poi_type),
    accessible ? t("popupAccessible") : t("popupAlternativeHint"),
  ]);
}

function popupForImpactZone(properties) {
  return popupHtml(t("legendImpact"), [
    `${labelForType(properties.event_type)} · ${t("severity")} ${properties.severity}`,
    formatMessage("popupImpactRadius", { meters: Math.round(Number(properties.buffer_distance || 0)) }),
  ]);
}

function popupForTrafficLine(properties) {
  return popupHtml(t("legendTraffic"), [
    `${labelForType(properties.type)} · ${t("severity")} ${properties.severity}`,
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

function openRoute(alternative, event) {
  const coords = alternative?.geometry?.coordinates || event.center || DEFAULT_CENTER;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`, "_blank", "noopener");
}

async function submitFeedback(button, card) {
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

function labelForSource(source) {
  return state.messages.sources?.[source] || state.messages.sources?.DEFAULT || source || "";
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

function formatCoordinates(center) {
  if (!Array.isArray(center) || center.length !== 2) {
    return t("unknownLocation");
  }
  return `${center[1].toFixed(5)}, ${center[0].toFixed(5)}`;
}

function languageFromNavigator() {
  return navigator.language?.toLowerCase().startsWith("ca") ? "val" : "es";
}

function defaultApiBase() {
  return window.location.port === "3000" ? "http://localhost:8000" : window.location.origin;
}
