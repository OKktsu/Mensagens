type GroupCallBannerProps = {
  callType: "audio" | "video";
  participantCount: number;
  initiatorName: string;
  onJoin: () => void;
};

export function GroupCallBanner({
  callType,
  participantCount,
  initiatorName,
  onJoin,
}: GroupCallBannerProps) {
  const isVideo = callType === "video";

  return (
    <div className="group-call-banner" role="alert">
      <div className="banner-left flex items-center gap-3">
        <span className="banner-pulse-dot" />
        <span className="banner-icon flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-purple-400">
            {isVideo ? "videocam" : "call"}
          </span>
        </span>
        <div className="banner-text">
          <strong>Chamada de {isVideo ? "vídeo" : "voz"} em andamento</strong>
          <span>
            Iniciada por {initiatorName} • {participantCount} participante{participantCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="banner-join-btn"
        onClick={onJoin}
        aria-label="Entrar na chamada em grupo"
      >
        <span>Entrar</span>
      </button>
    </div>
  );
}
