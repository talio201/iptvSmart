import React, {useEffect, useMemo, useRef, useState} from "react";

// If your build doesn't already include Hls in the bundle, run:
// npm i hls.js
// and ensure it is available at runtime. We dynamic-import it below to avoid SSR issues.

/**
 * XtreamPlayer — Ultra-fast React player for Xtream content with manual quality control
 *
 * Features
 * - Works with Xtream Codes style URLs (live/movie/series)
 * - HLS with low-latency tuning via hls.js (auto + manual quality levels)
 * - Fallbacks for TS/MP4 when HLS is unavailable
 * - Keyboard shortcuts (Space, ←/→ 5s, ↑/↓ volume, M mute, F fullscreen, K play/pause)
 * - Picture-in-Picture, playback speed, time slider, buffered ranges display
 * - Resilient error handling + auto-recover
 *
 * Usage example:
 * <XtreamPlayer
 *   serverUrl="http://your-xtream-server:8080"
 *   username="user@example.com"
 *   password="yourpass"
 *   streamId={12345}
 *   contentType="live" // "live" | "movie" | "series"
 *   preferredContainers={["m3u8", "ts"]} // order of attempts
 *   posterUrl="/thumb.jpg"
 *   title="Canal Esportes HD"
 * />
 */

export type XtreamContentType = "live" | "movie" | "series";

export interface XtreamPlayerProps {
  serverUrl: string;          // e.g. http://host:port
  username: string;           // Xtream username (can be email)
  password: string;           // Xtream password
  streamId: number | string;  // numeric id for live/movie/series item
  contentType: XtreamContentType;
  preferredContainers?: Array<"m3u8" | "ts" | "mp4">;
  autoPlay?: boolean;
  muted?: boolean;
  title?: string;
  posterUrl?: string;
  className?: string;
  // Advanced HLS tuning (optional)
  hlsConfig?: Record<string, any>;
}

function buildXtreamUrl({
  serverUrl,
  username,
  password,
  streamId,
  contentType,
  container,
}: {
  serverUrl: string;
  username: string;
  password: string;
  streamId: string | number;
  contentType: XtreamContentType;
  container: "m3u8" | "ts" | "mp4";
}) {
  const base = serverUrl.replace(/\/$/, "");
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);
  let path = "";
  switch (contentType) {
    case "live":
      // common Xtream live patterns
      // m3u8: /live/u/p/id.m3u8, ts: /live/u/p/id.ts
      path = `/live/${u}/${p}/${streamId}.${container === "ts" ? "ts" : container}`;
      break;
    case "movie":
      path = `/movie/${u}/${p}/${streamId}.${container === "ts" ? "ts" : container}`;
      break;
    case "series":
      path = `/series/${u}/${p}/${streamId}.${container === "ts" ? "ts" : container}`;
      break;
    default:
      path = `/live/${u}/${p}/${streamId}.${container}`;
  }
  return `${base}${path}`;
}

