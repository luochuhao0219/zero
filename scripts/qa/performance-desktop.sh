#!/usr/bin/env bash
# Run after recording is stopped, with all other automated sessions closed.
source "$(dirname "$0")/browser-common.sh"
OUT="${QA_OUTPUT_DIR:-docs/qa}"
mkdir -p "$OUT"
sample(){ ab eval "$(cat scripts/qa/sample-performance.js)" > "$OUT/$1.json"; }
ab set media dark >/dev/null
ab set viewport 1440 900 >/dev/null
ab open http://127.0.0.1:4173/ >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
pause 3500
sample desktop-campus
scroll_path 1 1500
pause 3500
sample desktop-hall
ab click '#choose-museum';pause 2200
scroll_path .31 1800
pause 3500
ab eval 'window.__qaScroll=true' >/dev/null
sample desktop-museum-scroll
ab eval 'window.__qaScroll=false' >/dev/null
ab click '#return-hall';pause 5000
ab click '#choose-game';pause 2200
scroll_path .82 2500
ab click '#start-game';pause 5000
sample desktop-game
ab press Escape;pause 5000
ab errors > "$OUT/desktop-browser-errors.txt"
