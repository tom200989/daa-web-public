const DAA_DATA_FALLBACK_URL = "https://tom200989.github.io/daa-web-https/data/latest.json";
const DAA_DATA_CACHE_KEY = "daa.latest.payload.v1";

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
  let lastError;
  for (const url of latestUrls()) {
    try {
      const response = await fetchJsonWithTimeout(`${url}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      writeLocalPayload(payload);
      return { payload, source: url };
    } catch (error) {
      lastError = error;
    }
  }
  return { error: lastError };
}

function latestUrls() {
  return Array.from(new Set([
    new URL("./data/latest.json", window.location.href).toString(),
    new URL("/data/latest.json", window.location.origin).toString(),
    DAA_DATA_FALLBACK_URL
  ]));
}

function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  return fetch(url, {
    cache: "no-store",
    mode: "cors",
    signal: controller.signal
  }).finally(() => window.clearTimeout(timer));
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