function formatTime(secs: number) {
  if (!isFinite(secs)) return "00:00";
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  const m = Math.floor((secs / 60) % 60).toString().padStart(2, "0");
  const h = Math.floor(secs / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

const buttonBase =
  "px-3 py-2 rounded-2xl shadow-sm border text-sm hover:shadow transition active:scale-[.98]"

const barBase = "h-1.5 w-full rounded-full bg-white/20";

export default function XtreamPlayer(props: XtreamPlayerProps) {
  const {
    serverUrl,
    username,
    password,
    streamId,
    contentType,
    preferredContainers = ["m3u8", "ts", "mp4"],
    autoPlay = true,
    muted = false,
    title,
    posterUrl,
    className,
    hlsConfig,
  } = props;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(NaN);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [levels, setLevels] = useState<{index: number; height?: number; bitrate?: number; name?: string;}[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [usingNativeHls, setUsingNativeHls] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const candidateUrls = useMemo(() => {
    return preferredContainers.map((c) => ({
      container: c,
      url: buildXtreamUrl({
        serverUrl,
        username,
        password,
        streamId,
        contentType,
        container: c,
      }),
    }));
  }, [preferredContainers, serverUrl, username, password, streamId, contentType]);

  // Attempt sources in order until one works.
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      setErrorMsg(null);
      setLevels([]);
      setCurrentLevel(-1);
      setActiveUrl("");
      setUsingNativeHls(false);

      const video = videoRef.current!;
      if (!video) return;

      // Cleanup any previous instance
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }

      // If Safari/iOS supports native HLS
      const nativeHls = video.canPlayType('application/vnd.apple.mpegurl');

      for (const cand of candidateUrls) {
        if (cancelled) return;
        try {
          if (cand.container === "m3u8" && nativeHls) {
            setUsingNativeHls(true);
            video.src = cand.url;
            setActiveUrl(cand.url);
            await video.play().catch(() => {});
            attachBasicListeners();
            return;
          }

          if (cand.container === "m3u8") {
            const Hls = (await import("hls.js")).default;
            if (Hls.isSupported()) {
              const hls = new Hls({
                // Low-latency & speed-focused defaults; override via hlsConfig
                lowLatencyMode: true,
                enableWorker: true,
                backBufferLength: 30,
                maxBufferLength: 10,
                maxBufferSize: 60 * 1000 * 1000, // 60MB
                liveSyncDuration: 2,
                liveMaxLatencyDuration: 6,
                fragLoadingTimeOut: 15000,
                manifestLoadingTimeOut: 15000,
                ...hlsConfig,
              });
              hlsRef.current = hls;
              hls.attachMedia(video);
              hls.on((Hls as any).Events.MEDIA_ATTACHED, () => {
                hls.loadSource(cand.url);
              });

              hls.on((Hls as any).Events.MANIFEST_PARSED, (_e: any, data: any) => {
                const lvls = (hls.levels || []).map((lvl: any, index: number) => ({
                  index,
                  height: lvl.height,
                  bitrate: lvl.bitrate,
                  name: lvl.name,
                }));
                setLevels(lvls);
                setCurrentLevel(hls.currentLevel ?? -1);
                setActiveUrl(cand.url);
                if (autoPlay) video.play().catch(() => {});
              });

              hls.on((Hls as any).Events.LEVEL_SWITCHED, (_e: any, data: any) => {
                setCurrentLevel(data.level ?? -1);
              });

              // Robust error recovery
              hls.on((Hls as any).Events.ERROR, (_e: any, data: any) => {
                const fatal = data?.fatal;
                if (fatal) {
                  switch (data.type) {
                    case (Hls as any).ErrorTypes.NETWORK_ERROR:
                      hls.startLoad();
                      break;
                    case (Hls as any).ErrorTypes.MEDIA_ERROR:
                      hls.recoverMediaError();
                      break;
                    default:
                      try { hls.destroy(); } catch {}
                  }
                }
              });

              attachBasicListeners();
              return; // We stop after first successful setup attempt
            }
          }

          // Non-HLS fallback
          const canPlay = video.canPlayType(
            cand.container === "mp4" ? "video/mp4" : "video/mp2t"
          );
          if (canPlay) {
            video.src = cand.url;
            setActiveUrl(cand.url);
            attachBasicListeners();
            if (autoPlay) await video.play().catch(() => {});
            return;
          }
        } catch (err: any) {
          // Try next candidate
          setErrorMsg(err?.message || String(err));
        }
      }

      // If reached here, none worked
      setErrorMsg("Nenhum formato suportado foi reproduzido. Verifique o servidor/credenciais/ID.");
    }

    function attachBasicListeners() {
      const v = videoRef.current!;
      if (!v) return;
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onTime = () => {
        setCurrentTime(v.currentTime || 0);
        // Compute buffered end (last range end)
        const br = v.buffered;
        if (br && br.length) {
          const end = br.end(br.length - 1);
          setBufferedEnd(end);
        }
      };
      const onLoaded = () => setDuration(v.duration);
      const onVolume = () => {
        setVolume(v.volume);
        setIsMuted(v.muted);
      };
      const onError = () => setErrorMsg("Falha na reprodução. Tentando recuperar...");

      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("loadedmetadata", onLoaded);
      v.addEventListener("volumechange", onVolume);
      v.addEventListener("error", onError);

      // Cleanup for re-inits/unmount
      const cleanup = () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("loadedmetadata", onLoaded);
        v.removeEventListener("volumechange", onVolume);
        v.removeEventListener("error", onError);
      };
      // Store on element so we can call between attempts
      (v as any)._xtreamCleanup = cleanup;
    }

    setup();

    return () => {
      cancelled = true;
      const v = videoRef.current as any;
      if (v?._xtreamCleanup) v._xtreamCleanup();
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [candidateUrls, autoPlay, hlsConfig]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ": // space
        case "k":
          e.preventDefault();
          if (v.paused) v.play(); else v.pause();
          break;
        case "arrowleft":
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "arrowright":
          v.currentTime = v.currentTime + 5;
          break;
        case "arrowup":
          v.volume = Math.min(1, (v.volume || 0) + 0.05);
          break;
        case "arrowdown":
          v.volume = Math.max(0, (v.volume || 0) - 0.05);
          break;
        case "m":
          v.muted = !v.muted;
          break;
        case "f":
          toggleFullscreen();
          break;
        case "p":
          if (document.pictureInPictureEnabled && !v.disablePictureInPicture) {
            if (document.pictureInPictureElement) {
              (document as any).exitPictureInPicture?.();
            } else {
              v.requestPictureInPicture?.();
            }
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
  }

  function onVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }

  function toggleFullscreen() {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function onSelectLevel(levelIdx: number) {
    setCurrentLevel(levelIdx);
    if (hlsRef.current) {
      const hls = hlsRef.current;
      // Smooth, quick switching
      hls.currentLevel = levelIdx; // -1 auto
      hls.nextLevel = levelIdx;
    }
  }

  function onSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const rate = Number(e.target.value);
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
  }

  const qualityOptions = [
    { label: "Auto", value: -1 },
    ...levels
      .slice()
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
      .map(l => ({
        label: `${l.height ? `${l.height}p` : "Level"} ${l.bitrate ? `(${Math.round((l.bitrate||0)/1000)} kbps)` : ""}`,
        value: l.index,
      }))
  ];

  return (
    <div className={"w-full max-w-screen overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lg border border-white/10 " + (className||"") }>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="font-medium text-sm md:text-base truncate">
            {title || `Stream ${streamId}`} {usingNativeHls && <span className="ml-2 text-xs text-white/60">(HLS nativo)</span>}
          </div>
        </div>
        <div className="text-xs text-white/60 truncate max-w-[40%] hidden md:block">{activeUrl}</div>
      </div>

      {/* Video */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          playsInline
          preload="auto"
          controls={false}
          muted={isMuted}
          poster={posterUrl}
          crossOrigin="anonymous"
        />

        {/* Center play overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center text-white/90 hover:text-white transition opacity-0 hover:opacity-100"
          aria-label="Play/Pause"
        >
          <div className="backdrop-blur-sm bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
            {isPlaying ? "Pausar" : "Reproduzir"}
          </div>
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 pt-3 grid gap-3">
        {/* Seek bar */}
        <div className="flex items-center gap-3">
          <div className="text-xs tabular-nums w-14 text-white/70">{formatTime(currentTime)}</div>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={isFinite(duration) ? Math.max(duration, 0) : Math.max(currentTime + 1, 1)}
              step={0.1}
              value={currentTime}
              onChange={onSeek}
              className="w-full accent-white"
            />
            {/* Buffered indicator (under the range) */}
            {isFinite(duration) && (
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className={barBase}>
                  <div
                    className="h-1.5 rounded-full bg-white/40"
                    style={{ width: `${Math.min(100, (bufferedEnd / duration) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="text-xs tabular-nums w-14 text-right text-white/70">{isFinite(duration) ? formatTime(duration) : "AO VIVO"}</div>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={togglePlay} className={buttonBase}>
            {isPlaying ? "Pausar" : "Reproduzir"}
          </button>

          <button onClick={() => { const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, v.currentTime - 10); }} className={buttonBase}>
            -10s
          </button>
          <button onClick={() => { const v = videoRef.current; if (!v) return; v.currentTime = v.currentTime + 10; }} className={buttonBase}>
            +10s
          </button>

          <button onClick={toggleMute} className={buttonBase}>
            {isMuted ? "Som: Off" : "Som: On"}
          </button>

          <div className="flex items-center gap-2 ml-1">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={onVolumeChange}
              className="w-32 accent-white"
            />
            <span className="text-xs text-white/70 w-10">{Math.round(volume * 100)}%</span>
          </div>

          {/* Speed */}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-white/70">Velocidade</label>
            <select value={playbackRate} onChange={onSpeedChange} className="bg-white/10 border border-white/10 rounded-xl px-2 py-1 text-sm">
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => (
                <option key={r} value={r}>{r}x</option>
              ))}
            </select>
          </div>

          {/* Quality */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/70">Qualidade</label>
            <select
              value={currentLevel}
              onChange={(e) => onSelectLevel(Number(e.target.value))}
              className="bg-white/10 border border-white/10 rounded-xl px-2 py-1 text-sm"
              disabled={usingNativeHls || qualityOptions.length <= 1}
              title={usingNativeHls ? "Qualidade automática do player nativo" : "Selecionar qualidade"}
            >
              {qualityOptions.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>

          <button onClick={toggleFullscreen} className={buttonBase}>Tela cheia</button>
          <button onClick={() => { const v = videoRef.current; if (!v) return; if (document.pictureInPictureEnabled) v.requestPictureInPicture?.(); }} className={buttonBase}>PiP</button>
        </div>

        {/* Status line */}
        <div className="text-xs text-white/60 flex items-center justify-between">
          <div>
            {errorMsg ? <span className="text-red-300">{errorMsg}</span> : "Pronto"}
            {levels.length > 0 && !usingNativeHls && (
              <span className="ml-3">Níveis: {levels.map(l => `${l.height ?? "?"}p`).join(", ")}</span>
            )}
          </div>
          <div className="truncate max-w-[50%]">Fonte: {activeUrl || "(negociando...)"}</div>
        </div>
      </div>
    </div>
  );
}
