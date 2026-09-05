import cron from "node-cron";
import { runStorageCleanupWorker } from "./cleanup.worker.js";

/**
 * Inicializa o agendador (Cron) de limpeza automática de arquivos no Supabase Storage.
 */
export function initStorageCleanupCron(): void {
  // Executa todo dia às 03:00 da madrugada no horário do servidor
  const CRON_SCHEDULE = "0 3 * * *";

  console.log(`[Storage Cleanup Cron] ⏰ Agendador registrado para rodar diariamente às 03:00 AM (${CRON_SCHEDULE}).`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("[Storage Cleanup Cron] 🔔 Despertador disparado! Acionando worker de limpeza...");
    await runStorageCleanupWorker(14); // 14 dias de retenção
  });

  // Executa uma verificação rápida 10 segundos após o servidor iniciar
  setTimeout(() => {
    console.log("[Storage Cleanup Cron] 🚀 Executando verificação de inicialização...");
    runStorageCleanupWorker(14).catch(() => {});
  }, 10000);
}
