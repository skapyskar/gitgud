import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const library = JSON.parse(readFileSync(new URL("../src/lib/audio-library.json", import.meta.url), "utf8"));

test("the supplied compilation has 24 contiguous individually named songs", () => {
  assert.equal(library.tracks.length, 24);
  assert.equal(library.tracks[0].name, "Hiding In The Blue");
  assert.equal(library.tracks[0].start, 0);
  assert.equal(library.tracks[0].end, 182);
  assert.equal(library.tracks.at(-1).name, "Colors");
  assert.equal(library.tracks.at(-1).start, 3492);
  for (const [i, track] of library.tracks.entries()) {
    assert.ok(track.end > track.start);
    if (i) assert.equal(track.start, library.tracks[i - 1].end);
    assert.ok(track.src.startsWith("/audio/music/"));
    assert.ok(readFileSync(new URL(`../public${track.src}`, import.meta.url)).length > 1000);
  }
});

test("all four ambiences use bundled recordings with source credits", () => {
  assert.deepEqual(Object.keys(library.ambience).sort(), ["fire", "ocean", "rain", "wind"]);
  for (const sound of Object.values(library.ambience)) {
    assert.ok(sound.src.startsWith("/audio/ambience/"));
    assert.ok(sound.source.startsWith("https://"));
    assert.ok(sound.license);
    assert.ok(readFileSync(new URL(`../public${sound.src}`, import.meta.url)).length > 1000);
  }
});
