"use client";

import { Play, Pause, SkipBack, SkipForward, CloudRain, Flame, Wind, Waves } from "lucide-react";
import { useAudioDock, AMB_KEYS, type AmbKey } from "./useAudioDock";

const AMB_ICON: Record<AmbKey, typeof CloudRain> = {
  rain: CloudRain,
  fire: Flame,
  wind: Wind,
  ocean: Waves,
};
const AMB_LABEL: Record<AmbKey, string> = { rain: "Rain", fire: "Fireplace", wind: "Snow wind", ocean: "Ocean" };

/** Focus radio: generative pad music + procedural ambience. Everything here is synthesized. */
export default function AudioDock() {
  const { state, toggleMusic, prevStation, nextStation, setMusicVol, toggleSnd, setAmbVol } = useAudioDock();
  const station = state.stations[state.station];

  return (
    <div className="glass r-xl p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMusic}
          className="grad-primary glow-shadow w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-[1.09]"
          title={state.playing ? "Pause" : "Play"}
        >
          {state.playing ? <Pause className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-bold truncate">{station.name}</div>
          <div className="text-[10.5px] text-ink3">focus radio · {station.sub}</div>
        </div>
        <div className="flex items-end gap-[2.5px] h-[15px] shrink-0" style={{ animationPlayState: state.playing ? "running" : "paused" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-sm origin-bottom"
              style={{
                height: "100%",
                background: i === 0 ? "var(--acc)" : i === 1 ? "var(--acc2)" : "var(--acc3)",
                animation: `eq 0.9s ease-in-out ${-0.1 - i * 0.32}s infinite`,
                animationPlayState: state.playing ? "running" : "paused",
              }}
            />
          ))}
        </div>
        <button onClick={prevStation} title="Previous station" className="chip chip-hover r-md w-7 h-7 flex items-center justify-center text-ink2 shrink-0">
          <SkipBack className="w-3 h-3" fill="currentColor" />
        </button>
        <button onClick={nextStation} title="Next station" className="chip chip-hover r-md w-7 h-7 flex items-center justify-center text-ink2 shrink-0">
          <SkipForward className="w-3 h-3" fill="currentColor" />
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-[9.5px] font-extrabold tracking-widest text-ink3 w-[62px] shrink-0">MUSIC</span>
        <input
          type="range"
          min={0}
          max={100}
          value={state.musicVol}
          onChange={(e) => setMusicVol(+e.target.value)}
          className="flex-1 h-[3px] accent-[var(--acc)]"
        />
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-2.5">
        {AMB_KEYS.map((key) => {
          const Icon = AMB_ICON[key];
          const on = state.snd[key].on;
          return (
            <button
              key={key}
              onClick={() => toggleSnd(key)}
              title={AMB_LABEL[key]}
              className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 transition-all border ${
                on ? "border-acc/45 bg-acc/15 text-acc shadow-[0_0_12px_var(--glow)]" : "border-line text-ink3"
              }`}
            >
              <Icon className="w-3.5 h-3.5" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.18 : 0} />
            </button>
          );
        })}
        <input
          type="range"
          min={0}
          max={100}
          value={state.ambVol}
          onChange={(e) => setAmbVol(+e.target.value)}
          title="Ambience volume"
          className="flex-1 h-[3px] accent-[var(--hab)]"
        />
      </div>
    </div>
  );
}
