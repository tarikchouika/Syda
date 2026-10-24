/**
 * Syda store — order endpoint (Pages Function).
 * Reconstructed to match the live behaviour exactly:
 *   - validates cart + customer fields (EMPTY_CART / MISSING_FIELDS)
 *   - proxies to the Dukan storefront order API with the store Origin header
 *   - relays Dukan's response (status / orderId / paymentLink)
 */

const DUKAN_ORDERS_URL = "https://api.dukan.shop/api/orders";
const STORE_ORIGIN = "https://syda.dukan.shop";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json(400, { status: "error", message: "Invalid JSON body", code: "BAD_JSON" });
  }

  // --- validation (same codes/messages as the live endpoint) ---
  const items = Array.isArray(payload && payload.items) ? payload.items : [];
  if (!items.length) {
    return json(400, { status: "error", message: "Order must contain at least one item", code: "EMPTY_CART" });
  }
  const d = (payload && payload.deliveryInfo) || {};
  if (!d.name || !d.phone || !d.provinceId || !d.address) {
    return json(400, { status: "error", message: "Missing required customer fields (name, phone, provinceId, address)", code: "MISSING_FIELDS" });
  }

  // --- proxy to Dukan with the store origin (this is what authorises the order) ---
  let upstream;
  try {
    upstream = await fetch(DUKAN_ORDERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": STORE_ORIGIN,
        "Referer": STORE_ORIGIN + "/",
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json(502, { status: "error", message: "Could not reach the order service", code: "UPSTREAM_UNREACHABLE" });
  }

  let data;
  try {
    data = await upstream.json();
  } catch (e) {
    return json(502, { status: "error", message: "Unexpected response from the order service", code: "UPSTREAM_BAD_RESPONSE" });
  }

  // Relay Dukan's own status semantics.
  if (data && data.status === "success") {
    return json(200, data);
  }
  return json(502, {
    status: "error",
    message: String((data && data.message) != null ? data.message : "Order rejected"),
    code: "DUKAN_REJECTED",
    details: data,
  });
}

export async function onRequest() {
  return json(405, { status: "error", message: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
}
