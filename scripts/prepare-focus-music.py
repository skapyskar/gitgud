"""Split a supplied compilation using the focus playlist's timestamps, retaining AAC quality."""
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads/music.mp4"
library = json.loads((root / "src/lib/audio-library.json").read_text())

for track in library["tracks"]:
    output = root / "public" / track["src"].lstrip("/")
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-ss", str(track["start"]), "-i", str(source),
        "-t", str(track["end"] - track["start"]), "-map", "0:a:0", "-vn",
        "-c:a", "copy", "-movflags", "+faststart",
        "-metadata", f"title={track['name']}", "-metadata", f"artist={track['artist']}",
        str(output),
    ], check=True)
print(f"Prepared {len(library['tracks'])} AAC tracks without re-encoding.")
