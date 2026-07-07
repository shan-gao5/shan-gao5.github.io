import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);

process.env.USE_LOCAL_FS = "1";
process.env.LOCAL_FS_ROOT = rootDir;
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "e2e-test-password";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "e2e-test-session-secret";

const apiRoutes = {
  "/api/login": () => import("../api/login.js"),
  "/api/publish": () => import("../api/publish.js"),
  "/api/post": () => import("../api/post.js"),
  "/api/delete": () => import("../api/delete.js")
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff"
};

function sendStatic(res, status, body, contentType) {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function handleApi(req, res, pathname) {
  const loadHandler = apiRoutes[pathname];

  if (!loadHandler) {
    sendStatic(res, 404, JSON.stringify({ error: "Not found." }), "application/json; charset=utf-8");
    return;
  }

  const { default: handler } = await loadHandler();
  const body = req.method === "POST" ? await readBody(req) : undefined;

  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body
  };

  const vercelRes = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload) {
      const headers = { ...this.headers };

      if (payload !== undefined && !headers["content-type"]) {
        headers["Content-Type"] = "application/json; charset=utf-8";
      }

      res.writeHead(this.statusCode, headers);
      res.end(payload);
    }
  };

  await handler(vercelReq, vercelRes);
}

async function handleStatic(req, res, pathname) {
  let filePath = pathname;

  if (filePath === "/") {
    filePath = "/index.html";
  }

  if (filePath === "/admin") {
    filePath = "/admin.html";
  }

  if (filePath === "/blog") {
    filePath = "/blog.html";
  }

  const relativePath = filePath.replace(/^\/+/, "");
  const absolutePath = path.join(rootDir, relativePath);

  if (!absolutePath.startsWith(rootDir)) {
    sendStatic(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const content = await readFile(absolutePath);
    const extension = path.extname(absolutePath);
    sendStatic(res, 200, content, mimeTypes[extension] || "application/octet-stream");
  } catch (error) {
    if (error.code === "ENOENT") {
      sendStatic(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }

    throw error;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }

    await handleStatic(req, res, url.pathname);
  } catch (error) {
    sendStatic(res, 500, error.message || "Server error", "text/plain; charset=utf-8");
  }
});

server.listen(port, () => {
  console.log(`E2E dev server running at http://127.0.0.1:${port}`);
});
