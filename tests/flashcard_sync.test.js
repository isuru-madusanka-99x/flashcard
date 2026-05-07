const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
}

function loadApp(fetchImpl) {
    const html = fs.readFileSync("flahs_cards.html", "utf8");
    const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
    const elements = new Map();

    const document = {
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, {
                    id,
                    value: "",
                    innerText: "",
                    innerHTML: "",
                    style: { display: "" }
                });
            }
            return elements.get(id);
        }
    };

    const context = {
        document,
        fetch: fetchImpl,
        alert() {},
        console,
        setInterval() {},
        setTimeout,
        clearTimeout,
        setImmediate
    };

    vm.runInNewContext(script, context, { filename: "flahs_cards.html" });

    return {
        context,
        element: id => document.getElementById(id)
    };
}

test("queues overlapping cloud saves so older PUTs cannot overwrite newer card data", async () => {
    const putRequests = [];
    const fetchCalls = [];
    const fetchImpl = async (url, options = {}) => {
        fetchCalls.push({ url, options });

        if (options.method === "PUT") {
            const request = { url, options, deferred: deferred() };
            putRequests.push(request);
            return request.deferred.promise;
        }

        return {
            ok: true,
            json: async () => ({ record: [] })
        };
    };

    const app = loadApp(fetchImpl);
    await flushPromises();

    app.element("word").value = "alpha";
    app.element("meaning").value = "first";
    app.context.addCard();

    assert.equal(putRequests.length, 1);
    assert.deepEqual(JSON.parse(putRequests[0].options.body).map(card => card.word), ["alpha"]);

    app.element("word").value = "beta";
    app.element("meaning").value = "second";
    app.context.addCard();

    assert.equal(
        putRequests.length,
        1,
        "second save should wait for the in-flight PUT instead of racing it"
    );

    app.context.loadFromCloud();
    await flushPromises();
    assert.equal(
        fetchCalls.filter(call => call.url.includes("/latest")).length,
        1,
        "cloud reloads should not run while a local save is pending"
    );

    putRequests[0].deferred.resolve({ ok: true });
    await flushPromises();

    assert.equal(putRequests.length, 2);
    assert.deepEqual(
        JSON.parse(putRequests[1].options.body).map(card => card.word),
        ["alpha", "beta"]
    );

    putRequests[1].deferred.resolve({ ok: true });
    await flushPromises();

    assert.equal(app.element("syncStatus").innerText, "✅ Synced");
});
