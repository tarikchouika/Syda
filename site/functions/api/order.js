/**
 * Syda store — order endpoint (Pages Function).
 *
 * Full platform flow (reverse-engineered from syda.dukan.shop checkout):
 *   1. validates cart + customer fields (EMPTY_CART / MISSING_FIELDS)
 *   2. registers a "missed order" session via /api/missed-orders
 *      (REQUIRED — without a matching session the platform does not
 *       generate the prepayment paymentLink)
 *   3. submits the order via /api/orders with a sessionKey that ties it
 *      to the missed-order session
 *   4. relays the response; an order that was created (orderId present)
 *      is reported as success/created even when the payment link failed,
 *      so the storefront never tells the customer "failed" for an order
 *      that actually exists (prevents duplicate submissions).
 */

const DUKAN_ORDERS_URL = "https://api.dukan.shop/api/orders";
const DUKAN_MISSED_URL = "https://api.dukan.shop/api/missed-orders";
const STORE_ORIGIN = "https://syda.dukan.shop";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function upstreamHeaders(ua) {
  return {
    "Content-Type": "application/json",
    "Origin": STORE_ORIGIN,
    "Referer": STORE_ORIGIN + "/checkout",
    "User-Agent": ua || "Mozilla/5.0",
    "Accept": "application/json",
  };
}

function rid(len) {
  let s = "";
  const abc = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < (len || 9); i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
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

  // --- session identity (matches the platform checkout contract) ---
  const ua = request.headers.get("User-Agent") || "Mozilla/5.0";
  const meta = (payload.metadata = payload.metadata || {});
  const now = Date.now();
  const eventId = meta.eventId || (crypto.randomUUID ? crypto.randomUUID() : now + "-" + Math.random());
  const externalId = meta.externalId || (crypto.randomUUID ? crypto.randomUUID() : "ext-" + now);
  const sessionKey = "order_" + now + "_" + rid(9);
  meta.eventId = eventId;
  meta.eventTime = meta.eventTime || Math.floor(now / 1000);
  meta.externalId = externalId;
  meta.sessionKey = sessionKey;
  meta.missedOrderId = meta.missedOrderId != null ? meta.missedOrderId : null;
  meta.inlineCheckout = meta.inlineCheckout === true;
  meta.eventSourceUrl = meta.eventSourceUrl || STORE_ORIGIN + "/checkout";
  meta.consent = meta.consent || "granted";
  meta.userAgent = ua;

  // --- 1) register the missed-order session (enables payment links) ---
  const compactItems = items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity || 1,
    unitPrice: Number(it.unitPrice) || 0,
    subtotal: Number(it.subtotal) || 0,
  }));
  const missedBody = {
    phone: d.phone,
    name: d.name,
    items: compactItems,
    subtotal: Number(payload.subtotal) || 0,
    shippingFee: Math.max(0, (Number(payload.total) || 0) - (Number(payload.subtotal) || 0)),
    total: Number(payload.total) || 0,
    eventId: eventId,
    provinceId: d.provinceId,
    metadata: {
      eventId: eventId,
      eventTime: meta.eventTime,
      userAgent: ua,
      eventSourceUrl: meta.eventSourceUrl,
      externalId: externalId,
      consent: "granted",
    },
  };
  try {
    await fetch(DUKAN_MISSED_URL, {
      method: "POST",
      headers: upstreamHeaders(ua),
      body: JSON.stringify(missedBody),
    });
  } catch (e) {
    // Non-fatal: the order can still be created; payment link may be absent.
  }

  // --- 2) submit the order with the session key ---
  let upstream;
  try {
    upstream = await fetch(DUKAN_ORDERS_URL, {
      method: "POST",
      headers: upstreamHeaders(ua),
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
  if (data && data.status === "success" && data.orderId) {
    return json(200, data);
  }
  // Order was actually created (HTTP 201 + orderId) but something else failed
  // (e.g. payment link generation). Tell the storefront the order EXISTS.
  if (data && data.orderId) {
    return json(200, {
      status: "created",
      orderId: data.orderId,
      paymentLink: data.paymentLink || null,
      message: data.message != null ? String(data.message) : null,
    });
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
