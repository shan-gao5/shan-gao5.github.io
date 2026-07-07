import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";
const adminPassword = process.env.ADMIN_PASSWORD || "e2e-test-password";
const testSlug = "e2e-test-post";
const editedSlug = "e2e-test-post-edited";

function parseSetCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return "";
  }

  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return header.split(";")[0];
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, body };
}

async function cleanupTestArtifacts() {
  const { deletePostFiles, removeBlogPost } = await import("../api/_blog.js");

  for (const slug of [testSlug, editedSlug]) {
    try {
      await deletePostFiles(slug);
    } catch {
      // Ignore missing files during cleanup.
    }

    try {
      await removeBlogPost(slug);
    } catch {
      // Ignore missing index entries during cleanup.
    }
  }
}

async function run() {
  process.env.USE_LOCAL_FS = "1";
  process.env.LOCAL_FS_ROOT = rootDir;
  process.env.ADMIN_PASSWORD = adminPassword;
  process.env.SESSION_SECRET = "e2e-test-session-secret";

  await cleanupTestArtifacts();

  console.log("Checking static pages and theme...");
  const home = await request("/");
  assert.equal(home.response.status, 200);
  assert.match(home.body, /styles\/theme\.css/);
  assert.match(home.body, /turbo-menubar/);

  const theme = await request("/styles/theme.css");
  assert.equal(theme.response.status, 200);
  assert.match(theme.body, /Fixedsys Excelsior/);

  const blog = await request("/blog.html");
  assert.equal(blog.response.status, 200);
  assert.match(blog.body, /turbo-filters/);

  console.log("Checking admin login...");
  const badLogin = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password" })
  });
  assert.equal(badLogin.response.status, 401);

  const login = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: adminPassword })
  });
  assert.equal(login.response.status, 200);
  const cookie = parseSetCookie(login.response.headers.get("set-cookie"));
  assert.ok(cookie.includes("shan_admin_session"));

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: cookie
  };

  console.log("Publishing test post...");
  const publish = await request("/api/publish", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "E2E Test Post",
      date: "2026-07-06",
      section: "e2e",
      slug: testSlug,
      markdown: "# E2E Test\n\nCreated by automated test."
    })
  });
  assert.equal(publish.response.status, 200);
  assert.equal(publish.body.url, `/blog/posts/${testSlug}.html`);

  const markdownPath = path.join(rootDir, "blog/posts", `${testSlug}.md`);
  const htmlPath = path.join(rootDir, "blog/posts", `${testSlug}.html`);
  const indexPath = path.join(rootDir, "blog/index.json");
  const markdown = await readFile(markdownPath, "utf8");
  const html = await readFile(htmlPath, "utf8");
  const index = JSON.parse(await readFile(indexPath, "utf8"));

  assert.match(markdown, /Created by automated test/);
  assert.match(html, /styles\/theme\.css/);
  assert.ok(index.some((post) => post.slug === testSlug));

  const publishedPage = await request(`/blog/posts/${testSlug}.html`);
  assert.equal(publishedPage.response.status, 200);
  assert.match(publishedPage.body, /E2E Test Post/);
  assert.match(publishedPage.body, /post-page/);

  console.log("Loading post for edit...");
  const loadPost = await request(`/api/post?slug=${testSlug}`, {
    headers: { Cookie: cookie }
  });
  assert.equal(loadPost.response.status, 200);
  assert.equal(loadPost.body.slug, testSlug);
  assert.match(loadPost.body.markdown, /Created by automated test/);
  assert.equal(loadPost.body.hasSource, true);

  console.log("Saving edited post...");
  const saveEdit = await request("/api/publish", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      title: "E2E Test Post Edited",
      date: "2026-07-07",
      section: "e2e-edited",
      slug: editedSlug,
      markdown: "# E2E Test Edited\n\nUpdated by automated test.",
      originalSlug: testSlug
    })
  });
  assert.equal(saveEdit.response.status, 200);

  const oldHtmlExists = await readFile(path.join(rootDir, "blog/posts", `${testSlug}.html`), "utf8").then(
    () => true,
    () => false
  );
  assert.equal(oldHtmlExists, false);

  const editedHtml = await readFile(path.join(rootDir, "blog/posts", `${editedSlug}.html`), "utf8");
  assert.match(editedHtml, /E2E Test Post Edited/);

  const editedLoad = await request(`/api/post?slug=${editedSlug}`, {
    headers: { Cookie: cookie }
  });
  assert.equal(editedLoad.response.status, 200);
  assert.match(editedLoad.body.markdown, /Updated by automated test/);

  console.log("Deleting edited post...");
  const deletePost = await request("/api/delete", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ slug: editedSlug })
  });
  assert.equal(deletePost.response.status, 200);

  const deletedHtmlExists = await readFile(path.join(rootDir, "blog/posts", `${editedSlug}.html`), "utf8").then(
    () => true,
    () => false
  );
  const deletedMarkdownExists = await readFile(path.join(rootDir, "blog/posts", `${editedSlug}.md`), "utf8").then(
    () => true,
    () => false
  );
  const finalIndex = JSON.parse(await readFile(indexPath, "utf8"));

  assert.equal(deletedHtmlExists, false);
  assert.equal(deletedMarkdownExists, false);
  assert.ok(!finalIndex.some((post) => post.slug === editedSlug));

  console.log("Checking admin page UI...");
  const admin = await request("/admin.html");
  assert.equal(admin.response.status, 200);
  assert.match(admin.body, /Manage posts/);
  assert.match(admin.body, /edit-post/);
  assert.match(admin.body, /delete-post/);

  await cleanupTestArtifacts();

  console.log("All E2E checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
