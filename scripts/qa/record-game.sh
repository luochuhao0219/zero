#!/usr/bin/env bash
source "$(dirname "$0")/browser-common.sh"
ab set media dark >/dev/null
ab open http://127.0.0.1:4173/ >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
ab record start "$ROOT/recordings/game-route.webm"
trap 'ab record stop >/dev/null 2>&1 || true' EXIT
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
pause 1000
scroll_path 1 5500
ab click '#choose-game';pause 2200
scroll_path .32 4000
scroll_path .48 4000
scroll_path .82 6000
ab click '#start-game';pause 2800
# Explicitly play the first chapter even if an older save has completed chapters.
ab click '[data-level="0"]';pause 2400
ab click '#front-view';pause 1600
ab click '#back-view'
ab wait --fn 'borrowLightDiagnostics().direct.targets[0]?.mode==="lamp"' >/dev/null
ab focus '#stage';ab press 1
keys ArrowLeft 50
keys ArrowUp 22
keys q 25
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
ab eval '({state:borrowLightDiagnostics().state,score:borrowLightDiagnostics().score,completed:borrowLightDiagnostics().completed,works:borrowLightDiagnostics().works})' > docs/qa/game-level-1.json
pause 1400
ab click '#next-level';pause 2400
ab wait --fn 'borrowLightDiagnostics().direct.targets[0]?.mode==="bridge"' >/dev/null
ab focus '#stage';ab press 1
keys ArrowLeft 15
keys ArrowDown 12
keys e 11
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
ab eval '({state:borrowLightDiagnostics().state,score:borrowLightDiagnostics().score,completed:borrowLightDiagnostics().completed,works:borrowLightDiagnostics().works})' > docs/qa/game-level-2.json
pause 1400
ab click '#next-level';pause 2400
# Also exercise reduced-motion; first two chapters retain normal animation.
ab set media dark reduced-motion >/dev/null
ab wait --fn 'borrowLightDiagnostics().direct.targets.length===4' >/dev/null
drag_arm(){
  local id="$1" delta="$2" flip="$3" x y tx ty
  read -r x y tx ty < <(ab eval "(()=>{const t=borrowLightDiagnostics().direct.targets.find(t=>t.id==='$id'),c=t.center,p=t.point,f=$flip?-1:1,a=Math.atan2(p.y-c.y,f*(p.x-c.x))+$delta*Math.PI/180,r=Math.hypot(p.x-c.x,p.y-c.y),q=borrowLightProject(c.x+f*r*Math.cos(a),c.y+r*Math.sin(a),p.z);return [t.screen.x,t.screen.y,q.x,q.y]})()" | python3 -c 'import json,sys;print(*(round(n) for n in json.load(sys.stdin)))')
  ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null;ab mouse move "$tx" "$ty" >/dev/null;ab mouse up >/dev/null
}
drag_arm arm-0 53 false
drag_arm arm-1 58 true
read -r x y tx ty < <(ab eval '(()=>{const t=borrowLightDiagnostics().direct.targets.find(t=>t.id==="actor-1"),s=4.8/4.3,q=borrowLightProject(1.075*s-.8*(1-s),t.point.y,t.point.z);return [t.screen.x,t.screen.y,q.x,q.y]})()' | python3 -c 'import json,sys;print(*(round(n) for n in json.load(sys.stdin)))')
ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null;ab mouse move "$tx" "$ty" >/dev/null;ab mouse up >/dev/null
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
ab eval '({state:borrowLightDiagnostics().state,score:borrowLightDiagnostics().score,completed:borrowLightDiagnostics().completed,works:borrowLightDiagnostics().works})' > docs/qa/game-level-3.json
ab screenshot "$ROOT/screenshots/game-completed.png"
pause 1400
ab click '#complete-ending';pause 1800
ab eval '({route:borrowLightDiagnostics().journey.route,progress:borrowLightDiagnostics().journey.progress,playing:borrowLightDiagnostics().playing,completed:borrowLightDiagnostics().completed,works:borrowLightDiagnostics().works})' > docs/qa/game-ending.json
ab click '#collection-open';pause 1800
ab screenshot "$ROOT/screenshots/game-collection.png"
ab click '[data-close="collection-dialog"]'
pause 2000
ab click '#return-hall';pause 5500
ab eval '({route:borrowLightDiagnostics().journey.route,transition:borrowLightDiagnostics().journey.transition,progress:borrowLightDiagnostics().journey.progress,playing:borrowLightDiagnostics().playing,completed:borrowLightDiagnostics().completed,works:borrowLightDiagnostics().works})' > docs/qa/game-recording-final.json
ab errors > docs/qa/game-browser-errors.txt
ab record stop
trap - EXIT
