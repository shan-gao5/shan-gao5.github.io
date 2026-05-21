import { Buffer } from "node:buffer";
import { marked } from "marked";
import { hasValidSession, readJson, sendJson } from "./_auth.js";

const BLOG_INDEX_PATH = "blog/index.json";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validatePost(input) {
  const title = String(input.title || "").trim();
  const date = String(input.date || "").trim();
  const section = String(input.section || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  const markdown = String(input.markdown || "").trim();

  if (!title || !date || !section || !slug || !markdown) {
    throw new Error("Title, date, section, slug, and Markdown are required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug can only contain lowercase letters, numbers, and hyphens.");
  }

  return { title, date, section, slug, markdown };
}

function postPage({ title, date, section, markdown }) {
  const body = marked.parse(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Shan Gao</title>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]],
        displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]]
      },
      svg: {
        fontCache: "global"
      }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
  <style>
    :root {
      color-scheme: light;
      --bg: #faf8f3;
      --text: #1d1b18;
      --muted: #5f5a52;
      --accent: #6b4f2a;
      --line: #ded8cc;
      --panel: #fffdf8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.65;
    }

    header,
    main,
    footer {
      max-width: 760px;
      margin: 0 auto;
      padding-right: 1.5rem;
      padding-left: 1.5rem;
    }

    header {
      padding-top: 2rem;
      padding-bottom: 1rem;
    }

    h1,
    h2,
    h3 {
      font-weight: 500;
      line-height: 1.2;
    }

    h1 {
      margin-bottom: 0.5rem;
      font-size: clamp(2.1rem, 7vw, 3.8rem);
      letter-spacing: -0.04em;
    }

    main {
      padding-top: 1rem;
      padding-bottom: 3rem;
    }

    a {
      color: var(--accent);
    }

    pre {
      overflow-x: auto;
      padding: 1rem;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
    }

    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }

    img {
      max-width: 100%;
    }

    .meta,
    footer {
      color: var(--muted);
      font-size: 0.95rem;
    }

    footer {
      padding-bottom: 2rem;
    }
  </style>
</head>
<body>
  <header>
    <a href="/blog.html">Blog</a>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(date)} · ${escapeHtml(section)}</div>
  </header>

  <main>
${body}
  </main>

  <footer>
    <a href="/index.html">Back to Shan Gao</a>
  </footer>
</body>
</html>
`;
}

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO must be configured.");
  }

  return { token, repo, branch };
}

async function githubRequest(path, options = {}) {
  const { token, repo } = getConfig();
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API request failed: ${message}`);
  }

  return response.json();
}

async function readRepositoryFile(path) {
  const { branch } = getConfig();
  const file = await githubRequest(`contents/${path}?ref=${encodeURIComponent(branch)}`);

  if (!file) {
    return { content: null, sha: null };
  }

  const content = Buffer.from(file.content, "base64").toString("utf8");
  return { content, sha: file.sha };
}

async function writeRepositoryFile(path, content, message, sha) {
  const { branch } = getConfig();
  const body = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  await githubRequest(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

async function updateBlogIndex(post) {
  const { content, sha } = await readRepositoryFile(BLOG_INDEX_PATH);
  const posts = content ? JSON.parse(content) : [];
  const metadata = {
    title: post.title,
    date: post.date,
    section: post.section,
    slug: post.slug,
    url: `blog/posts/${post.slug}.html`
  };
  const nextPosts = [
    metadata,
    ...posts.filter((existingPost) => existingPost.slug !== post.slug)
  ].sort((left, right) => right.date.localeCompare(left.date));

  await writeRepositoryFile(
    BLOG_INDEX_PATH,
    `${JSON.stringify(nextPosts, null, 2)}\n`,
    `Publish blog index for ${post.slug}`,
    sha
  );
}

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
    const path = `blog/posts/${post.slug}.html`;
    const { sha } = await readRepositoryFile(path);

    await writeRepositoryFile(path, postPage(post), `Publish blog post: ${post.title}`, sha);
    await updateBlogIndex(post);

    sendJson(res, 200, {
      ok: true,
      url: `/${path}`
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Could not publish post." });
  }
}
