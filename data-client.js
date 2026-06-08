const DAA_DATA_FALLBACK_URLS = [
  "https://daa-web-cn-prod-sl78qrpz.edgeone.cool/data/latest.json",
  "https://tom200989.github.io/daa-web-https/data/latest.json",
  "https://raw.githubusercontent.com/tom200989/daa-web-https/main/data/latest.json",
  "https://cdn.jsdelivr.net/gh/tom200989/daa-web-https@main/data/latest.json",
  "https://ghfast.top/https://raw.githubusercontent.com/tom200989/daa-web-https/main/data/latest.json"
];
const DAA_DATA_CACHE_KEY = "daa.latest.payload.v1";
const DAA_DATA_FETCH_TIMEOUT_MS = 6000;

window.DaaDataClient = {
  loadLatest
};

async function loadLatest() {
  const network = await readNetworkPayload();
  if (network.payload) return network;

  const embedded = readEmbeddedPayload();
  if (embedded) return { payload: embedded, source: "embedded" };

  const local = readLocalPayload();
  if (local) return { payload: local, source: "local" };

  return { error: network.error || new Error("network_unavailable") };
}

async function readNetworkPayload() {
  const attempts = [];
  for (const url of latestUrls()) {
    try {
      const response = await fetchJsonWithTimeout(`${url}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      validatePayload(payload);
      writeLocalPayload(payload);
      return { payload, source: url, attempts };
    } catch (error) {
      attempts.push({ url, error: error?.message || String(error) });
    }
  }
  const error = new Error("all_data_sources_failed");
  error.attempts = attempts;
  return { error, attempts };
}

function latestUrls() {
  return Array.from(new Set([
    new URL("./data/latest.json", window.location.href).toString(),
    new URL("/data/latest.json", window.location.origin).toString(),
    ...DAA_DATA_FALLBACK_URLS
  ]));
}

function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), DAA_DATA_FETCH_TIMEOUT_MS);
  return fetch(url, {
    headers: { "Accept": "application/json,text/plain,*/*" },
    cache: "no-store",
    mode: "cors",
    signal: controller.signal
  }).finally(() => window.clearTimeout(timer));
}

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.recommendations)) {
    throw new Error("invalid_latest_payload");
  }
}

function readEmbeddedPayload() {
  const holder = document.getElementById("daa-latest-json");
  const text = holder?.textContent?.trim();
  if (!text) return null;
  try {
    const payload = JSON.parse(text);
    writeLocalPayload(payload);
    return payload;
  } catch (_) {
    return null;
  }
}

function writeLocalPayload(payload) {
  try {
    localStorage.setItem(DAA_DATA_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function readLocalPayload() {
  try {
    const text = localStorage.getItem(DAA_DATA_CACHE_KEY);
    return text ? JSON.parse(text) : null;
  } catch (_) {
    return null;
  }
}
