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
  repo: "denis22078533-coder/muravey",
  filePath: "index.html",
  siteUrl: "",
  engineToken: "",
  engineRepo: "denis22078533-coder/administrator",
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

export function useGitHub(isAdminMode: boolean) {
  const [ghSettings, setGhSettings] = useState<GitHubSettings>(load);

  const saveGhSettings = useCallback((s: GitHubSettings) => {
    setGhSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, []);

  const privatePush = useCallback(async (
    html: string,
    initialSha: string,
    path: string,
    repo: string,
    token: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!token || !repo) {
      return { ok: false, message: "Токен или репозиторий не настроен" };
    }

    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    let currentSha = initialSha;

    try {
      const getRes = await fetch(`${apiUrl}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Cache-Control": "no-cache" },
      });
      if (getRes.ok) {
        currentSha = (await getRes.json()).sha;
      }
    } catch (e) { /* Файл не существует, будет создан новый */ }

    const content = btoa(new TextDecoder("utf-8").decode(new TextEncoder().encode(html)));

    const reqBody: { message: string; content: string; branch: string; sha?: string } = {
      message: `Lumen: правки в ${path}`,
      content,
      branch: "main",
    };
    if (currentSha) {
      reqBody.sha = currentSha;
    }

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      return { ok: true, message: `Файл ${path} успешно обновлен` };
    } else {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: `Ошибка GitHub: ${err.message || res.statusText}` };
    }
  }, []);


  const pushToGitHub = useCallback(async (
    html: string,
    sha: string,
    filePath: string
  ): Promise<{ ok: boolean; message: string }> => {
    
    if (isAdminMode) {
      // Режим АДМИНИСТРАТОРА: выгрузка в репозиторий платформы
      return privatePush(html, sha, filePath, ghSettings.engineRepo, ghSettings.engineToken);
    }

    // Режим ПОЛЬЗОВАТЕЛЯ: выгрузка в репозиторий пользователя
    // 1. Проверка безопасности: запрет записи в репозиторий администратора
    if (ghSettings.repo === ghSettings.engineRepo) {
      return { ok: false, message: "Ошибка: В пользовательском режиме нельзя записывать в репозиторий администратора." };
    }
    // 2. Путь всегда "index.html"
    const targetPath = "index.html";
    return privatePush(html, sha, targetPath, ghSettings.repo, ghSettings.token);

  }, [ghSettings, isAdminMode, privatePush]);


  const fetchFromGitHub = useCallback(async (): Promise<FetchResult> => {
    // "Загрузить" всегда читает index.html из репозитория ПОЛЬЗОВАТЕЛЯ (muravey)
    const { token, repo } = ghSettings;
    const path = "index.html"; 

    if (!token || !repo) {
      return { ok: false, html: "", sha: "", filePath: path, message: "Нет токена или репозитория" };
    }

    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=main`;
    try {
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Cache-Control": "no-cache" },
      });

      if (res.status === 404) {
        return { ok: true, html: "", sha: "", filePath: path, message: "Файл не найден. Начните с чистого листа." };
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, html: "", sha: "", filePath: path, message: `Ошибка GitHub: ${err.message || res.statusText}` };
      }

      const data = await res.json();
      const decoded = atob(data.content);
      
      return { ok: true, html: decoded, sha: data.sha, filePath: path };
    } catch (e: any) {
      return { ok: false, html: "", sha: "", filePath: path, message: `Сетевая ошибка: ${e.message}` };
    }
  }, [ghSettings]);

  
  const syncEngine = useCallback(async (
    onProgress?: (msg: string) => void
  ): Promise<{ ok: boolean; message: string }> => {
    const sourceToken = ghSettings.engineToken;
    const sourceRepo = ghSettings.engineRepo;
    const targetToken = ghSettings.token;
    const targetRepo = ghSettings.repo;
    const branch = ghSettings.engineBranch || 'main';

    if (!sourceToken || !sourceRepo || !targetToken || !targetRepo) {
      return { ok: false, message: "Не все токены и репозитории настроены для синхронизации" };
    }

    onProgress?.("Получение списка файлов из репозитория администратора...");
    const headers = { Authorization: `Bearer ${sourceToken}`, Accept: "application/vnd.github+json" };

    try {
      const treeRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/trees/${branch}?recursive=1`, { headers });
      if (!treeRes.ok) throw new Error(`Не удалось получить дерево файлов: ${treeRes.statusText}`);
      
      const treeData = await treeRes.json();
      const files = treeData.tree.filter((item: any) => item.type === 'blob' && !item.path.startsWith('.git'));

      onProgress?.(`Найдено ${files.length} файлов. Начало синхронизации...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(`(${i + 1}/${files.length}) Загрузка ${file.path}...`);
        
        const blobRes = await fetch(`https://api.github.com/repos/${sourceRepo}/git/blobs/${file.sha}`, { headers });
        if (!blobRes.ok) throw new Error(`Не удалось загрузить файл ${file.path}`);
        
        const blobData = await blobRes.json();
        const decodedContent = atob(blobData.content);

        onProgress?.(`(${i + 1}/${files.length}) Сохранение ${file.path} в репозиторий пользователя...`);
        const pushResult = await privatePush(decodedContent, "", file.path, targetRepo, targetToken);

        if (!pushResult.ok) {
          throw new Error(`Не удалось сохранить ${file.path}: ${pushResult.message}`);
        }
      }
      const finalMessage = `Синхронизация успешно завершена. ${files.length} файлов обновлено.`;
      onProgress?.(finalMessage);
      return { ok: true, message: finalMessage };
    } catch (e: any) {
      onProgress?.(`Ошибка синхронизации: ${e.message}`);
      return { ok: false, message: e.message };
    }
  }, [ghSettings, privatePush]);


  return { ghSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, syncEngine };
}
