import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function useLocalFs() {
  return process.env.USE_LOCAL_FS === "1";
}

function localRoot() {
  return process.env.LOCAL_FS_ROOT || process.cwd();
}

function localFilePath(repoPath) {
  return path.join(localRoot(), repoPath);
}

function contentSha(content) {
  return createHash("sha1").update(content).digest("hex");
}

export function getConfig() {
  if (useLocalFs()) {
    return {
      token: "local",
      repo: "local/local",
      branch: process.env.GITHUB_BRANCH || "main"
    };
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO must be configured.");
  }

  return { token, repo, branch };
}

export async function githubRequest(path, options = {}) {
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

export async function readRepositoryFile(repoPath) {
  if (useLocalFs()) {
    try {
      const content = await readFile(localFilePath(repoPath), "utf8");
      return { content, sha: contentSha(content) };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { content: null, sha: null };
      }

      throw error;
    }
  }

  const { branch } = getConfig();
  const file = await githubRequest(`contents/${repoPath}?ref=${encodeURIComponent(branch)}`);

  if (!file) {
    return { content: null, sha: null };
  }

  const content = Buffer.from(file.content, "base64").toString("utf8");
  return { content, sha: file.sha };
}

export async function writeRepositoryFile(repoPath, content, message, sha) {
  if (useLocalFs()) {
    const fullPath = localFilePath(repoPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
    return;
  }

  const { branch } = getConfig();
  const body = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  await githubRequest(`contents/${repoPath}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export async function deleteRepositoryFile(repoPath, message, sha) {
  if (useLocalFs()) {
    if (!sha) {
      return;
    }

    try {
      await unlink(localFilePath(repoPath));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return;
  }

  const { branch } = getConfig();

  if (!sha) {
    return;
  }

  await githubRequest(`contents/${repoPath}`, {
    method: "DELETE",
    body: JSON.stringify({
      message,
      sha,
      branch
    })
  });
}
