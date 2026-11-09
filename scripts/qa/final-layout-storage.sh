#!/usr/bin/env bash
source "$(dirname "$0")/browser-common.sh"
ab set media dark reduced-motion >/dev/null
ab set viewport 393 852 >/dev/null
ab open http://127.0.0.1:4173/#hall >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
ab wait --fn 'borrowLightDiagnostics().journey.active==="hall"' >/dev/null
ab screenshot "$ROOT/screenshots/mobile-hall.png"
ab click '#choose-museum';pause 1200
scroll_path .92 500
ab fill '#compose-title' '双路线回归草稿'
# Real UI saves, no storage/state injection. The CLI click does not scroll nested panels.
ab scrollintoview '#compose-save' >/dev/null
for i in 1 2 3 4 5 6 7;do ab click '#compose-save' >/dev/null;done
ab screenshot "$ROOT/screenshots/mobile-compose.png"
ab eval '({draft:JSON.parse(localStorage.getItem("borrow-light-draft-v1")),works:JSON.parse(localStorage.getItem("borrow-light-compositions-v1")).length,completed:borrowLightDiagnostics().completed,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,viewport:[innerWidth,innerHeight],width:document.documentElement.scrollWidth})' > docs/qa/mobile-before-refresh.json
ab reload >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
ab eval '({draft:JSON.parse(localStorage.getItem("borrow-light-draft-v1")),works:borrowLightDiagnostics().exploration.works,completed:borrowLightDiagnostics().completed,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches})' > docs/qa/storage-after-refresh.json
ab set viewport 844 390 >/dev/null
scroll_path .92 500
ab screenshot "$ROOT/screenshots/landscape-compose.png"
ab eval '({viewport:[innerWidth,innerHeight],width:document.documentElement.scrollWidth,route:borrowLightDiagnostics().journey.route,errors:borrowLightDiagnostics().journey.opening.assetErrors})' > docs/qa/landscape-layout.json
ab errors > docs/qa/layout-browser-errors.txt
