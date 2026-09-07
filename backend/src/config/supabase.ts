import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://wfypudlegwvqtpknvsxt.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  "sb_secret_b918TeQ6HsACGKH0FSgy0w_qOHiZ7qJ";
export const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || "chat-uploads";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("[Supabase] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Garante que o bucket privado 'chat-uploads' existe no Supabase Storage.
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("[Supabase Storage] Erro ao listar buckets:", listError.message);
      return;
    }

    const existing = buckets?.find((b: { name: string; public: boolean }) => b.name === STORAGE_BUCKET);
    if (!existing) {
      console.log(`[Supabase Storage] Criando bucket privado '${STORAGE_BUCKET}'...`);
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false, // Bucket 100% privado com Signed URLs
        fileSizeLimit: 25 * 1024 * 1024, // Limite de 25MB
      });

      if (createError) {
        console.error("[Supabase Storage] Erro ao criar bucket:", createError.message);
      } else {
        console.log(`[Supabase Storage] Bucket privado '${STORAGE_BUCKET}' criado com sucesso!`);
      }
    } else {
      console.log(`[Supabase Storage] Bucket '${STORAGE_BUCKET}' pronto para uso (Privado: ${!existing.public}).`);
    }
  } catch (err) {
    console.error("[Supabase Storage] Falha ao inicializar storage:", err);
  }
}

/**
 * Faz o upload de um arquivo direto da memória RAM para o Supabase Storage.
 */
export async function uploadToStorage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getSupabaseClient();
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const cleanName = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60);
  const filePath = `${uniqueSuffix}-${cleanName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(`Falha no upload para o Supabase Storage: ${error?.message || "Erro desconhecido"}`);
  }

  // Gera URL assinada de 2 horas (7200 segundos) para retorno imediato
  const signedUrl = await createSignedMediaUrl(data.path, 7200);

  return {
    path: data.path,
    signedUrl,
  };
}

// Cache em memória para URLs assinadas (evita requisições HTTP repetitivas ao Supabase)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Gera uma URL assinada (Signed URL) com token temporário para acesso seguro.
 */
export async function createSignedMediaUrl(
  path: string,
  expiresInSeconds = 7200,
): Promise<string> {
  if (!path) return "";

  let cleanPath = path;

  // Se for uma URL do Supabase Storage antiga/expirada, extrai o filePath para gerar uma nova assinatura
  const supabaseMatch = cleanPath.match(/(?:chat-uploads|\/storage\/v1\/object\/(?:sign|public)\/[^/]+)\/(.+?)(?:\?|$)/);
  if (supabaseMatch && supabaseMatch[1]) {
    cleanPath = decodeURIComponent(supabaseMatch[1]);
  } else if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://") || cleanPath.startsWith("blob:")) {
    // Se for link externo de outro domínio, retorna direto
    return cleanPath;
  }

  // Remove qualquer prefixo residual como '/uploads/' ou 'chat-uploads/'
  cleanPath = cleanPath
    .replace(/^\/uploads\//, "")
    .replace(/^chat-uploads\//, "")
    .split("?")[0];

  // ⚡ Cache Hit: Se já temos URL válida em memória, retorna instantaneamente em 0ms
  const now = Date.now();
  const cached = signedUrlCache.get(cleanPath);
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[Supabase Storage] Não foi possível gerar Signed URL para '${cleanPath}':`, error?.message);
      return path;
    }

    // Armazena no cache (com margem de 5 minutos antes de expirar)
    signedUrlCache.set(cleanPath, {
      url: data.signedUrl,
      expiresAt: now + (expiresInSeconds - 300) * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.error("[Supabase Storage] Erro ao assinar URL:", err);
    return path;
  }
}

/**
 * Remove múltiplos arquivos do Supabase Storage.
 */
export async function deleteFromStorage(paths: string[]): Promise<void> {
  if (!paths || paths.length === 0) return;
  try {
    const supabase = getSupabaseClient();
    const cleanPaths = paths.map((p) =>
      p.replace(/^\/uploads\//, "").replace(/^chat-uploads\//, ""),
    );
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(cleanPaths);
    if (error) {
      console.error("[Supabase Storage] Erro ao deletar arquivos:", error.message);
    }
  } catch (err) {
    console.error("[Supabase Storage] Falha ao deletar arquivos:", err);
  }
}
