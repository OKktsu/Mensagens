import { useEffect, useState } from "react";

const DB_NAME = "mensagens_media_cache";
const STORE_NAME = "media_blobs";

// Cache em memória durante a sessão ativa para resposta instantânea
const memoryBlobUrlMap = new Map<string, string>();

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não suportado"));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBlobFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setBlobToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignora erro de cota
  }
}

/**
 * Extrai uma chave estável de cache da URL (removendo tokens temporários).
 */
export function getStableCacheKey(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    return `cached_media_${parsed.pathname}`;
  } catch {
    return `cached_media_${url.split("?")[0]}`;
  }
}

/**
 * Obtém o arquivo do IndexedDB local ou faz o download da Signed URL e salva no IndexedDB.
 */
export async function getOrCacheMedia(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("blob:")) return url;

  const cacheKey = getStableCacheKey(url);

  // 1. Verifica na memória RAM da sessão
  if (memoryBlobUrlMap.has(cacheKey)) {
    return memoryBlobUrlMap.get(cacheKey)!;
  }

  try {
    // 2. Verifica no IndexedDB do navegador
    const cachedBlob = await getBlobFromIndexedDB(cacheKey);
    if (cachedBlob && cachedBlob instanceof Blob) {
      const objectUrl = URL.createObjectURL(cachedBlob);
      memoryBlobUrlMap.set(cacheKey, objectUrl);
      return objectUrl;
    }

    // 3. Não está no cache: Baixa via Signed URL
    const response = await fetch(url);
    if (!response.ok) {
      return url; // Retorna a URL original como fallback
    }

    const blob = await response.blob();
    // Salva no IndexedDB de forma assíncrona
    setBlobToIndexedDB(cacheKey, blob).catch(() => {});

    const objectUrl = URL.createObjectURL(blob);
    memoryBlobUrlMap.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn("[Media Cache] Erro ao carregar mídia em cache:", err);
    return url;
  }
}

/**
 * Hook React para carregar imagens e áudios com cache local automático no IndexedDB.
 */
export function useCachedMedia(rawUrl?: string | null): { mediaUrl: string; isLoading: boolean } {
  const [mediaUrl, setMediaUrl] = useState<string>(rawUrl || "");
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(rawUrl));

  useEffect(() => {
    if (!rawUrl) {
      setMediaUrl("");
      setIsLoading(false);
      return;
    }

    if (rawUrl.startsWith("blob:")) {
      setMediaUrl(rawUrl);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cacheKey = getStableCacheKey(rawUrl);

    // Se já estiver na memória da sessão, atualiza síncrono
    if (memoryBlobUrlMap.has(cacheKey)) {
      setMediaUrl(memoryBlobUrlMap.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getOrCacheMedia(rawUrl)
      .then((url) => {
        if (isMounted) {
          setMediaUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMediaUrl(rawUrl);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rawUrl]);

  return { mediaUrl, isLoading };
}
