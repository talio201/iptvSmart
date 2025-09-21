import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import dashjs from "dashjs"; // ✅ Importando dash.js
import "./AdvancedVideoPlayer.css";

interface Stream {
  stream_id: number;
  name: string;
  direct_source?: string;
  stream_type: "live" | "movie" | "series";
  stream_icon?: string;
  category_id: number;
  category_ids: number[];
}

interface AdvancedVideoPlayerProps {
  stream: Stream;
  onNext?: () => void;
  onPrev?: () => void;
  onBack?: () => void;
  onShowChannelOverlay?: () => void;
  isOverlayActive?: boolean; // New prop
}

const BUFFER_SECONDS = 30;

const AdvancedVideoPlayer: React.FC<AdvancedVideoPlayerProps> = ({
  stream,
  onNext,
  onPrev,
  onBack,
  onShowChannelOverlay,
  isOverlayActive, // New prop
}) => {
  if (!stream) return <div>Carregando canal...</div>;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any | null>(null); // dash.js player instance
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bitrate, setBitrate] = useState<number | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("Auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(false);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) video.pause();
    else video.play().catch(err => console.error("Erro ao reproduzir:", err));

    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const loadStream = () => {
      const video = videoRef.current;
      if (!video) {
        console.error("Elemento de vídeo não encontrado.");
        return;
      }

      // Reset video
      video.pause();
      video.src = "";
      video.load();

      // Cleanup previous players
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }

      const streamUrl = stream.direct_source?.trim();
      if (!streamUrl) {
        console.error("Nenhuma fonte de vídeo válida para o canal atual.");
        return;
      }

      // Detect stream type
      const isHls = streamUrl.endsWith(".m3u8");
      const isDash = streamUrl.endsWith(".mpd");

      // Clear quality/bitrate states before loading
      setAvailableQualities([]);
      setCurrentQuality("Original");
      setBitrate(null);

      if (isHls && Hls.isSupported()) {
        // HLS
        const hls = new Hls({ maxBufferLength: BUFFER_SECONDS });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.loadSource(streamUrl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map(lvl => `${lvl.height}p`);
          setAvailableQualities(levels);
          setCurrentQuality("Auto");
          video.play().catch(err => console.error("Erro ao reproduzir HLS:", err));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const level = hls.levels[data.level];
          setBitrate(level?.bitrate ?? null);
          setCurrentQuality(level?.height ? `${level.height}p` : "Auto");
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("HLS error:", data);
        });

        video.onplay = () => setIsPlaying(true);
        video.onpause = () => setIsPlaying(false);

      } else if (isDash) {
        // DASH
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, streamUrl, true);
        dashRef.current = player;

        player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
          const tracks = player.getBitrateInfoListFor("video");
          const qualities = tracks.map((track: any) => {
            return track.height ? `${track.height}p` : `${track.bandwidth / 1000}kbps`;
          });
          setAvailableQualities(qualities);
          setCurrentQuality("Auto");
          video.play().catch(err => console.error("Erro ao reproduzir DASH:", err));
        });

        player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
          const track = player.getQualityFor("video") !== -1
            ? player.getBitrateInfoListFor("video")[player.getQualityFor("video")]
            : null;
          if (track) {
            setBitrate(track.bandwidth);
            setCurrentQuality(track.height ? `${track.height}p` : `${track.bandwidth / 1000}kbps`);
          }
        });

        video.onplay = () => setIsPlaying(true);
        video.onpause = () => setIsPlaying(false);

      } else {
        // Native video (MP4, WebM, etc.)
        video.src = streamUrl;
        video.load();

        video.onplay = () => setIsPlaying(true);
        video.onpause = () => setIsPlaying(false);
        video.play().catch(err => console.error("Erro ao reproduzir nativo:", err));
      }
    };

    loadStream();

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (dashRef.current) dashRef.current.reset();
    };
  }, [stream]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOverlayActive) return; // Ignore player controls if overlay is active

      if (event.key === "ArrowLeft") {
        onPrev?.();
      } else if (event.key === "ArrowRight") {
        onNext?.();
      } else if (event.key === "ArrowUp") {
        onShowChannelOverlay?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onPrev, onNext, onShowChannelOverlay, isOverlayActive]);

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const changeQuality = (quality: string) => {
    // HLS
    if (hlsRef.current) {
      if (quality === "Auto") {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIndex = hlsRef.current.levels.findIndex(
          lvl => `${lvl.height}p` === quality
        );
        if (levelIndex !== -1) hlsRef.current.currentLevel = levelIndex;
      }
      setCurrentQuality(quality);
      return;
    }

    // DASH
    if (dashRef.current) {
      if (quality === "Auto") {
        dashRef.current.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: true } } }
        });
      } else {
        const player = dashRef.current;
        const tracks = player.getBitrateInfoListFor("video");
        const selectedTrack = tracks.find((track: any) =>
          track.height ? `${track.height}p` === quality : `${track.bandwidth / 100000}kbps` === quality
        );
        if (selectedTrack) {
          player.setQualityFor("video", tracks.indexOf(selectedTrack));
          player.updateSettings({
            streaming: { abr: { autoSwitchBitrate: { video: false } } }
          });
        }
      }
      setCurrentQuality(quality);
    }
  };

  return (
    <div
      className={`video-container ${isFullscreen ? "fullscreen" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`video-overlay ${showControls ? 'visible' : 'hidden'}`}>
        <div className="video-info">
          <h2>{stream.name || "Canal desconhecido"}</h2>
          {bitrate && <span>{(bitrate / 1000).toFixed(0)} kbps</span>}
          <span>{currentQuality}</span>
        </div>
        <div className="video-controls">
          <button onClick={onPrev}>⏮️</button>
          <button onClick={toggleFullscreen}>
            {isFullscreen ? " Sair Fullscreen" : " Fullscreen"}
          </button>
          <button onClick={onNext}>⏭️</button>
          <button onClick={handlePlayPause}>
            {isPlaying ? "❚❚ Pausar" : "▶ Reproduzir"}
          </button>
          {onBack && (
            <button onClick={onBack}>
              Voltar
            </button>
          )}
          {/* Quality selector only if available (HLS or DASH) */}
          {availableQualities.length > 0 && (
            <select
              value={currentQuality}
              onChange={(e) => changeQuality(e.target.value)}
            >
              <option value="Auto">Auto</option>
              {availableQualities.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <video
        key={stream.stream_id}
        ref={videoRef}
        className="video-player"
        controls={false}
        muted={false}
      />
    </div>
  );
};

export default AdvancedVideoPlayer;