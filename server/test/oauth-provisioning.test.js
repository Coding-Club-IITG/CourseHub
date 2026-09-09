import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import http from "node:http";
import { storageTokens } from "../services/tokenStore.js";
import dotenv from "dotenv";
import axios from "axios";
import { createOAuthProof, createLocalOAuthCallback, hashOAuthValue } from "../utils/oauthProof.js";
import { provisionOneDriveToken } from "../scripts/generateOneDriveToken.js";

test("local OAuth callbacks verify destination, expiration and state and can be consumed only once", () => {
    const proof = createOAuthProof();
    const redirect = "http://127.0.0.1:8080/callback";
    const callback = `${redirect}?state=${proof.state}&code=synthetic-code`;
    assert.equal(proof.challenge, hashOAuthValue(proof.verifier));
    assert.notEqual(createOAuthProof().state, proof.state);
    const consume = createLocalOAuthCallback(redirect, proof.state);
    for (const invalid of [
        callback.replace("127.0.0.1", "attacker.example"),
        callback.replace("/callback", "/wrong"),
        callback.replace(proof.state, "x".repeat(43)),
        callback + "&state=duplicate",
    ])
        assert.throws(() => consume(invalid), /could not be verified/);
    assert.equal(consume(callback), "synthetic-code");
    assert.throws(() => consume(callback), /could not be verified/);
    assert.throws(
        () => createLocalOAuthCallback(redirect, proof.state, 0)(callback),
        /could not be verified/,
    );
});

test("the OneDrive CLI exchanges PKCE through a loopback callback and saves tokens without printing them", async (t) => {
    t.mock.method(dotenv, "config", () => ({}));
    const prior = {
        secret: process.env.AZURE_CLIENT_SECRET,
        redirect: process.env.ONEDRIVE_REDIRECT_URI,
    };
    process.env.AZURE_CLIENT_SECRET = "synthetic-client-secret";
    process.env.ONEDRIVE_REDIRECT_URI = "http://127.0.0.1:0/callback";
    t.after(() => {
        for (const [key, value] of [
            ["AZURE_CLIENT_SECRET", prior.secret],
            ["ONEDRIVE_REDIRECT_URI", prior.redirect],
        ]) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    const messages = [],
        saved = [];
    t.mock.method(console, "log", (value) => messages.push(value));
    t.mock.method(storageTokens, "save", async (data) => saved.push(data));
    t.mock.method(axios, "post", async (url, data) => {
        const params = new URLSearchParams(data);
        const authorize = new URL(
            messages.find((message) => String(message).startsWith("https://")),
        );
        assert.equal(
            hashOAuthValue(params.get("code_verifier")),
            authorize.searchParams.get("code_challenge"),
        );
        assert.equal(params.get("code"), "test-code");
        return {
            data: {
                refresh_token: "synthetic-refresh-secret",
                access_token: "synthetic-access-secret",
            },
        };
    });
    let listener;
    const createServer = http.createServer;
    t.mock.method(http, "createServer", (...args) => {
        listener = createServer(...args);
        return listener;
    });
    const running = provisionOneDriveToken();
    await once(listener, "listening");
    assert.equal(listener.address().address, "127.0.0.1");
    const authorize = new URL(messages.find((message) => String(message).startsWith("https://")));
    const response = await fetch(
        `http://127.0.0.1:${listener.address().port}/callback?code=test-code&state=${authorize.searchParams.get("state")}`,
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /tokens saved/);
    await running;
    assert.deepEqual(saved, [
        { refresh_token: "synthetic-refresh-secret", access_token: "synthetic-access-secret" },
    ]);
    assert.doesNotMatch(
        messages.join("\n"),
        /synthetic-refresh-secret|synthetic-access-secret|synthetic-client-secret/,
    );
});
