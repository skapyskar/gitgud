/** @typedef {{ playing?: boolean, loading?: boolean, error?: string | null, track?: number, customName?: string | null, currentTime?: number, duration?: number }} MusicUpdate */
/** @typedef {{ on?: boolean, loading?: boolean, error?: string | null }} AmbienceUpdate */

// Media elements stream songs; separate Web Audio gains also work on mobile
// browsers where HTMLMediaElement.volume is controlled by the system.
export class FocusAudioEngine {
  /** @param {{ tracks: { src: string }[], ambience: Record<string, { src: string, name: string }>, onMusic: (update: MusicUpdate) => void, onAmbience: (key: string, update: AmbienceUpdate) => void, createAudio?: () => HTMLAudioElement, createContext?: () => AudioContext, createObjectURL?: (file: File) => string, revokeObjectURL?: (url: string) => void }} options */
  constructor(options) {
    this.options = options;
    this.createAudio = options.createAudio ?? (() => new Audio());
    this.createContext = options.createContext ?? (() => {
      const Context = window.AudioContext || window.webkitAudioContext;
      return new Context();
    });
    this.createObjectURL = options.createObjectURL ?? ((file) => URL.createObjectURL(file));
    this.revokeObjectURL = options.revokeObjectURL ?? ((url) => URL.revokeObjectURL(url));
    this.context = null;
    this.music = null;
    this.ambience = new Map();
    this.track = 0;
    this.customUrl = null;
    this.musicVolume = 65;
    this.ambientMaster = 70;
    this.ambientVolumes = { rain: 60, fire: 55, wind: 45, ocean: 55 };
    this.desiredMusic = false;
    this.musicRequest = 0;
    this.disposed = false;
  }

  emitMusic(update) {
    if (!this.disposed) this.options.onMusic(update);
  }

  emitAmbience(key, update) {
    if (!this.disposed) this.options.onAmbience(key, update);
  }

  makeChannel(src) {
    this.context ??= this.createContext();
    const audio = this.createAudio();
    audio.preload = "none";
    audio.src = src;
    const gain = this.context.createGain();
    const source = this.context.createMediaElementSource(audio);
    source.connect(gain);
    gain.connect(this.context.destination);
    return { audio, gain, source, on: false, request: 0 };
  }

  getMusic() {
    if (this.music) return this.music;
    const channel = this.makeChannel(this.options.tracks[this.track].src);
    channel.gain.gain.value = this.musicVolume / 100;
    channel.audio.onended = () => {
      if (this.desiredMusic && !this.customUrl) this.selectTrack((this.track + 1) % this.options.tracks.length);
    };
    channel.audio.ontimeupdate = channel.audio.onloadedmetadata = () => {
      this.emitMusic({ currentTime: channel.audio.currentTime, duration: Number.isFinite(channel.audio.duration) ? channel.audio.duration : 0 });
    };
    channel.audio.onwaiting = () => { if (this.desiredMusic) this.emitMusic({ loading: true }); };
    channel.audio.onplaying = () => { if (this.desiredMusic) this.emitMusic({ loading: false }); };
    channel.audio.onerror = () => {
      this.musicRequest++;
      this.desiredMusic = false;
      this.emitMusic({ playing: false, loading: false, error: "This song could not be loaded. Try another track or choose a different MP3." });
    };
    this.music = channel;
    return channel;
  }

  async playMusic() {
    const request = ++this.musicRequest;
    this.desiredMusic = true;
    this.emitMusic({ playing: true, loading: true, error: null });
    try {
      const { audio } = this.getMusic();
      if (audio.error) audio.load();
      // Start both operations within the user's gesture, before awaiting either.
      await Promise.all([this.context.resume(), audio.play()]);
      if (!this.disposed && request === this.musicRequest) this.emitMusic({ playing: true, loading: false });
    } catch {
      if (this.disposed || request !== this.musicRequest) return;
      this.desiredMusic = false;
      this.emitMusic({ playing: false, loading: false, error: "Music could not start. Press play to retry, or choose another MP3." });
    }
  }

