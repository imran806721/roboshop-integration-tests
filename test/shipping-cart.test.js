// Verifies shipping's real HTTP call out to cart (CartHelper.addToCart -> POST /shipping/:id)
// and shipping's own MySQL-backed city/code lookups.
const {
    CART_URL,
    SHIPPING_URL,
    getJSON,
    postJSON,
    deleteReq,
    uniqueId,
    waitUntilHealthy,
    getAnyProduct,
} = require('./helpers');

const cartIds = [];

beforeAll(async () => {
    await waitUntilHealthy(`${SHIPPING_URL}/health`, (body) => body === 'OK');
});

afterAll(async () => {
    await Promise.all(cartIds.map((id) => deleteReq(`${CART_URL}/cart/${id}`)));
});

describe('shipping MySQL-backed lookups', () => {
    test('GET /codes returns country codes seeded in MySQL', async () => {
        const { status, body } = await getJSON(`${SHIPPING_URL}/codes`);
        expect(status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
    });

    test('GET /calc/:id returns a distance and cost for a real city', async () => {
        const { body: codes } = await getJSON(`${SHIPPING_URL}/codes`);
        if (!codes.length) {
            console.warn('No shipping codes seeded — skipping calc check');
            return;
        }
        const { body: cities } = await getJSON(`${SHIPPING_URL}/cities/${codes[0].code}`);
        if (!cities.length) {
            console.warn(`No cities for code ${codes[0].code} — skipping calc check`);
            return;
        }
        const { status, body } = await getJSON(`${SHIPPING_URL}/calc/${cities[0].uuid}`);
        expect(status).toBe(200);
        expect(typeof body.distance).toBe('number');
        expect(typeof body.cost).toBe('number');
    });
});

describe('POST /confirm/:id -> cart', () => {
    test('pushes a SHIP line item into an existing cart', async () => {
        const cartId = uniqueId('shipping-confirm');
        cartIds.push(cartId);

        const product = await getAnyProduct();
        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);

        const { status, body } = await postJSON(`${SHIPPING_URL}/confirm/${cartId}`, {
            distance: 250,
            cost: 12.5,
            location: 'Integration Test City',
        });

        expect(status).toBe(200);
        const shipItem = body.items.find((i) => i.sku === 'SHIP');
        expect(shipItem).toBeDefined();
        expect(shipItem.price).toBe(12.5);

        const cartNow = await getJSON(`${CART_URL}/cart/${cartId}`);
        expect(cartNow.body.items.find((i) => i.sku === 'SHIP').price).toBe(12.5);
    });

    test('returns 404 when the target cart does not exist', async () => {
        const cartId = uniqueId('shipping-confirm-missing-cart');

        const { status } = await postJSON(`${SHIPPING_URL}/confirm/${cartId}`, {
            distance: 100,
            cost: 5,
            location: 'Nowhere',
        });

        expect(status).toBe(404);
    });
});