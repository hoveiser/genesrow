#!/usr/bin/env python3
"""Assemble genesrow_ui_demo.mp4 from the captured live-UI frames.

Each frame becomes a short Ken-Burns clip (subtle zoom) with a burned-in
caption (white text, black outline, bottom-center, fade in/out) matching the
style of the earlier security video. Clips are joined with crossfades.

Inputs : evidence/ui_frames/*.png   (see scripts/ui_video/capture.mjs)
Output : evidence/genesrow_ui_demo.mp4   (1920x1080, H.264, 30fps)

Requires ffmpeg with libx264, zoompan, xfade and libass (subtitles filter).
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, "evidence", "ui_frames")
OUT = os.path.join(ROOT, "evidence", "genesrow_ui_demo.mp4")

FPS = 30
W, H = 1920, 1080
XFADE = 0.5
UI_DUR = 4.8
TITLE_DUR = 4.0
OUTRO_DUR = 4.5

# (image, caption, duration, has_caption)
SEGMENTS = [
    ("00_title.png", "", TITLE_DUR, False),
    ("01_landing_hero.png",
     "GenEscrow v1.3.0 -- a live, interactive demo of the deployed contract UI",
     UI_DUR, True),
    ("02_landing_features.png",
     "Six security enhancements (A1-A6), each enforced on-chain and proven by a real StudioNet transaction",
     UI_DUR, True),
    ("03_create_default.png",
     "Create an escrow: the form runs the contract's own validation rules in real time",
     UI_DUR, True),
    ("04_create_a1_window_error.png",
     "A1: Window bounds enforced (60s - 7 days). Appeal window 315360000s rejected: max is 604800s",
     UI_DUR, True),
    ("05_create_a4_address_error.png",
     "A4: Freelancer address validated -- the zero address is rejected, so funds can never lock to a burn address",
     UI_DUR, True),
    ("06_create_success.png",
     "Valid parameters accepted: escrow #1 funded with 1 GEN",
     UI_DUR, True),
    ("07_deliver_allowlist.png",
     "A5: Gateway allowlist check -- only anchored, immutable evidence hosts are accepted",
     UI_DUR, True),
    ("08_deliver_seal.png",
     "A3: Raw-byte seal -- SHA256 09f62d91... over 1265 raw bytes (cleaned text is only 1187 chars)",
     UI_DUR, True),
    ("09_deliver_done.png",
     "Delivery submitted: escrow #1 is now delivered and disputable",
     UI_DUR, True),
    ("10_dispute_prompt.png",
     "A2: Prompt-injection protection -- the artifact is reduced to a sanitized structural index and fenced as UNTRUSTED",
     UI_DUR, True),
    ("11_dispute_verdict.png",
     "AI validators reach consensus: verdict REFUNDED, winner client",
     UI_DUR, True),
    ("12_security_a1_a6.png",
     "Security dashboard: all six hardening items (A1-A6) at a glance",
     UI_DUR, True),
    ("13_security_reachability.png",
     "A5: On-chain reachability probe -- only raw.githubusercontent.com is fetchable by today's validators",
     UI_DUR, True),
    ("15_contract_status.png",
     "Live status: contract 0x0CF5...c100cE4 on StudioNet, deployed source byte-identical to contract.py",
     UI_DUR, True),
    ("16_outro.png", "", OUTRO_DUR, False),
]

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DejaVu Sans,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H88000000,-1,0,0,0,100,100,0,0,1,3,1,2,90,90,72,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ts(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h}:{m:02d}:{s:05.2f}"


def write_ass(path, caption, dur):
    text = caption.replace(" -- ", " - ").replace("\n", " ")
    with open(path, "w", encoding="utf-8") as f:
        f.write(ASS_HEADER.format(w=W, h=H))
        f.write(
            f"Dialogue: 0,{ts(0.35)},{ts(dur - 0.15)},Cap,,0,0,0,,{{\\fad(280,280)}}{text}\n"
        )


def run(cmd):
    print("+", " ".join(cmd[:6]), "...")
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if r.returncode != 0:
        print(r.stdout[-4000:])
        sys.exit(f"ffmpeg failed rc={r.returncode}")
    return r


def render_segment(png, ass, dur, tmp, idx, fade_in, fade_out):
    frames = int(round(dur * FPS))
    base = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,format=yuv420p,"
        f"zoompan=z='min(1+0.0009*on,1.10)':x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}"
    )
    if ass:
        base += f",subtitles=filename='{ass}'"
    if fade_in:
        base += f",fade=t=in:st=0:d=0.6"
    if fade_out:
        base += f",fade=t=out:st={dur - 0.7}:d=0.7"
    base += ",format=yuv420p[v]"
    outp = os.path.join(tmp, f"seg_{idx:02d}.mp4")
    run([
        "ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-t", f"{dur}", "-i", png,
        "-filter_complex", base, "-map", "[v]",
        "-r", str(FPS), "-t", f"{dur}", "-pix_fmt", yuv := "yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", outp,
    ])
    return outp


def concat_xfade(seg_paths, durs, tmp):
    inputs = []
    for p in seg_paths:
        inputs += ["-i", p]
    # build xfade chain
    chain = []
    L = durs[0]
    prev = "0:v"
    for i in range(1, len(seg_paths)):
        offset = L - XFADE
        outl = f"x{i}"
        chain.append(
            f"[{prev}][{i}:v]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}[{outl}]"
        )
        prev = outl
        L = L + durs[i] - XFADE
    graph = ";".join(chain)
    final = os.path.join(tmp, "final_pre.mp4")
    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", graph, "-map", f"[{prev}]",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", final,
    ])
    return final


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")
    for png, _, _, _ in SEGMENTS:
        if not os.path.exists(os.path.join(FRAMES, png)):
            sys.exit(f"missing frame: {png}")

    tmp = tempfile.mkdtemp(prefix="uivideo_")
    seg_paths, durs = [], []
    for idx, (png, cap, dur, has_cap) in enumerate(SEGMENTS):
        ass = None
        if has_cap and cap:
            ass = os.path.join(tmp, f"cap_{idx:02d}.ass")
            write_ass(ass, cap, dur)
        seg = render_segment(
            os.path.join(FRAMES, png), ass, dur, tmp, idx,
            fade_in=(idx == 0), fade_out=(idx == len(SEGMENTS) - 1),
        )
        seg_paths.append(seg)
        durs.append(dur)
        print(f"segment {idx:02d} ok ({png})")

    final = concat_xfade(seg_paths, durs, tmp)
    shutil.move(final, OUT)
    print("WROTE", OUT)
    total = sum(durs) - XFADE * (len(durs) - 1)
    print(f"expected duration ~ {total:.1f}s")
    # keep temp for debugging unless --clean
    if "--clean" in sys.argv:
        shutil.rmtree(tmp, ignore_errors=True)
    else:
        print("tmp:", tmp)


if __name__ == "__main__":
    main()
