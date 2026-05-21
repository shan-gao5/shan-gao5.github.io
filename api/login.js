import { createSessionCookie, readJson, sendJson } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    sendJson(res, 500, { error: "ADMIN_PASSWORD is not configured." });
    return;
  }

  try {
    const { password } = await readJson(req);

    if (password !== adminPassword) {
      sendJson(res, 401, { error: "Incorrect password." });
      return;
    }

    res.setHeader("Set-Cookie", createSessionCookie());
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, { error: "Could not read login request." });
  }
}
