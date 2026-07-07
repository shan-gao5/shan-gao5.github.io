import { hasValidSession, sendJson } from "./_auth.js";
import { postPaths, readBlogIndex } from "./_blog.js";
import { readRepositoryFile } from "./_github.js";

function getSlug(req) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  return String(url.searchParams.get("slug") || "").trim().toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!hasValidSession(req)) {
    sendJson(res, 401, { error: "You are not signed in." });
    return;
  }

  const slug = getSlug(req);

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    sendJson(res, 400, { error: "A valid slug is required." });
    return;
  }

  try {
    const { posts } = await readBlogIndex();
    const metadata = posts.find((post) => post.slug === slug);

    if (!metadata) {
      sendJson(res, 404, { error: "Post not found." });
      return;
    }

    const { content: markdown } = await readRepositoryFile(postPaths(slug).markdown);
    const hasSource = Boolean(markdown);

    sendJson(res, 200, {
      title: metadata.title,
      date: metadata.date,
      section: metadata.section,
      slug: metadata.slug,
      markdown: markdown || "",
      hasSource
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Could not load post." });
  }
}
