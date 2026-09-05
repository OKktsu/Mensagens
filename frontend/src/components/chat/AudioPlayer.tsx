import { useEffect, useRef, useState } from "react";

type AudioPlayerProps = {
  src: string;
  duration?: number | null;
};

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, duration: initialDuration }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.floor(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="audio-player-bubble">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        className="audio-play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pausar áudio" : "Tocar áudio"}
      >
        <span>{isPlaying ? "⏸" : "▶"}</span>
      </button>

      <div className="audio-scrubber-container">
        <input
          type="range"
          min={0}
          max={totalDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="audio-progress-bar"
          style={{ "--progress-percent": `${progress}%` } as React.CSSProperties}
        />

        <div className="audio-time-row">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
