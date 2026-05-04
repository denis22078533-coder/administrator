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

  const syncEngine = useCallback(async (
    onProgress?: (msg: string) => void
  ): Promise<{ ok: boolean; message: string }> => {
    // Используем engine-специфичные настройки, если они есть, иначе — основные
    const sourceToken = ghSettings.engineToken || ghSettings.token;
    const sourceRepo = ghSettings.engineRepo;
    const branch = ghSettings.engineBranch || 'main';

    if (!sourceToken) return { ok: false, message: 'Укажите Engine GitHub Token в настройках' };
    if (!sourceRepo) return { ok: false, message: 'Укажите Engine Repository (например: user/repo)' };

    const headers = {
      Authorization: `Bearer ${sourceToken}`,
      Accept: 'application/vnd.github+json',
    };

    try {
      // Шаг 1: Получаем SHA последнего коммита
      onProgress?.(`Получение данных ветки ${branch} из ${sourceRepo}...`);
      const refRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/ref/heads/${branch}`, { headers });
      if (!refRes.ok) throw new Error(`Ошибка получения ветки: ${refRes.statusText}`);
      const refData = await refRes.json();
      const commitSha = refData.object.sha;

      // Шаг 2: Получаем SHA дерева из коммита
      const commitRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/commits/${commitSha}`, { headers });
      if (!commitRes.ok) throw new Error(`Ошибка получения коммита: ${commitRes.statusText}`);
      const commitData = await commitRes.json();
      const treeSha = commitData.tree.sha;

      // Шаг 3: Получаем рекурсивное дерево файлов
      onProgress?.('Получение списка файлов из репозитория-источника...');
      const treeRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/trees/${treeSha}?recursive=1`, { headers });
      if (!treeRes.ok) throw new Error(`Ошибка получения дерева файлов: ${treeRes.statusText}`);
      const treeData = await treeRes.json();

      const files = treeData.tree.filter((item: any) => 
        item.type === 'blob' &&
        !item.path.startsWith('.git') &&
        !item.path.includes('node_modules')
      );
      
      onProgress?.(`Найдено ${files.length} файлов для синхронизации.`);
      
      // Шаг 4: Скачиваем каждый файл и пушим его в целевой репозиторий
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(`(${i + 1}/${files.length}) Синхронизация файла: ${file.path}...`);
        
        // Получаем контент файла в base64
        const blobRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/blobs/${file.sha}`, { headers });
        if (!blobRes.ok) {
          onProgress?.(`Пропуск файла ${file.path}: не удалось скачать (${blobRes.statusText})`);
          continue;
        }
        const blobData = await blobRes.json();
        
        // Декодируем контент из base64
        const decodedContent = atob(blobData.content);

        // Используем существующую функцию pushToGitHub для записи файла в основной репозиторий
        // Передаем пустой SHA, так как pushToGitHub сам определит нужный SHA для коммита
        const pushResult = await pushToGitHub(decodedContent, '', file.path);
        
        if (!pushResult.ok) {
          // Если возникла ошибка, можно ее обработать или прервать процесс
          onProgress?.(`Ошибка при записи файла ${file.path}: ${pushResult.message}`);
          // Можно раскомментировать, чтобы остановить при первой ошибке
          // throw new Error(`Failed to push file ${file.path}: ${pushResult.message}`);
        }
      }

      const message = `Синхронизация успешно завершена. Обработано ${files.length} файлов.`;
      onProgress?.(message);
      return { ok: true, message };

    } catch (e: any) {
      const message = `Ошибка синхронизации: ${e.message || String(e)}`;
      onProgress?.(message);
      console.error(e);
      return { ok: false, message };
    }
  }, [ghSettings, pushToGitHub]);


  return { ghSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, syncEngine };
}
