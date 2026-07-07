import { hasValidSession, readJson, sendJson } from "./_auth.js";
import { publishPost, validatePost } from "./_blog.js";

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
    const post = validatePost(await readJson(req));
    await publishPost(post);

    sendJson(res, 200, {
      ok: true,
      url: `/blog/posts/${post.slug}.html`
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Could not publish post." });
  }
}
