// End-to-end checkout: user -> cart -> shipping -> payment, with payment's own
// calls back out to user (/check, /order) and cart (DELETE /cart/:id).
// Per team decision, payment's external PAYMENT_GATEWAY call and its RabbitMQ publish
// are treated as implementation details — we only assert on the HTTP contract:
// a 200 + orderid from /pay, the cart being gone afterward, and (for registered
// users) the order landing in /history.
const {
    CART_URL,
    USER_URL,
    PAYMENT_URL,
    getJSON,
    postJSON,
    deleteReq,
    uniqueId,
    waitUntilHealthy,
    buildCartWithShipping,
    getAnyProduct,
} = require('./helpers');

beforeAll(async () => {
    await waitUntilHealthy(`${USER_URL}/health`, (body) => body.mongo === true);
    await waitUntilHealthy(`${PAYMENT_URL}/health`, (body) => body === 'OK');
});

describe('registered user checkout', () => {
    const name = uniqueId('checkout-user');
    const password = 'p@ssw0rd';

    beforeAll(async () => {
        const registered = await postJSON(`${USER_URL}/register`, { name, password, email: `${name}@example.com` });
        expect(registered.status).toBe(200);
    });

    test('login succeeds against the just-registered user', async () => {
        const { status, body } = await postJSON(`${USER_URL}/login`, { name, password });
        expect(status).toBe(200);
        expect(body.name).toBe(name);
    });

    test('pay deletes the cart and records order history against the user', async () => {
        const cart = await buildCartWithShipping(name);

        const paid = await postJSON(`${PAYMENT_URL}/pay/${name}`, cart);
        expect(paid.status).toBe(200);
        expect(paid.body.orderid).toBeDefined();

        const cartAfter = await getJSON(`${CART_URL}/cart/${name}`);
        expect(cartAfter.status).toBe(404);

        const history = await getJSON(`${USER_URL}/history/${name}`);
        expect(history.status).toBe(200);
        const orders = history.body.history.map((h) => h.orderid);
        expect(orders).toContain(paid.body.orderid);
    });
});

describe('anonymous checkout', () => {
    test('pay succeeds for an id with no user record and skips order history', async () => {
        const anonId = uniqueId('checkout-anon');
        const cart = await buildCartWithShipping(anonId);

        const userCheck = await getJSON(`${USER_URL}/check/${anonId}`);
        expect(userCheck.status).toBe(404);

        const paid = await postJSON(`${PAYMENT_URL}/pay/${anonId}`, cart);
        expect(paid.status).toBe(200);
        expect(paid.body.orderid).toBeDefined();

        const cartAfter = await getJSON(`${CART_URL}/cart/${anonId}`);
        expect(cartAfter.status).toBe(404);
    });
});

describe('payment validation', () => {
    test('rejects a cart with no shipping line as not valid', async () => {
        const cartId = uniqueId('checkout-noship');
        const product = await getAnyProduct();
        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);
        const cart = (await getJSON(`${CART_URL}/cart/${cartId}`)).body;

        const { status, body } = await postJSON(`${PAYMENT_URL}/pay/${cartId}`, cart);

        expect(status).toBe(400);
        expect(body).toMatch(/cart not valid/i);

        await deleteReq(`${CART_URL}/cart/${cartId}`);
    });
});