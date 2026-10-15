"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import library from "@/lib/audio-library.json";
import { FocusAudioEngine } from "@/lib/focus-audio.mjs";

export type AmbKey = keyof typeof library.ambience;
export const AMB_KEYS: AmbKey[] = ["rain", "fire", "wind", "ocean"];
export const AMBIENCE = library.ambience;

interface SoundState {
  on: boolean;
  vol: number;
  loading: boolean;
  error: string | null;
}

export function useAudioDock() {
  const [state, setState] = useState({
    tracks: library.tracks,
    track: 0,
    playing: false,
    loading: false,
    error: null as string | null,
    customName: null as string | null,
    currentTime: 0,
    duration: 0,
    musicVol: 65,
    ambVol: 70,
    snd: {
      rain: { on: false, vol: 60, loading: false, error: null },
      fire: { on: false, vol: 55, loading: false, error: null },
      wind: { on: false, vol: 45, loading: false, error: null },
      ocean: { on: false, vol: 55, loading: false, error: null },
    } as Record<AmbKey, SoundState>,
  });
  const engine = useRef<FocusAudioEngine | null>(null);

  const getEngine = useCallback(() => {
    if (!engine.current) {
      engine.current = new FocusAudioEngine({
        tracks: library.tracks,
        ambience: library.ambience,
        onMusic: (update) => setState((current) => ({ ...current, ...update })),
        onAmbience: (key, update) => setState((current) => ({
          ...current,
          snd: { ...current.snd, [key]: { ...current.snd[key as AmbKey], ...update } },
        })),
      });
    }
    return engine.current;
  }, []);

  useEffect(() => () => {
    engine.current?.dispose();
    engine.current = null;
  }, []);

  const toggleMusic = async () => {
    try { await getEngine().toggleMusic(); }
    catch { setState((current) => ({ ...current, playing: false, loading: false, error: "Audio is unavailable in this browser. Please try another browser." })); }
  };

  const pickTrack = (index: number) => {
    try { getEngine().selectTrack(index); }
    catch { setState((current) => ({ ...current, error: "The song could not be selected. Please try again." })); }
  };

  const setMusicVol = (vol: number) => {
    setState((current) => ({ ...current, musicVol: vol }));
    getEngine().setMusicVolume(vol);
  };

  const setSndVol = (key: AmbKey, vol: number) => {
    setState((current) => ({ ...current, snd: { ...current.snd, [key]: { ...current.snd[key], vol } } }));
    getEngine().setAmbientVolume(key, vol);
  };

  const setAmbVol = (vol: number) => {
    setState((current) => ({ ...current, ambVol: vol }));
    getEngine().setAmbientMaster(vol);
  };

  const toggleSnd = async (key: AmbKey) => {
    try { await getEngine().toggleAmbience(key); }
    catch { setState((current) => ({ ...current, snd: { ...current.snd, [key]: { ...current.snd[key], on: false, loading: false, error: "Audio could not start. Tap to retry." } } })); }
  };

  const uploadMusic = async (file: File) => {
    try { await getEngine().useCustomFile(file); }
    catch { setState((current) => ({ ...current, error: "Please choose a playable MP3 file." })); }
  };

  return {
    state, toggleMusic, pickTrack, setMusicVol, toggleSnd, setSndVol, setAmbVol, uploadMusic,
    prevTrack: () => pickTrack((state.track + library.tracks.length - 1) % library.tracks.length),
    nextTrack: () => pickTrack((state.track + 1) % library.tracks.length),
    seek: (time: number) => engine.current?.seek(time),
    useDefaultPlaylist: () => pickTrack(state.track),
  };
}
