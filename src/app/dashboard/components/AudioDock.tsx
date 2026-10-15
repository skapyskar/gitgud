"use client";

import { useId, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, CloudRain, Flame, Wind, Waves, Upload } from "lucide-react";
import { useAudioDock, AMB_KEYS, AMBIENCE, type AmbKey } from "./useAudioDock";

const AMB_ICON: Record<AmbKey, typeof CloudRain> = { rain: CloudRain, fire: Flame, wind: Wind, ocean: Waves };
const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export default function AudioDock() {
  const { state, toggleMusic, prevTrack, nextTrack, pickTrack, setMusicVol, toggleSnd, setSndVol, setAmbVol, uploadMusic, useDefaultPlaylist, seek } = useAudioDock();
  const track = state.tracks[state.track];
  const uploadInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const name = state.customName ? state.customName.replace(/\.mp3$/i, "") : track.name;

  return (
    <section aria-label="Focus audio" className="glass r-xl p-3.5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMusic}
          aria-label={state.playing ? "Pause music" : "Play music"}
          aria-busy={state.loading}
          className="grad-primary glow-shadow w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-105 active:scale-[0.96]"
        >
          {state.playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-bold truncate" title={name}>{name}</div>
          <div className="text-[10.5px] text-ink3 truncate" title={state.customName ? "Your MP3 · repeats" : track.artist}>
            {state.customName ? "Your MP3 · repeats" : track.artist}
          </div>
        </div>
        <button onClick={prevTrack} aria-label="Previous track" className="chip chip-hover r-md w-8 h-9 flex items-center justify-center text-ink2 shrink-0">
          <SkipBack className="w-3.5 h-3.5" fill="currentColor" />
        </button>
        <button onClick={nextTrack} aria-label="Next track" className="chip chip-hover r-md w-8 h-9 flex items-center justify-center text-ink2 shrink-0">
          <SkipForward className="w-3.5 h-3.5" fill="currentColor" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-ink3 tabular-nums">
        <span>{timeLabel(state.currentTime)}</span>
        <input type="range" aria-label="Song position" min={0} max={state.duration || 1} step={0.1}
          value={Math.min(state.currentTime, state.duration || 1)} disabled={!state.duration}
          onChange={(e) => seek(+e.target.value)} className="flex-1 min-w-0 h-1 accent-[var(--acc)] disabled:opacity-40" />
        <span>{timeLabel(state.duration || (state.customName ? 0 : track.end - track.start))}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <label htmlFor={`${id}-music`} className="text-[10px] font-bold tracking-wider text-ink3 w-[64px] shrink-0">MUSIC</label>
        <input id={`${id}-music`} type="range" min={0} max={100} value={state.musicVol}
          aria-label="Music volume" onChange={(e) => setMusicVol(+e.target.value)} className="flex-1 min-w-0 h-1 accent-[var(--acc)]" />
        <span className="text-[10px] tabular-nums text-ink3 w-8 text-right">{state.musicVol}%</span>
      </div>

      <label htmlFor={`${id}-track`} className="sr-only">Choose a song</label>
      <select id={`${id}-track`} aria-label="Choose a song" value={state.customName ? "custom" : state.track}
        onChange={(e) => pickTrack(+e.target.value)} className="chip r-md w-full min-w-0 px-2.5 py-2 text-[11px] text-ink">
        {state.customName && <option value="custom" disabled>{state.customName}</option>}
        {state.tracks.map((song, index) => <option key={song.src} value={index}>{`${String(index + 1).padStart(2, "0")}. ${song.name} — ${song.artist}`}</option>)}
      </select>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={uploadInput} type="file" accept=".mp3,audio/mpeg" className="hidden" aria-label="Upload your MP3"
          onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void uploadMusic(file); }} />
        <button onClick={() => uploadInput.current?.click()} className="chip chip-hover r-md px-3 py-2 text-[11px] font-semibold text-ink2 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Upload MP3
        </button>
        {state.customName ? (
          <button onClick={useDefaultPlaylist} className="text-[11px] text-acc hover:underline">Default playlist</button>
        ) : <span className="text-[10px] text-ink3 tabular-nums">{state.track + 1} / {state.tracks.length} tracks</span>}
      </div>
      {state.customName && <p className="text-[10px] text-ink3">Your selected MP3 plays locally on this device.</p>}
      {state.loading && <p role="status" className="text-[10px] text-ink3">Loading music…</p>}
      {state.error && <p role="alert" className="text-[11px] text-rose-400">{state.error}</p>}

      <div className="border-t border-line pt-3 flex flex-col gap-2">
        {AMB_KEYS.map((key) => {
          const Icon = AMB_ICON[key];
          const sound = state.snd[key];
          return (
            <div key={key}>
              <div className="grid grid-cols-[110px_minmax(0,1fr)_32px] items-center gap-2">
                <button onClick={() => toggleSnd(key)} aria-label={AMBIENCE[key].name} aria-pressed={sound.on} aria-busy={sound.loading}
                  className={`r-md flex items-center gap-2 px-2 h-9 text-[11px] font-semibold border transition-colors ${sound.on ? "border-acc/45 bg-acc/15 text-acc" : "border-line text-ink3 hover:text-ink"}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${sound.loading ? "animate-pulse" : ""}`} />
                  {AMBIENCE[key].name}
                </button>
                <input type="range" aria-label={`${AMBIENCE[key].name} volume`} min={0} max={100} value={sound.vol}
                  onChange={(e) => setSndVol(key, +e.target.value)} className="w-full min-w-0 h-1 accent-[var(--hab)]" />
                <span className="text-[10px] text-ink3 text-right tabular-nums">{sound.vol}%</span>
              </div>
              {sound.error && <p role="alert" className="text-[10px] text-rose-400 mt-1">{sound.error}</p>}
            </div>
          );
        })}
        <div className="flex items-center gap-2.5 pt-1">
          <span className="text-[9px] font-bold tracking-wider text-ink3 w-[110px] shrink-0">AMBIENCE MIX</span>
          <input type="range" aria-label="Ambience master volume" min={0} max={100} value={state.ambVol}
            onChange={(e) => setAmbVol(+e.target.value)} className="flex-1 min-w-0 h-1 accent-[var(--hab)]" />
          <span className="text-[10px] text-ink3 w-8 text-right tabular-nums">{state.ambVol}%</span>
        </div>
      </div>

      <details className="text-[10px] text-ink3">
        <summary className="cursor-pointer hover:text-ink2">Sound credits</summary>
        <ul className="mt-2 space-y-1">
          {AMB_KEYS.map((key) => <li key={key}>
            <a href={AMBIENCE[key].source} target="_blank" rel="noreferrer" className="underline">{AMBIENCE[key].name}: {AMBIENCE[key].author}</a>
            {" · "}<a href={AMBIENCE[key].licenseUrl} target="_blank" rel="noreferrer" className="underline">{AMBIENCE[key].license}</a>
          </li>)}
        </ul>
        <p className="mt-1">Recordings trimmed, balanced, and crossfaded for looping.</p>
      </details>
    </section>
  );
}
