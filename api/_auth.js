import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "shan_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.SESSION_SECRET;
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionCookie() {
  const secret = getSecret();

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `admin.${expires}`;
  const signature = sign(payload, secret);
  const secure = process.env.VERCEL ? "; Secure" : "";

  return `${SESSION_COOKIE}=${payload}.${signature}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function hasValidSession(req) {
  const secret = getSecret();

  if (!secret) {
    return false;
  }

  const cookies = Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([name, value]) => name && value)
  );
  const session = cookies[SESSION_COOKIE];

  if (!session) {
    return false;
  }

  const [role, expires, signature] = session.split(".");
  if (role !== "admin" || !expires || !signature || Number(expires) < Date.now()) {
    return false;
  }

  return safeEqual(signature, sign(`${role}.${expires}`, secret));
}

export async function readJson(req) {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
