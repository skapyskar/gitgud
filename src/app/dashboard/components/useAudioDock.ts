"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fully procedural focus-radio audio: generative pad+pluck music (3 stations)
 * and filtered-noise ambience (rain/fire/wind/ocean). No audio files, no
 * network — everything is synthesized with the Web Audio API, so there's
 * nothing to license and nothing to fail to load.
 */

type AmbKey = "rain" | "fire" | "wind" | "ocean";

interface Station {
  name: string;
  sub: string;
  bpm: number;
  dot: string;
  chords: number[][];
  scale: number[];
  pattern: Array<number | null>;
}

const STATIONS: Station[] = [
  {
    name: "Midnight Drift",
    sub: "lo-fi · 72",
    bpm: 72,
    dot: "var(--acc)",
    chords: [
      [45, 57, 60, 64],
      [41, 53, 60, 65],
      [43, 55, 59, 62],
      [48, 55, 60, 64],
    ],
    scale: [69, 72, 74, 76, 79, 81, 84],
    pattern: [0, null, 2, null, 4, null, 3, null, 5, null, 4, null, 2, null, 1, null],
  },
  {
    name: "Neon Pulse",
    sub: "dorian · 96",
    bpm: 96,
    dot: "var(--acc2)",
    chords: [
      [38, 50, 57, 60],
      [41, 53, 60, 65],
      [43, 55, 59, 65],
      [45, 57, 60, 64],
    ],
    scale: [62, 64, 65, 67, 69, 71, 72, 74],
    pattern: [0, 2, null, 4, null, 3, 5, null, 4, null, 2, 3, null, 1, null, 2],
  },
  {
    name: "Zen Bloom",
    sub: "pentatonic · 56",
    bpm: 56,
    dot: "var(--acc3)",
    chords: [
      [36, 48, 55, 64],
      [45, 52, 60, 64],
      [41, 48, 57, 65],
      [43, 50, 59, 67],
    ],
    scale: [72, 74, 76, 79, 81, 84],
    pattern: [0, null, null, 4, null, null, 2, null, 5, null, null, 3, null, null, 1, null],
  },
];

const AMB_BASE: Record<AmbKey, number> = { rain: 0.5, fire: 0.9, wind: 0.45, ocean: 0.85 };
const AMB_KEYS: AmbKey[] = ["rain", "fire", "wind", "ocean"];

interface SndState {
  on: boolean;
  vol: number;
}

export interface AudioDockState {
  stations: Station[];
  station: number;
  playing: boolean;
  musicVol: number;
  snd: Record<AmbKey, SndState>;
  ambVol: number;
}

