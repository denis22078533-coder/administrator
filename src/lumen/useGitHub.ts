import { useState, useCallback } from "react";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
  filePath: "/", 
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

export interface ProjectFile {
    path: string;
    content: string;
    sha?: string;
}

export interface FetchResult {
  ok: boolean;
  files: ProjectFile[];
  message?: string;
}

async function fetchGitHubAPI(url: string, method: string, token: string, body?: any): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    return fetch(url, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : null
    });
}

export function useGitHub(isAdminMode: boolean) {
  const [ghSettings, setGhSettings] = useState<GitHubSettings>(load);

  const saveGhSettings = useCallback((s: GitHubSettings) => {
    setGhSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, []);

  const fetchFromGitHub = useCallback(async (repoPath: string, branch: string = 'main'): Promise<FetchResult> => {
    const { token } = ghSettings;
    const repo = repoPath || ghSettings.repo;
    if (!token || !repo) {
      return { ok: false, files: [], message: "Нет токена или репозитория" };
    }

    const treeUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
    try {
        const treeRes = await fetchGitHubAPI(treeUrl, 'GET', token);
        if (!treeRes.ok) {
             const err = await treeRes.json().catch(() => ({}));
             if (treeRes.status === 404 || err.message?.includes("Git Repository is empty")) {
                 return { ok: true, files: [] };
             }
            throw new Error(`Не удалось получить дерево файлов: ${err.message || treeRes.statusText}`);
        }
        
        const treeData = await treeRes.json();
        const filesToFetch = treeData.tree.filter((item: any) => item.type === 'blob' && !item.path.startsWith('.git'));
        
        const fetchedFiles: ProjectFile[] = [];

        for (const file of filesToFetch) {
            const blobUrl = `https://api.github.com/repos/${repo}/git/blobs/${file.sha}`;
            const blobRes = await fetchGitHubAPI(blobUrl, 'GET', token);
            if (blobRes.ok) {
                const blobData = await blobRes.json();
                const content = atob(blobData.content);
                fetchedFiles.push({ path: file.path, content, sha: file.sha });
            } else {
                console.warn(`Не удалось загрузить файл ${file.path}`);
            }
        }

        return { ok: true, files: fetchedFiles };

    } catch (e: any) {
        return { ok: false, files: [], message: `Сетевая ошибка: ${e.message}` };
    }
  }, [ghSettings]);

  const pushToGitHub = useCallback(async (
    files: ProjectFile[],
    commitMessage: string
  ): Promise<{ ok: boolean; message: string }> => {

    const token = isAdminMode ? ghSettings.engineToken : ghSettings.token;
    const targetRepo = isAdminMode ? ghSettings.engineRepo : ghSettings.repo;

    if (!token || !targetRepo) {
      return { ok: false, message: "Токен или репозиторий не настроен" };
    }
    if (isAdminMode === false && targetRepo === ghSettings.engineRepo) {
        return { ok: false, message: "Ошибка: В пользовательском режиме нельзя записывать в репозиторий администратора." };
    }

    try {
        const refUrl = `https://api.github.com/repos/${targetRepo}/git/ref/heads/main`;
        const refRes = await fetchGitHubAPI(refUrl, 'GET', token);
        if (!refRes.ok) throw new Error("Не удалось получить SHA последнгего коммита.");
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        const commitUrl = `https://api.github.com/repos/${targetRepo}/git/commits/${latestCommitSha}`;
        const commitRes = await fetchGitHubAPI(commitUrl, 'GET', token);
        if (!commitRes.ok) throw new Error("Не удалось получить детали коммита.");
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        const tree = files.map(file => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            content: file.content,
        }));

        const createTreeUrl = `https://api.github.com/repos/${targetRepo}/git/trees`;
        const createTreeRes = await fetchGitHubAPI(createTreeUrl, 'POST', token, { tree, base_tree: baseTreeSha });
        if (!createTreeRes.ok) throw new Error("Не удалось создать новое дерево файлов.");
        const newTreeData = await createTreeRes.json();
        const newTreeSha = newTreeData.sha;

        const createCommitUrl = `https://api.github.com/repos/${targetRepo}/git/commits`;
        const createCommitRes = await fetchGitHubAPI(createCommitUrl, 'POST', token, {
            message: commitMessage,
            tree: newTreeSha,
            parents: [latestCommitSha],
        });
        if (!createCommitRes.ok) throw new Error("Не удалось создать новый коммит.");
        const newCommitData = await createCommitRes.json();
        const newCommitSha = newCommitData.sha;

        const updateRefUrl = `https://api.github.com/repos/${targetRepo}/git/refs/heads/main`;
        const updateRefRes = await fetchGitHubAPI(updateRefUrl, 'PATCH', token, { sha: newCommitSha });
        if (!updateRefRes.ok) throw new Error("Не удалось обновить ветку.");

        return { ok: true, message: `Проект успешно сохранен в ${targetRepo}` };

    } catch (e: any) {
        return { ok: false, message: `Ошибка GitHub: ${e.message}` };
    }
  }, [ghSettings, isAdminMode]);
  
  const downloadProjectAsZip = useCallback(async (files: ProjectFile[], projectName: string = 'project') => {
    const zip = new JSZip();
    
    files.forEach(file => {
        zip.file(file.path, file.content);
    });
    
    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${projectName}.zip`);
    } catch (error) {
        console.error("Ошибка при создании ZIP-архива:", error);
        alert('Не удалось создать ZIP-архив. Пожалуйста, проверьте консоль.');
    }
}, []);

  return { ghSettings, setGhSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, downloadProjectAsZip };
}