  async toggleMusic() {
    if (!this.desiredMusic) return this.playMusic();
    this.musicRequest++;
    this.desiredMusic = false;
    this.music?.audio.pause();
    this.emitMusic({ playing: false, loading: false, error: null });
  }

  selectTrack(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.options.tracks.length) return;
    const resume = this.desiredMusic;
    this.musicRequest++;
    const { audio } = this.getMusic();
    audio.pause();
    audio.loop = false;
    audio.src = this.options.tracks[index].src;
    audio.load();
    this.releaseCustomUrl();
    this.track = index;
    this.emitMusic({ track: index, customName: null, currentTime: 0, duration: 0, error: null });
    if (resume) void this.playMusic();
  }

  async useCustomFile(file) {
    if (!/\.mp3$/i.test(file.name)) throw new Error("Please choose an MP3 file.");
    const { audio } = this.getMusic();
    const url = this.createObjectURL(file);
    this.musicRequest++;
    audio.pause();
    audio.src = url;
    audio.loop = true;
    audio.load();
    this.releaseCustomUrl();
    this.customUrl = url;
    this.emitMusic({ customName: file.name, currentTime: 0, duration: 0, error: null });
    await this.playMusic();
  }

  releaseCustomUrl() {
    if (this.customUrl) this.revokeObjectURL(this.customUrl);
    this.customUrl = null;
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.music) this.music.gain.gain.setTargetAtTime(volume / 100, this.context.currentTime, 0.04);
  }

  async toggleAmbience(key) {
    let channel = this.ambience.get(key);
    if (!channel) {
      channel = this.makeChannel(this.options.ambience[key].src);
      channel.audio.loop = true;
      channel.gain.gain.value = this.ambientVolumes[key] / 100 * this.ambientMaster / 100;
      channel.audio.onerror = () => {
        channel.request++;
        channel.on = false;
        this.emitAmbience(key, { on: false, loading: false, error: `${this.options.ambience[key].name} could not be loaded. Tap to retry.` });
      };
      this.ambience.set(key, channel);
    }
    const request = ++channel.request;
    channel.on = !channel.on;
    if (!channel.on) {
      channel.audio.pause();
      this.emitAmbience(key, { on: false, loading: false, error: null });
      return;
    }
    this.emitAmbience(key, { on: true, loading: true, error: null });
    try {
      if (channel.audio.error) channel.audio.load();
      await Promise.all([this.context.resume(), channel.audio.play()]);
      if (!this.disposed && request === channel.request) this.emitAmbience(key, { on: true, loading: false });
    } catch {
      if (this.disposed || request !== channel.request) return;
      channel.on = false;
      this.emitAmbience(key, { on: false, loading: false, error: `${this.options.ambience[key].name} could not start. Tap to retry.` });
    }
  }

  setAmbientVolume(key, volume) {
    this.ambientVolumes[key] = volume;
    const channel = this.ambience.get(key);
    if (channel) channel.gain.gain.setTargetAtTime(volume / 100 * this.ambientMaster / 100, this.context.currentTime, 0.04);
  }

  setAmbientMaster(volume) {
    this.ambientMaster = volume;
    for (const key of this.ambience.keys()) this.setAmbientVolume(key, this.ambientVolumes[key]);
  }

  seek(time) {
    if (this.music && Number.isFinite(this.music.audio.duration)) {
      this.music.audio.currentTime = Math.max(0, Math.min(time, this.music.audio.duration));
    }
  }

  dispose() {
    this.disposed = true;
    this.musicRequest++;
    for (const channel of [this.music, ...this.ambience.values()]) {
      if (!channel) continue;
      channel.request++;
      channel.audio.onended = channel.audio.onerror = channel.audio.ontimeupdate = channel.audio.onloadedmetadata = channel.audio.onwaiting = channel.audio.onplaying = null;
      channel.audio.pause();
      channel.audio.removeAttribute("src");
      channel.audio.load();
      channel.source.disconnect();
      channel.gain.disconnect();
    }
    this.releaseCustomUrl();
    void this.context?.close().catch(() => {});
  }
}
