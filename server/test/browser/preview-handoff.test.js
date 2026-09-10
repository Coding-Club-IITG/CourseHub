import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { fileAccessFixture, fileIds } from "./support/file-access.js";

let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());

for (const width of [1440, 390]) {
    test(`native preview links navigate with keyboard/touch and no Window API at ${width}px`, async (t) => {
        const { page, context, frontend, api, requests } = await fileAccessFixture(browser, t, {
            width,
            touch: width === 390,
        });
        await page.addInitScript(() => {
            window.open = () => {
                throw new Error("Preview must use native link navigation");
            };
        });
        await context.route("**/api/files/preview/**", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            await route.fulfill({
                contentType: "text/html",
                body: "<!doctype html><title>Preview ready</title><p>Preview ready</p>",
            });
        });
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
        const link = page.getByRole("link", { name: "Preview Lecture notes.pdf", exact: true });
        assert.equal(
            await link.getAttribute("href"),
            `${api}/api/files/preview/${fileIds.file}?courseCode=CS101`,
        );
        const opened = page.waitForEvent("popup");
        if (width === 390) await link.tap();
        else {
            await link.focus();
            await link.press("Enter");
        }
        const popup = await opened;
        await popup.waitForLoadState();
        assert.equal(await popup.title(), "Preview ready");
        assert.equal(await popup.evaluate(() => window.opener), null);
        assert.equal(
            requests.some((request) => request.path.startsWith("/api/files/link/")),
            false,
        );
        assert.equal(await page.locator('[data-tone="error"]').count(), 0);
    });
}

test("preview crosses a real HTTP redirect without touching the destination window", async (t) => {
    const { page, context, frontend, api } = await fileAccessFixture(browser, t);
    const delivery = createServer((request, response) => {
        if (request.url === "/redirect") {
            response.writeHead(302, { location: "/document" });
            response.end();
            return;
        }
        response.writeHead(200, {
            "Content-Type": "text/html",
            "Cross-Origin-Opener-Policy": "same-origin",
        });
        response.end("<!doctype html><title>Delivered preview</title><p>Delivered preview</p>");
    });
    await new Promise((resolve) => delivery.listen(0, "127.0.0.1", resolve));
    t.after(
        () =>
            new Promise((resolve) => {
                delivery.close(resolve);
                delivery.closeAllConnections();
            }),
    );
    const destination = `http://127.0.0.1:${delivery.address().port}`;
    assert.notEqual(new URL(frontend).origin, new URL(api).origin);
    assert.notEqual(new URL(frontend).origin, destination);
    let cookie;
    await context.route("**/api/files/preview/**", async (route) => {
        cookie = (await route.request().allHeaders()).cookie;
        await route.fulfill({ status: 302, headers: { location: destination + "/redirect" } });
    });
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    const opened = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Preview Lecture notes.pdf", exact: true }).click();
    const popup = await opened;
    await popup.waitForURL(destination + "/document");
    await popup.waitForLoadState();
    assert.equal(await popup.title(), "Delivered preview");
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    assert.match(cookie, /token=synthetic/);
    assert.equal(await page.locator('[data-tone="error"]').count(), 0);
});
