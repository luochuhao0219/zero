#!/usr/bin/env bash
source "$(dirname "$0")/browser-common.sh"
ab open http://127.0.0.1:4173/ >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
ab record start "$ROOT/recordings/museum-route.webm"
trap 'ab record stop >/dev/null 2>&1 || true' EXIT
pause 1200
scroll_path 1 5500
ab click '#choose-museum';pause 2000
ab click '#ex-heritage summary';pause 1500
scroll_path .18 3000
scroll_path .31 4000
ab click '[data-craft="2"]';pause 1400
ab click '#craft-color';pause 700
ab click '[data-craft="3"]';pause 1600
drag_handle '#handle-arm' 35 -35
scroll_path .46 4000
scroll_path .52 3000
scroll_path .59 3000
scroll_path .73 4500
drag_handle '#handle-lamp' 75 0
drag_handle '#handle-puppet' 0 -45
ab click '#light-color';pause 1200
scroll_path .92 5000
ab fill '#compose-title' '借光过桥 · 今夜的小戏'
ab select '#compose-scene' bridge
drag_handle '#handle-actor-0' 42 -10
ab focus '#handle-actor-1';keys ArrowLeft 3
ab click '#compose-save';pause 1700
# Recorder contexts cancel downloads in this CLI build; separately verified outside recording.
ab click '#compose-download';pause 700
ab screenshot "$ROOT/screenshots/museum-compose.png"
# Reverse continuously through all five rooms; no state is reset.
scroll_path .1 14000
ab click '#return-hall';pause 2200
# Cover the actual connecting corridor, not just the public right entrance.
ab click '#choose-museum';pause 1800
scroll_path .985 11000
ab click '#museum-to-game';pause 1800
scroll_path .48 5000
ab click '#return-hall';pause 5400
ab eval '({journey:borrowLightDiagnostics().journey,draft:JSON.parse(localStorage.getItem("borrow-light-draft-v1")),works:borrowLightDiagnostics().exploration.works})' > docs/qa/museum-recording-final.json
ab record stop
trap - EXIT
