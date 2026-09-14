// Base URLs default to in-cluster service DNS in the roboshop-dev namespace.
// Override any of these (e.g. via port-forward to localhost) when running outside the cluster.
const CATALOGUE_URL = process.env.CATALOGUE_URL || 'http://catalogue.roboshop-dev.svc.cluster.local:8080';
const CART_URL = process.env.CART_URL || 'http://cart.roboshop-dev.svc.cluster.local:8080';
const USER_URL = process.env.USER_URL || 'http://user.roboshop-dev.svc.cluster.local:8080';
const SHIPPING_URL = process.env.SHIPPING_URL || 'http://shipping.roboshop-dev.svc.cluster.local:8080';
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://payment.roboshop-dev.svc.cluster.local:8080';

async function request(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = text;
    }
    return { status: res.status, body: parsed };
}

const getJSON = (url) => request('GET', url);
const postJSON = (url, body) => request('POST', url, body ?? {});
const deleteReq = (url) => request('DELETE', url);

// Every test run uses its own id namespace so concurrent/repeated runs never collide
// on the same cart or user record in the shared roboshop-dev environment.
function uniqueId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Services retry their DB/broker connections on a loop after a fresh deploy, so a
// health check can briefly report false. Poll until the given predicate passes.
async function waitUntilHealthy(url, isHealthy, timeoutMs = 30000, intervalMs = 2000) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
        last = await getJSON(url);
        if (last.status === 200 && isHealthy(last.body)) {
            return last;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`${url} did not become healthy within ${timeoutMs}ms. Last response: ${JSON.stringify(last)}`);
}

// Picks a real product from catalogue rather than hardcoding a sku, so tests keep
// working regardless of which seed data is loaded into this environment's MongoDB.
async function getAnyProduct() {
    const { status, body } = await getJSON(`${CATALOGUE_URL}/products`);
    if (status !== 200 || !Array.isArray(body) || body.length === 0) {
        throw new Error(`No products available from catalogue at ${CATALOGUE_URL} — cannot run cart/shipping/checkout flows`);
    }
    return body[0];
}

// A cart isn't "valid" for payment until it has a real item plus a SHIP line, so
// every checkout-style test builds one the same way: add a real product, then confirm shipping.
async function buildCartWithShipping(cartId) {
    const product = await getAnyProduct();
    const added = await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);
    if (added.status !== 200) {
        throw new Error(`Failed to add product ${product.sku} to cart ${cartId}: ${JSON.stringify(added)}`);
    }

    const shippingBody = { distance: 100, cost: 5, location: 'Test City' };
    const confirmed = await postJSON(`${SHIPPING_URL}/confirm/${cartId}`, shippingBody);
    if (confirmed.status !== 200) {
        throw new Error(`Failed to confirm shipping for cart ${cartId}: ${JSON.stringify(confirmed)}`);
    }

    return confirmed.body;
}

module.exports = {
    CATALOGUE_URL,
    CART_URL,
    USER_URL,
    SHIPPING_URL,
    PAYMENT_URL,
    getJSON,
    postJSON,
    deleteReq,
    uniqueId,
    waitUntilHealthy,
    getAnyProduct,
    buildCartWithShipping,
};