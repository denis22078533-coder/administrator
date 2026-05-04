import { useState, useCallback } from "react";

const STORAGE_KEY = "lumen_github";

export interface GitHubSettings {
  token: string;
  repo: string;
  filePath: string;
  siteUrl: string;
  engineToken: string;
  engineRepo: string;
  engineBranch: string;
}

const DEFAULT: GitHubSettings = {
  token: "",
  repo: "denis22078533-coder/Lumin-platform",
  filePath: "index.html",
  siteUrl: "",
  engineToken: "",
  engineRepo: "",
  engineBranch: "main",
};

function load(): GitHubSettings {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT;
  } catch { return DEFAULT; }
}

export interface FetchResult {
  ok: boolean;
  html: string;
  sha: string;
  filePath: string;
  message?: string;
}

export function useGitHub() {
  const [ghSettings, setGhSettings] = useState<GitHubSettings>(load);

  const saveGhSettings = useCallback((s: GitHubSettings) => {
    setGhSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, []);

  const fetchFromGitHub = useCallback(async (): Promise<FetchResult> => {
    const { token, repo, filePath } = ghSettings;
    const path = (filePath || "index.html").trim().replace(/^\//, "");
    if (!token || !repo) return { ok: false, html: "", sha: "", filePath: path, message: "Нет токена или репозитория" };

    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=main`;
    try {
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { message?: string };
        return { ok: false, html: "", sha: "", filePath: path, message: `GitHub HTTP ${res.status}: ${errData.message || "неизвестная ошибка"}` };
      }
      const data = await res.json() as { content: string; sha: string };
      const b64 = data.content.replace(/\s/g, "");
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const decoded = new TextDecoder("utf-8").decode(bytes);
      return { ok: true, html: decoded, sha: data.sha, filePath: path };
    } catch (e) {
      return { ok: false, html: "", sha: "", filePath: path, message: String(e) };
    }
  }, [ghSettings]);

  const pushToGitHub = useCallback(async (
    html: string,
    sha: string,
    filePath: string
  ): Promise<{ ok: boolean; message: string }> => {
    const { token, repo } = ghSettings;
    if (!token) return { ok: false, message: "Введите GitHub Personal Token в настройках" };
    if (!repo) return { ok: false, message: "Введите путь к репозиторию" };

    const path = (filePath || "index.html").trim().replace(/^\//, "");
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    let actualSha = sha;
    try {
      const getRes = await fetch(`${apiUrl}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (getRes.ok) {
        const data = await getRes.json() as { sha: string };
        actualSha = data.sha;
      }
    } catch (_e) { /* новый файл */ }

    const utf8Bytes = new TextEncoder().encode(html);
    const b64Chunks: string[] = [];
    const chunkSize = 8192;
    for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
      b64Chunks.push(String.fromCharCode(...utf8Bytes.slice(i, i + chunkSize)));
    }
    const content = btoa(b64Chunks.join(""));

    const doPut = async (shaToUse: string) => {
      const reqBody: Record<string, string> = {
        message: `Lumen: правки в ${path}`,
        content,
        branch: "main",
      };
      if (shaToUse) reqBody.sha = shaToUse;
      const r = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });
      const d = await r.json().catch(() => ({})) as { message?: string };
      return { status: r.status, ok: r.ok, data: d };
    };

    let result = await doPut(actualSha);

    let attempts = 0;
    while (!result.ok && attempts < 3 && /sha|match|conflict/i.test(result.data.message || "")) {
      attempts++;
      try {
        const refresh = await fetch(`${apiUrl}?ref=main&_=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Cache-Control": "no-cache" },
        });
        if (refresh.ok) {
          const fresh = await refresh.json() as { sha: string };
          actualSha = fresh.sha;
          result = await doPut(actualSha);
        } else break;
      } catch (_e) { break; }
    }

    if (result.ok) {
      return { ok: true, message: `Файл ${path} обновлён в GitHub (HTTP ${result.status})` };
    } else {
      return { ok: false, message: result.data.message || `Ошибка GitHub: HTTP ${result.status}` };
    }
  }, [ghSettings]);

  // ── Engine Push — скачивает ZIP проекта из GitHub и пушит файлы напрямую ──
  const syncEngine = useCallback(async (
    onProgress?: (msg: string) => void
  ): Promise<{ ok: boolean; message: string }> => {
    const token = ghSettings.engineToken || ghSettings.token;
    const targetRepo = ghSettings.engineRepo;
    const branch = ghSettings.engineBranch || "main";

    if (!token) return { ok: false, message: "Укажите Engine GitHub Token в настройках" };
    if (!targetRepo) return { ok: false, message: "Укажите Engine Repository (например: user/moi-umniy-lumin)" };

    const sourceRepo = targetRepo;
    const sourceToken = token;

    // ── Шаг 1: скачиваем ZIP исходников напрямую из GitHub ───────────────────
    onProgress?.(`Скачиваю исходники из ${sourceRepo}...`);
    const zipApiUrl = `https://api.github.com/repos/${sourceRepo}/zipball/${branch}`;
    const zipRes = await fetch(zipApiUrl, {
      headers: { Authorization: `Bearer ${sourceToken}`, Accept: "application/vnd.github+json" },
    });
    if (!zipRes.ok) {
      const errData = await zipRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Не удалось скачать ZIP исходников (HTTP ${zipRes.status}): ${errData.message || ""}`);
    }
    const zipBuffer = await zipRes.arrayBuffer();
    const zipBytes = new Uint8Array(zipBuffer);

    // ── Шаг 2: распаковываем ZIP в браузере ──────────────────────────────────
    onProgress?.("Распаковываю архив...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZip = (window as any).JSZip;
    if (!JSZip) throw new Error("JSZip не загружен. Перезагрузите страницу и попробуйте снова.");

    const zip = await JSZip.loadAsync(zipBytes.buffer);

    const INCLUDE_DIRS = ["src/", "backend/", "db_migrations/", "public/"];
    const INCLUDE_ROOT = ["package.json", "vite.config.ts", "vite.config.js",
      "tailwind.config.ts", "tailwind.config.js", "tsconfig.json",
      "tsconfig.app.json", "tsconfig.node.json", "postcss.config.js",
      "postcss.config.cjs", "index.html"];
    const SKIP_DIRS = ["node_modules/", ".git/", "dist/", "build/", "__pycache__/"];
    const SKIP_EXT = [".pyc", ".pyo", ".log"];
    const MAX_SIZE = 400 * 1024;

    const filesToPush: { path: string; content_b64: string }[] = [];

    let stripPrefix = "";
    zip.forEach((relativePath: string) => {
      if (!stripPrefix && relativePath.includes("/")) {
        stripPrefix = relativePath.split("/")[0] + "/";
      }
    });

    const filePromises: Promise<void>[] = [];
    zip.forEach((relativePath: string, zipEntry: { dir: boolean; async: (t: string) => Promise<Uint8Array> }) => {
      if (zipEntry.dir) return;

      const cleanPath = stripPrefix ? relativePath.replace(stripPrefix, "") : relativePath;
      if (!cleanPath) return;

      if (SKIP_DIRS.some(d => cleanPath.includes(d))) return;

      const ext = cleanPath.slice(cleanPath.lastIndexOf(".")).toLowerCase();
      if (SKIP_EXT.includes(ext)) return;

      const isRootFile = INCLUDE_ROOT.includes(cleanPath);
      const isInDir = INCLUDE_DIRS.some(d => cleanPath.startsWith(d));
      if (!isRootFile && !isInDir) return;

      filePromises.push(
        zipEntry.async("uint8array").then((bytes: Uint8Array) => {
          if (bytes.length > MAX_SIZE) return;
          const chunks: string[] = [];
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            chunks.push(String.fromCharCode(...bytes.slice(i, i + chunkSize)));
          }
          filesToPush.push({ path: cleanPath, content_b64: btoa(chunks.join("")) });
        })
      );
    });

    await Promise.all(filePromises);

    if (filesToPush.length === 0) {
      throw new Error(`Не найдено файлов для выгрузки. Проверьте что в репозитории ${sourceRepo} есть папки src/, backend/`);
    }

    onProgress?.(`Найдено ${filesToPush.length} файлов. Выгружаю в ${targetRepo}...`);

    // ── Шаг 3: пушим файлы напрямую в GitHub через Contents API ─────────────
    let pushed = 0;
    const errors: string[] = [];

    for (let i = 0; i < filesToPush.length; i++) {
      const file = filesToPush[i];
      if (i % 5 === 0) {
        onProgress?.(`Выгружаю файлы: ${i + 1}/${filesToPush.length} — ${file.path}...`);
      }

      const fileApiUrl = `https://api.github.com/repos/${targetRepo}/contents/${file.path}`;

      // Получаем текущий SHA (если файл существует)
      let fileSha = "";
      try {
        const getRes = await fetch(`${fileApiUrl}?ref=${branch}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        });
        if (getRes.ok) {
          const data = await getRes.json() as { sha: string };
          fileSha = data.sha;
        }
      } catch (_e) { /* новый файл */ }

      const reqBody: Record<string, string> = {
        message: `Lumen sync: ${file.path}`,
        content: file.content_b64,
        branch,
      };
      if (fileSha) reqBody.sha = fileSha;

      try {
        const putRes = await fetch(fileApiUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reqBody),
        });
        if (putRes.ok) {
          pushed++;
        } else {
          const d = await putRes.json().catch(() => ({})) as { message?: string };
          errors.push(`${file.path}: ${d.message || `HTTP ${putRes.status}`}`);
        }
      } catch (e) {
        errors.push(`${file.path}: ${String(e)}`);
      }
    }

    const errNote = errors.length > 0
      ? `\n\n⚠️ Пропущено: ${errors.length} файлов.\nПервые ошибки:\n${errors.slice(0, 3).join("\n")}`
      : "";

    return {
      ok: pushed > 0,
      message: `✅ Выгружено ${pushed} из ${filesToPush.length} файлов в \`${targetRepo}\` (ветка \`${branch}\`)${errNote}`,
    };
  }, [ghSettings]);

  return { ghSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, syncEngine };
}
