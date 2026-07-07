import { marked } from "marked";
import {
  deleteRepositoryFile,
  readRepositoryFile,
  writeRepositoryFile
} from "./_github.js";

export const BLOG_INDEX_PATH = "blog/index.json";

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function validatePost(input) {
  const title = String(input.title || "").trim();
  const date = String(input.date || "").trim();
  const section = String(input.section || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  const markdown = String(input.markdown || "").trim();
  const originalSlug = String(input.originalSlug || "").trim().toLowerCase() || null;

  if (!title || !date || !section || !slug || !markdown) {
    throw new Error("Title, date, section, slug, and Markdown are required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug can only contain lowercase letters, numbers, and hyphens.");
  }

  if (originalSlug && !/^[a-z0-9-]+$/.test(originalSlug)) {
    throw new Error("Original slug is invalid.");
  }

  return { title, date, section, slug, markdown, originalSlug };
}

export function postPaths(slug) {
  return {
    html: `blog/posts/${slug}.html`,
    markdown: `blog/posts/${slug}.md`
  };
}

export function postPage({ title, date, section, markdown }) {
  const body = marked.parse(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Shan Gao</title>
  <link rel="stylesheet" href="/styles/theme.css">
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
</head>
<body class="turbo-site post-page">
  <header>
    <a href="/blog.html">Blog</a>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(date)} · ${escapeHtml(section)}</div>
  </header>

  <main>
${body}
  </main>

  <footer class="turbo-footer">
    <a href="/index.html">Back to Shan Gao</a>
  </footer>
</body>
</html>
`;
}

export async function readBlogIndex() {
  const { content, sha } = await readRepositoryFile(BLOG_INDEX_PATH);
  return {
    posts: content ? JSON.parse(content) : [],
    sha
  };
}

export async function writeBlogIndex(posts, message, sha) {
  const sortedPosts = [...posts].sort((left, right) => right.date.localeCompare(left.date));

  await writeRepositoryFile(
    BLOG_INDEX_PATH,
    `${JSON.stringify(sortedPosts, null, 2)}\n`,
    message,
    sha
  );
}

export async function upsertBlogIndex(post) {
  const { posts, sha } = await readBlogIndex();
  const metadata = {
    title: post.title,
    date: post.date,
    section: post.section,
    slug: post.slug,
    url: `blog/posts/${post.slug}.html`
  };
  const nextPosts = [
    metadata,
    ...posts.filter((existingPost) => {
      if (existingPost.slug === post.slug) {
        return false;
      }

      if (post.originalSlug && existingPost.slug === post.originalSlug) {
        return false;
      }

      return true;
    })
  ];

  await writeBlogIndex(nextPosts, `Publish blog index for ${post.slug}`, sha);
}

export async function removeBlogPost(slug) {
  const { posts, sha } = await readBlogIndex();
  const nextPosts = posts.filter((post) => post.slug !== slug);
  await writeBlogIndex(nextPosts, `Remove blog post: ${slug}`, sha);
}

export async function deletePostFiles(slug) {
  const paths = postPaths(slug);
  const htmlFile = await readRepositoryFile(paths.html);
  const markdownFile = await readRepositoryFile(paths.markdown);

  await deleteRepositoryFile(paths.html, `Delete blog post HTML: ${slug}`, htmlFile.sha);
  await deleteRepositoryFile(paths.markdown, `Delete blog post Markdown: ${slug}`, markdownFile.sha);
}

export async function publishPost(post) {
  const paths = postPaths(post.slug);
  const htmlFile = await readRepositoryFile(paths.html);
  const markdownFile = await readRepositoryFile(paths.markdown);

  await writeRepositoryFile(
    paths.html,
    postPage(post),
    `Publish blog post: ${post.title}`,
    htmlFile.sha
  );
  await writeRepositoryFile(
    paths.markdown,
    `${post.markdown}\n`,
    `Publish blog post source: ${post.title}`,
    markdownFile.sha
  );

  if (post.originalSlug && post.originalSlug !== post.slug) {
    await deletePostFiles(post.originalSlug);
  }

  await upsertBlogIndex(post);
}
