export async function onRequestGet({ request }) {
  const upstream = new URL("/data/latest.json", request.url);
  upstream.searchParams.set("t", Date.now().toString());

  const response = await fetch(upstream.toString(), {
    headers: {
      accept: "application/json,text/plain,*/*"
    }
  });

  if (!response.ok) {
    return jsonResponse({ error: "latest_json_unavailable", status: response.status }, 502);
  }

  const body = await response.text();
  return new Response(body, {
    status: 200,
    headers: jsonHeaders()
  });
}

export async function onRequestOptions() {
  return new Response("", {
    status: 204,
    headers: jsonHeaders()
  });
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders()
  });
}

function jsonHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type, accept"
  };
}
