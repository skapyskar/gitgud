"""Prepare credited ambience loops. Pass fire=FILE wind=FILE rain=FILE ocean=FILE."""
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
library = json.loads((root / "src/lib/audio-library.json").read_text())
sources = dict(argument.split("=", 1) for argument in sys.argv[1:])

for key, sound in library["ambience"].items():
    source = sources[key]
    duration = min(90, float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source,
    ])))
    # Crossfade the tail into the head, then place that bridge after the body.
    # The end of the bridge meets the beginning of the body at the same point.
    filters = (
        f"[0:a]atrim=end={duration},asetpts=PTS-STARTPTS,asplit=3[b][t][h];"
        f"[b]atrim=start=1:end={duration-1},asetpts=PTS-STARTPTS[body];"
        f"[t]atrim=start={duration-1},asetpts=PTS-STARTPTS[tail];"
        "[h]atrim=end=1,asetpts=PTS-STARTPTS[head];"
        "[tail][head]acrossfade=d=1:c1=tri:c2=tri[bridge];"
        "[body][bridge]concat=n=2:v=0:a=1,highpass=f=35,loudnorm=I=-20:TP=-2:LRA=11[out]"
    )
    output = root / "public" / sound["src"].lstrip("/")
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", source,
        "-filter_complex", filters, "-map", "[out]", "-ar", "44100", "-ac", "2",
        "-c:a", "libmp3lame", "-q:a", "2", "-metadata", f"title={sound['title']}",
        "-metadata", f"artist={sound['author']}", "-metadata", f"comment={sound['source']} ({sound['license']})",
        str(output),
    ], check=True)
print("Prepared four stereo ambience loops with balanced loudness and crossfaded boundaries.")
