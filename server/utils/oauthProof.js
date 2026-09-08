import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const hashOAuthValue = (value) => createHash("sha256").update(value).digest("base64url");
export function createOAuthProof() {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(64).toString("base64url");
    return { state, verifier, challenge: hashOAuthValue(verifier) };
}
export function createLocalOAuthCallback(redirectUri, state, expiresAt = Date.now() + 600000) {
    const redirect = new URL(redirectUri);
    let consumed = false;
    return (callbackUrl) => {
        const url = new URL(callbackUrl);
        const supplied = url.searchParams.get("state");
        const code = url.searchParams.get("code");
        if (
            consumed ||
            Date.now() >= expiresAt ||
            url.origin !== redirect.origin ||
            url.pathname !== redirect.pathname ||
            url.searchParams.getAll("state").length !== 1 ||
            typeof supplied !== "string" ||
            !/^[\w-]{43}$/.test(supplied) ||
            !timingSafeEqual(Buffer.from(state), Buffer.from(supplied))
        )
            throw new Error("Callback could not be verified. Start sign-in again.");
        consumed = true;
        if (
            url.searchParams.has("error") ||
            url.searchParams.getAll("code").length !== 1 ||
            !code ||
            code.length > 2048
        )
            throw new Error("Sign-in was not completed. Start again.");
        return code;
    };
}
