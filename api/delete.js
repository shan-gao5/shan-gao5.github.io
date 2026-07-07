import { hasValidSession, readJson, sendJson } from "./_auth.js";
import { deletePostFiles, removeBlogPost } from "./_blog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!hasValidSession(req)) {
    sendJson(res, 401, { error: "You are not signed in." });
    return;
  }

  try {
    const { slug } = await readJson(req);
    const normalizedSlug = String(slug || "").trim().toLowerCase();

    if (!normalizedSlug || !/^[a-z0-9-]+$/.test(normalizedSlug)) {
      throw new Error("A valid slug is required.");
    }

    await deletePostFiles(normalizedSlug);
    await removeBlogPost(normalizedSlug);

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Could not delete post." });
  }
}
