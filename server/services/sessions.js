import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/default.js";
import { cookieNames, cookieOptions, sessionSeconds } from "../config/security.js";
import Session from "../modules/session/session.model.js";

const signingKey = (role) => (role === "admin" ? config.adminJwtSecret : config.jwtSecret);
const claimsOptions = { issuer: "coursehub", audience: "coursehub-api", algorithms: ["HS256"] };

export async function createSession(actorId, role) {
    const id = String(actorId);
    if (!/^[a-f0-9]{24}$/i.test(id) || !Object.hasOwn(sessionSeconds, role))
        throw new Error("Invalid session identity");
    const jti = randomUUID();
    const expiresIn = sessionSeconds[role];
    const token = jwt.sign({ sub: id, role }, signingKey(role), {
        algorithm: "HS256",
        issuer: claimsOptions.issuer,
        audience: claimsOptions.audience,
        jwtid: jti,
        expiresIn,
    });
    const session = await Session.create({
        _id: jti,
        actorId: id,
        role,
        csrfToken: randomBytes(32).toString("base64url"),
        expiresAt: new Date(jwt.decode(token).exp * 1000),
    });
    return { token, session };
}

export async function readSession(token, role) {
    let claims;
    try {
        claims = jwt.verify(token, signingKey(role), claimsOptions);
    } catch {
        return null;
    }
    if (
        claims.role !== role ||
        typeof claims.sub !== "string" ||
        !/^[a-f0-9]{24}$/i.test(claims.sub) ||
        typeof claims.jti !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(claims.jti) ||
        !Number.isInteger(claims.exp)
    )
        return null;
    // Database failures must propagate as request errors
    return Session.findOne({
        _id: claims.jti,
        actorId: claims.sub,
        role,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
    });
}

export function setSessionCookie(res, role, token) {
    res.cookie(cookieNames[role], token, {
        ...cookieOptions(),
        maxAge: sessionSeconds[role] * 1000,
    });
}
export function clearSessionCookie(res, role) {
    res.clearCookie(cookieNames[role], cookieOptions());
}
export async function revokeSession(session) {
    await Session.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
    );
}