export function useAudioDock() {
  const [state, setState] = useState<AudioDockState>({
    stations: STATIONS,
    station: 0,
    playing: false,
    musicVol: 65,
    snd: {
      rain: { on: false, vol: 60 },
      fire: { on: false, vol: 55 },
      wind: { on: false, vol: 45 },
      ocean: { on: false, vol: 55 },
    },
    ambVol: 70,
  });

  const ac = useRef<AudioContext | null>(null);
  const white = useRef<AudioBuffer | null>(null);
  const brown = useRef<AudioBuffer | null>(null);
  const ambMaster = useRef<GainNode | null>(null);
  const amb = useRef<Partial<Record<AmbKey, { g: GainNode }>>>({});
  const crackleT = useRef<ReturnType<typeof setInterval> | null>(null);

  const musMaster = useRef<GainNode | null>(null);
  const musBus = useRef<GainNode | null>(null);
  const padLP = useRef<BiquadFilterNode | null>(null);
  const musTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const beat = useRef(0);
  const nextT = useRef(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const noiseBuf = useCallback((kind: "white" | "brown") => {
    const context = ac.current!;
    const len = context.sampleRate * 2;
    const buf = context.createBuffer(1, len, context.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }
    return buf;
  }, []);

  const ensureAC = useCallback(() => {
    if (!ac.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac.current = new AC();
      white.current = noiseBuf("white");
      brown.current = noiseBuf("brown");
      ambMaster.current = ac.current.createGain();
      ambMaster.current.gain.value = stateRef.current.ambVol / 100;
      ambMaster.current.connect(ac.current.destination);
    }
    if (ac.current.state === "suspended") ac.current.resume();
  }, [noiseBuf]);

  const setAmbGain = useCallback((key: AmbKey) => {
    const context = ac.current;
    const node = amb.current[key];
    if (!context || !node) return;
    const s = stateRef.current.snd[key];
    const target = s.on ? (s.vol / 100) * AMB_BASE[key] : 0;
    node.g.gain.setTargetAtTime(target, context.currentTime, 0.35);
  }, []);

  const buildAmb = useCallback(
    (key: AmbKey) => {
      const context = ac.current;
      if (!context || amb.current[key]) return;
      const g = context.createGain();
      g.gain.value = 0;
      g.connect(ambMaster.current!);
      const src = context.createBufferSource();
      src.loop = true;

      if (key === "rain") {
        src.buffer = white.current;
        const hp = context.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 500;
        const lp = context.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2600;
        src.connect(hp);
        hp.connect(lp);
        lp.connect(g);
      } else if (key === "fire") {
        src.buffer = brown.current;
        const lp = context.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 320;
        src.connect(lp);
        lp.connect(g);
        crackleT.current = setInterval(() => {
          if (!stateRef.current.snd.fire.on || !ac.current || Math.random() < 0.45) return;
          const t = context.currentTime;
          const c = context.createBufferSource();
          c.buffer = white.current;
          const bp = context.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 900 + Math.random() * 3000;
          bp.Q.value = 1.2;
          const cg = context.createGain();
          cg.gain.setValueAtTime((0.08 + Math.random() * 0.25) * (stateRef.current.snd.fire.vol / 100), t);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05);
          c.connect(bp);
          bp.connect(cg);
          cg.connect(ambMaster.current!);
          c.start(t, Math.random() * 1.5, 0.09);
        }, 110);
      } else if (key === "wind") {
        src.buffer = white.current;
        const bp = context.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 480;
        bp.Q.value = 0.7;
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.09;
        const depth = context.createGain();
        depth.gain.value = 260;
        lfo.connect(depth);
        depth.connect(bp.frequency);
        lfo.start();
        src.connect(bp);
        bp.connect(g);
      } else if (key === "ocean") {
        src.buffer = brown.current;
        const lp = context.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 520;
        const swell = context.createGain();
        swell.gain.value = 0.6;
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.07;
        const depth = context.createGain();
        depth.gain.value = 0.38;
        lfo.connect(depth);
        depth.connect(swell.gain);
        lfo.start();
        src.connect(lp);
        lp.connect(swell);
        swell.connect(g);
      }
      src.start();
      amb.current[key] = { g };
    },
    []
  );

  const toggleSnd = useCallback(
    (key: AmbKey) => {
      ensureAC();
      buildAmb(key);
      setState((cur) => ({ ...cur, snd: { ...cur.snd, [key]: { ...cur.snd[key], on: !cur.snd[key].on } } }));
      setTimeout(() => setAmbGain(key), 0);
    },
    [ensureAC, buildAmb, setAmbGain]
  );

  const setSndVol = useCallback(
    (key: AmbKey, vol: number) => {
      setState((cur) => ({
        ...cur,
        snd: { ...cur.snd, [key]: { ...cur.snd[key], vol, on: vol === 0 ? false : cur.snd[key].on } },
      }));
      setTimeout(() => setAmbGain(key), 0);
    },
    [setAmbGain]
  );

  const setAmbVol = useCallback((vol: number) => {
    setState((cur) => ({ ...cur, ambVol: vol }));
    if (ambMaster.current && ac.current) {
      ambMaster.current.gain.setTargetAtTime(vol / 100, ac.current.currentTime, 0.1);
    }
  }, []);

  const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  const pad = useCallback((m: number, t: number, dur: number) => {
    const context = ac.current!;
    const o = context.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq(m);
    o.detune.value = (Math.random() - 0.5) * 8;
    const g = context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.1);
    g.gain.setValueAtTime(0.05, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
    o.connect(g);
    g.connect(padLP.current!);
    o.start(t);
    o.stop(t + dur + 1.4);
  }, []);

  const pluck = useCallback((m: number, t: number) => {
    const context = ac.current!;
    const o = context.createOscillator();
    o.type = "sine";
    o.frequency.value = freq(m);
    const g = context.createGain();
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g);
    g.connect(musBus.current!);
    o.start(t);
    o.stop(t + 0.6);
  }, []);

  const ensureMusicGraph = useCallback(() => {
    ensureAC();
    if (musMaster.current) return;
    const context = ac.current!;
    musMaster.current = context.createGain();
    musMaster.current.gain.value = 0;
    musMaster.current.connect(context.destination);
    padLP.current = context.createBiquadFilter();
    padLP.current.type = "lowpass";
    padLP.current.frequency.value = 820;
    padLP.current.connect(musMaster.current);
    musBus.current = context.createGain();
    musBus.current.gain.value = 1;
    musBus.current.connect(musMaster.current);
    const dly = context.createDelay(1);
    dly.delayTime.value = 0.34;
    const fb = context.createGain();
    fb.gain.value = 0.32;
    dly.connect(fb);
    fb.connect(dly);
    dly.connect(musMaster.current);
    musBus.current.connect(dly);
    const vinyl = context.createBufferSource();
    vinyl.buffer = white.current;
    vinyl.loop = true;
    const vlp = context.createBiquadFilter();
    vlp.type = "lowpass";
    vlp.frequency.value = 2800;
    const vg = context.createGain();
    vg.gain.value = 0.012;
    vinyl.connect(vlp);
    vlp.connect(vg);
    vg.connect(musMaster.current);
    vinyl.start();
  }, [ensureAC]);

  const sched = useCallback(() => {
    const context = ac.current;
    if (!context) return;
    const st = STATIONS[stateRef.current.station];
    const spb = 30 / st.bpm;
    while (nextT.current < context.currentTime + 0.45) {
      const b = beat.current;
      if (b % 16 === 0) {
        const ch = st.chords[Math.floor(b / 16) % st.chords.length];
        for (const n of ch) pad(n, nextT.current, spb * 16);
      }
      const p = st.pattern[b % 16];
      if (p != null && Math.random() > 0.15) pluck(st.scale[p % st.scale.length], nextT.current);
      beat.current++;
      nextT.current += spb;
    }
  }, [pad, pluck]);

  const startMusic = useCallback(() => {
    ensureMusicGraph();
    beat.current = 0;
    nextT.current = ac.current!.currentTime + 0.1;
    if (musTimer.current) clearInterval(musTimer.current);
    musTimer.current = setInterval(sched, 200);
    musMaster.current!.gain.setTargetAtTime(0.9 * (stateRef.current.musicVol / 100), ac.current!.currentTime, 0.3);
  }, [ensureMusicGraph, sched]);

  const stopMusic = useCallback(() => {
    if (musTimer.current) clearInterval(musTimer.current);
    musTimer.current = null;
    if (musMaster.current && ac.current) {
      musMaster.current.gain.setTargetAtTime(0, ac.current.currentTime, 0.25);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    setState((cur) => {
      const playing = !cur.playing;
      if (playing) startMusic();
      else stopMusic();
      return { ...cur, playing };
    });
  }, [startMusic, stopMusic]);

  const pickStation = useCallback((i: number) => {
    setState((cur) => ({ ...cur, station: i }));
    if (ac.current) {
      beat.current = 0;
      nextT.current = ac.current.currentTime + 0.08;
    }
  }, []);

  const setMusicVol = useCallback((vol: number) => {
    setState((cur) => ({ ...cur, musicVol: vol }));
    if (musMaster.current && ac.current && stateRef.current.playing) {
      musMaster.current.gain.setTargetAtTime(0.9 * (vol / 100), ac.current.currentTime, 0.1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (crackleT.current) clearInterval(crackleT.current);
      if (musTimer.current) clearInterval(musTimer.current);
      if (ac.current) {
        try {
          ac.current.close();
        } catch {
          /* already closed */
        }
      }
    };
  }, []);

  return {
    state,
    toggleMusic,
    pickStation,
    setMusicVol,
    prevStation: () => pickStation((state.station + STATIONS.length - 1) % STATIONS.length),
    nextStation: () => pickStation((state.station + 1) % STATIONS.length),
    toggleSnd,
    setSndVol,
    setAmbVol,
  };
}

export type { AmbKey };
export { AMB_KEYS };
