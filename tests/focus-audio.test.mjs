import assert from "node:assert/strict";
import test from "node:test";
import { FocusAudioEngine } from "../src/lib/focus-audio.mjs";

function setup() {
  const players = [];
  const gains = [];
  const music = [];
  const ambience = [];
  const revoked = [];
  const context = {
    currentTime: 0, state: "running", resume: async () => {}, close: async () => {},
    destination: {},
    createGain() {
      const node = { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    },
    createMediaElementSource() { return { connect() {}, disconnect() {} }; },
  };
  const engine = new FocusAudioEngine({
    tracks: [{ src: "/one.m4a" }, { src: "/two.m4a" }],
    ambience: { rain: { src: "/rain.mp3", name: "Rain" }, fire: { src: "/fire.mp3", name: "Fireplace" } },
    onMusic: (value) => music.push(value), onAmbience: (key, value) => ambience.push({ key, ...value }),
    createAudio: () => {
      const player = { src: "", currentTime: 0, duration: 10, loop: false, preload: "none", play: async () => {}, pause() { this.paused = true; }, load() {}, removeAttribute() { this.src = ""; } };
      players.push(player);
      return player;
    },
    createContext: () => context,
    createObjectURL: () => "blob:local-music", revokeObjectURL: (url) => revoked.push(url),
  });
  return { engine, players, gains, music, ambience, revoked };
}

test("ambient sliders change only their own channel, with independent playback", async () => {
  const { engine, players, gains } = setup();
  await engine.toggleAmbience("rain");
  await engine.toggleAmbience("fire");
  engine.setAmbientVolume("fire", 20);
  assert.equal(gains[0].gain.value, 0.6 * 0.7);
  assert.ok(Math.abs(gains[1].gain.value - 0.2 * 0.7) < 1e-12);
  await engine.toggleAmbience("fire");
  assert.equal(players[1].paused, true);
  assert.notEqual(players[0].paused, true);
  engine.dispose();
});

test("finishing a default song advances to the next, then wraps the playlist", async () => {
  const { engine, players, music } = setup();
  await engine.toggleMusic();
  players[0].onended();
  await Promise.resolve();
  assert.equal(players[0].src, "/two.m4a");
  players[0].onended();
  await Promise.resolve();
  assert.equal(players[0].src, "/one.m4a");
  assert.ok(music.some((update) => update.track === 1));
  engine.dispose();
});

test("a rejected pending play cannot restart playback after pause", async () => {
  const { engine, players, music } = setup();
  engine.selectTrack(0);
  let reject;
  players[0].play = () => new Promise((_, failure) => { reject = failure; });
  const pending = engine.toggleMusic();
  await engine.toggleMusic();
  reject(new Error("interrupted"));
  await pending;
  assert.equal(music.at(-1).playing, false);
  assert.equal(music.at(-1).error, null);
  engine.dispose();
});

test("local MP3 replacement can return to defaults and releases its object URL", async () => {
  const { engine, players, revoked } = setup();
  await engine.useCustomFile({ name: "my-song.mp3", type: "audio/mpeg" });
  assert.equal(players[0].src, "blob:local-music");
  assert.equal(players[0].loop, true);
  engine.selectTrack(1);
  assert.equal(players[0].src, "/two.m4a");
  assert.equal(players[0].loop, false);
  assert.deepEqual(revoked, ["blob:local-music"]);
  engine.dispose();
  assert.equal(players[0].src, "");
});

test("an ambience load failure can be retried without reloading the page", async () => {
  const { engine, players, ambience } = setup();
  await engine.toggleAmbience("rain");
  const audio = players[0];
  audio.error = { code: 4 };
  audio.onerror();
  audio.play = async () => { if (audio.error) throw new Error("media must be reloaded"); };
  audio.load = () => { audio.error = null; };
  await engine.toggleAmbience("rain");
  const latest = ambience.filter((update) => update.key === "rain").reduce((state, update) => ({ ...state, ...update }), {});
  assert.equal(latest.on, true);
  assert.equal(latest.error, null);
  engine.dispose();
});
