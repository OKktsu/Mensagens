import { getSupabaseClient, STORAGE_BUCKET } from "../config/supabase.js";

/**
 * Worker que executa o trabalho pesado de limpeza de arquivos antigos do Supabase Storage.
 * Retenção padrão: 14 dias.
 */
export async function runStorageCleanupWorker(retentionDays = 14): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  console.log(`[Storage Cleanup Worker] 🧹 Iniciando varredura de arquivos com mais de ${retentionDays} dias...`);
  const startTime = Date.now();

  try {
    const supabase = getSupabaseClient();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Lista arquivos do bucket (em lotes de até 100)
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "asc" },
      });

    if (listError) {
      console.error("[Storage Cleanup Worker] Erro ao listar arquivos do storage:", listError.message);
      return { success: false, deletedCount: 0, message: listError.message };
    }

    if (!files || files.length === 0) {
      console.log("[Storage Cleanup Worker] Nenhum arquivo encontrado no storage.");
      return { success: true, deletedCount: 0, message: "Storage vazio" };
    }

    // Filtra arquivos mais antigos que o cutoffDate
    const oldFiles = files.filter((file: { created_at?: string | null; name: string }) => {
      if (!file.created_at) return false;
      const fileDate = new Date(file.created_at);
      return fileDate < cutoffDate;
    });

    if (oldFiles.length === 0) {
      console.log(`[Storage Cleanup Worker] Nenhum arquivo com mais de ${retentionDays} dias encontrado.`);
      return { success: true, deletedCount: 0, message: "Nenhum arquivo expirado" };
    }

    const fileNamesToDelete = oldFiles.map((f: { name: string }) => f.name);
    console.log(
      `[Storage Cleanup Worker] Removendo ${fileNamesToDelete.length} arquivos expirados do Supabase Storage...`,
    );

    const { error: removeError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(fileNamesToDelete);

    if (removeError) {
      console.error("[Storage Cleanup Worker] Erro ao remover arquivos:", removeError.message);
      return { success: false, deletedCount: 0, message: removeError.message };
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const logMsg = `[Storage Cleanup Worker] ✅ Limpeza concluída em ${duration}s! ${fileNamesToDelete.length} arquivos removidos da nuvem com sucesso.`;
    console.log(logMsg);

    return {
      success: true,
      deletedCount: fileNamesToDelete.length,
      message: logMsg,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Storage Cleanup Worker] Falha fatal no worker de limpeza:", errorMsg);
    return {
      success: false,
      deletedCount: 0,
      message: errorMsg,
    };
  }
}
