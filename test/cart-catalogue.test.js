// Verifies cart's real HTTP call out to catalogue (cart/server.js getProduct()) —
// not cart's own logic in isolation, which catalogue-api-tests already covers.
const { CART_URL, getJSON, deleteReq, uniqueId, waitUntilHealthy, getAnyProduct } = require('./helpers');

let product;
const cartIds = [];

beforeAll(async () => {
    await waitUntilHealthy(`${CART_URL}/health`, (body) => body.redis === true);
    product = await getAnyProduct();
});

afterAll(async () => {
    await Promise.all(cartIds.map((id) => deleteReq(`${CART_URL}/cart/${id}`)));
});

test('adding a real sku pulls name and price from catalogue, not a stub', async () => {
    const cartId = uniqueId('cart-catalogue');
    cartIds.push(cartId);

    const { status, body } = await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/2`);

    expect(status).toBe(200);
    const item = body.items.find((i) => i.sku === product.sku);
    expect(item).toBeDefined();
    expect(item.name).toBe(product.name);
    expect(item.price).toBe(product.price);
    expect(item.subtotal).toBe(product.price * 2);
});

test('adding a sku catalogue does not have propagates as product not found', async () => {
    const cartId = uniqueId('cart-catalogue-missing');
    cartIds.push(cartId);

    const { status, body } = await getJSON(`${CART_URL}/add/${cartId}/NON-EXISTENT-SKU-${Date.now()}/1`);

    expect(status).toBe(404);
    expect(body).toMatch(/product not found/i);
});

test('GET /cart/:id reflects what add just persisted', async () => {
    const cartId = uniqueId('cart-catalogue-persist');
    cartIds.push(cartId);

    await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);
    const { status, body } = await getJSON(`${CART_URL}/cart/${cartId}`);

    expect(status).toBe(200);
    expect(body.items[0].sku).toBe(product.sku);
});