const API_BASE = localStorage.getItem("vpro_api_base") || defaultApiBase();
const DEFAULT_CENTER = [-0.3763, 39.4699];

const state = {
  profile: localStorage.getItem("vpro_profile") || "PMR",
  language: localStorage.getItem("vpro_language") || languageFromNavigator(),
  messages: {},
  events: [],
  cards: [],
  impactZones: [],
  trafficEvents: [],
  map: null,
  sessionToken: getSessionToken(),
};

const eventList = document.querySelector("#eventList");
const statusText = document.querySelector("#statusText");
const toast = document.querySelector("#toast");
const mapShell = document.querySelector(".map-shell");
const toggleMap = document.querySelector("#toggleMap");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadMessages();
  applyTranslations();
  setupProfiles();
  setupLanguageSelector();
  setupMap();
  setupMapToggle();
  loadDashboard();
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
    button.textContent = profileLabel(button.dataset.profile);
  });
  toggleMap.textContent = mapShell.classList.contains("is-expanded") ? t("close") : t("expand");
}

function setupProfiles() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    const active = button.dataset.profile === state.profile;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      state.profile = button.dataset.profile;
      localStorage.setItem("vpro_profile", state.profile);
      document.querySelectorAll("[data-profile]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      loadDashboard();
    });
  });
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
      if (state.cards.length > 0) {
        state.events = normalizeEvents(state.events);
        state.cards = state.cards.map((card) => ({
          ...card,
          event: normalizeEvent(card.event),
          action: selectActionForProfile(card.event.mitigation_actions || [], state.profile),
        }));
        renderCards(state.cards);
        statusText.textContent = formatMessage("activeEvents", { count: state.cards.length });
      }
    });
  });
}

function setupMap() {
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
  state.map.on("load", () => updateMap(state.cards));
  state.map.on("error", (event) => {
    const message = event?.error?.message;
    if (message) {
      console.warn(`MapLibre: ${message}`);
    }
  });
}

function setupMapToggle() {
  toggleMap.addEventListener("click", () => {
    const expanded = mapShell.classList.toggle("is-expanded");
    toggleMap.textContent = expanded ? t("close") : t("expand");
    toggleMap.setAttribute("aria-expanded", String(expanded));
    setTimeout(() => state.map?.resize(), 190);
  });
}

async function loadDashboard() {
  eventList.innerHTML = "";
  statusText.textContent = formatMessage("activeProfileLoading", { profile: profileLabel(state.profile) });

  try {
    const [events, impactZones, trafficEvents] = await Promise.all([
      fetchJson(`${API_BASE}/api/v1/events/?limit=8`),
      fetchJson(`${API_BASE}/api/v1/spatial/impact-zones?limit=120`),
      fetchJson(`${API_BASE}/api/v1/spatial/events-layer?limit=160&event_type=TRAFICO`),
    ]);
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
    renderCards(state.cards);
    updateMap(state.cards);
    statusText.textContent = formatMessage("activeEvents", { count: state.cards.length });
  } catch (error) {
    renderEmpty(t("apiError"));
    statusText.textContent = t("apiUnavailable");
    showToast(t("apiUnavailable"));
  }
}

async function buildCardModel(event) {
  const [lon, lat] = event.center || DEFAULT_CENTER;
  const params = new URLSearchParams({
    lon,
    lat,
    radius_meters: "5000",
    profile: state.profile,
    event_id: String(event.id),
  });
  const alternatives = await fetchJson(`${API_BASE}/api/v1/spatial/alternatives?${params}`);
  return {
    event,
    alternative: alternatives[0] || null,
    action: selectActionForProfile(event.mitigation_actions || [], state.profile),
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
  eventList.innerHTML = "";
  cards.forEach((card) => eventList.appendChild(createEventCard(card)));
}

function createEventCard(card) {
  const { event, alternative } = card;
  const article = document.createElement("article");
  article.className = "event-card";
  article.dataset.severity = String(event.severity);

  const distance = alternative?.distance_meters ? `${Math.round(alternative.distance_meters)} m` : t("near");
  const places = alternative?.extra_data?.numplazas
    ? formatMessage("places", { count: alternative.extra_data.numplazas })
    : t("dataAvailable");
  const actionLabel = labelForAction(card.action);
  const alternativeName = actionLabel || (alternative?.name && alternative.name !== "Sin titulo"
    ? alternative.name
    : labelForPoi(alternative?.poi_type));

  article.innerHTML = `
    <div class="event-header">
      <div>
        <div class="event-type">
          <span>${labelForType(event.type)}</span>
          <span class="severity-badge">${t("severity")} ${event.severity}</span>
        </div>
        <h2>${escapeHtml(event.title)}</h2>
      </div>
      <span class="event-distance">${distance}</span>
    </div>
    <p class="event-description">${escapeHtml(trimText(event.description, 104))}</p>
    <div class="key-data">
      <span class="key-data-icon" aria-hidden="true">⌖</span>
      <p>
        <strong>${escapeHtml(alternativeName)}</strong>
        <span>${alternative ? `${distance} · ${places}` : t("noAlternative")}</span>
      </p>
    </div>
    <div class="card-actions">
      <button type="button" class="route-button">${t("route")}</button>
      <div class="feedback-group" aria-label="${t("feedbackGroupLabel")}">
        <button type="button" class="feedback-button" data-vote="1" aria-label="${t("useful")}">+</button>
        <button type="button" class="feedback-button" data-vote="-1" aria-label="${t("notUseful")}">-</button>
      </div>
    </div>
  `;

  article.querySelector(".route-button").addEventListener("click", () => openRoute(alternative, event));
  article.querySelectorAll(".feedback-button").forEach((button) => {
    button.addEventListener("click", () => submitFeedback(button, card));
  });

  return article;
}

function renderEmpty(message) {
  eventList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
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

  if (cards[0]?.event?.center) {
    state.map.flyTo({ center: cards[0].event.center, zoom: 13.4, essential: false });
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
}

function setGeoJsonSource(sourceId, data) {
  const source = state.map.getSource(sourceId);
  if (source) {
    source.setData(data);
  }
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

function labelForAction(action) {
  if (!action) {
    return null;
  }
  return state.messages.actionTemplates?.[action.payload?.template_id] || action.title;
}

function profileLabel(profile) {
  return state.messages.profiles?.[profile] || profile;
}

function selectActionForProfile(actions, profile) {
  return actions.find((action) => action.payload?.profiles?.includes(profile))
    || actions.find((action) => action.payload?.profiles?.includes("GENERIC"))
    || actions[0]
    || null;
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

function languageFromNavigator() {
  return navigator.language?.toLowerCase().startsWith("ca") ? "val" : "es";
}

function defaultApiBase() {
  return window.location.port === "3000" ? "http://localhost:8000" : window.location.origin;
}
