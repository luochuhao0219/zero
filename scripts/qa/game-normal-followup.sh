#!/usr/bin/env bash
# Real keyboard / mouse completion, no state injection and no reduced-motion shortcut.
source "$(dirname "$0")/browser-common.sh"
OUT="${QA_OUTPUT_DIR:-docs/qa/followup/game}"
mkdir -p "$OUT"
assert(){ ab eval "(()=>{if(!($1))throw Error('QA assertion: '+$2);return true})()" >/dev/null; }
snapshot(){ ab eval 'borrowLightDiagnostics()' > "$OUT/$1.json"; }
ab set media dark >/dev/null
ab open http://127.0.0.1:4173/ >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
scroll_path 1 1800
ab click '#choose-game';pause 1800
scroll_path .82 1800
ab click '#start-game'
ab click '[data-level="0"]'
ab wait --fn 'borrowLightDiagnostics().direct.targets[0]?.mode==="lamp"' >/dev/null
ab focus '#stage';ab press 1
keys ArrowLeft 50;keys ArrowUp 22;keys q 25
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
assert 'borrowLightDiagnostics().score===100&&!borrowLightDiagnostics().reducedMotion' '"normal level 1"'
snapshot level-1
ab click '#next-level'
ab wait --fn 'borrowLightDiagnostics().direct.targets[0]?.mode==="bridge"' >/dev/null
ab focus '#stage';ab press 1
keys ArrowLeft 15;keys ArrowDown 12;keys e 11
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
assert 'borrowLightDiagnostics().score===100&&!borrowLightDiagnostics().reducedMotion' '"normal level 2"'
snapshot level-2
ab click '#next-level'
ab wait --fn 'borrowLightDiagnostics().direct.targets.length===4&&!borrowLightDiagnostics().viewTransition' >/dev/null
settle(){ ab wait --fn '(()=>{const d=borrowLightDiagnostics();return !d.viewTransition&&["poseLeft","poseRight","spacing"].every(k=>Math.abs(d.state[k]-d.renderState[k])<.01)})()' >/dev/null; }
drag_arm(){
  local id="$1" delta="$2" flip="$3" x y tx ty
  read -r x y tx ty < <(ab eval "(()=>{const t=borrowLightDiagnostics().direct.targets.find(t=>t.id==='$id'),c=t.center,p=t.point,f=$flip?-1:1,a=Math.atan2(p.y-c.y,f*(p.x-c.x))+$delta*Math.PI/180,r=Math.hypot(p.x-c.x,p.y-c.y),q=borrowLightProject(c.x+f*r*Math.cos(a),c.y+r*Math.sin(a),p.z);return [t.screen.x,t.screen.y,q.x,q.y]})()" | python3 -c 'import json,sys;print(*(round(n) for n in json.load(sys.stdin)))')
  ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null;ab mouse move "$tx" "$ty" >/dev/null;ab mouse up >/dev/null
  settle
}
drag_arm arm-0 53 false
drag_arm arm-1 58 true
read -r x y tx ty < <(ab eval '(()=>{const t=borrowLightDiagnostics().direct.targets.find(t=>t.id==="actor-1"),s=4.8/4.3,q=borrowLightProject(1.075*s-.8*(1-s),t.point.y,t.point.z);return [t.screen.x,t.screen.y,q.x,q.y]})()' | python3 -c 'import json,sys;print(*(round(n) for n in json.load(sys.stdin)))')
ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null;ab mouse move "$tx" "$ty" >/dev/null;ab mouse up >/dev/null
ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
assert 'borrowLightDiagnostics().score===100&&!borrowLightDiagnostics().reducedMotion&&borrowLightDiagnostics().completed.length===3' '"normal level 3"'
snapshot level-3
ab screenshot "$ROOT/$OUT/normal-third-completed.png" >/dev/null
# Regression for the last-minute collection/complete-dialog fix: repeat to catch stale listeners.
for i in 1 2 3;do
  ab click '#view-collection'
  assert 'document.querySelector("#collection-dialog").open&&!document.querySelector("#complete-dialog").open' '"collection opens"'
  ab click '[data-close="collection-dialog"]'
  ab wait --fn 'document.querySelector("#complete-dialog").open' >/dev/null
  assert 'borrowLightDiagnostics().playing' '"completion restored"'
done
snapshot collection-return
ab click '#complete-ending';pause 1800
assert '!borrowLightDiagnostics().playing&&borrowLightDiagnostics().journey.route==="game"' '"ending leaves controls"'
snapshot ending
ab click '#return-hall';pause 5500
assert 'borrowLightDiagnostics().journey.route==="public"&&!borrowLightDiagnostics().journey.transition' '"hall restored"'
ab errors > "$OUT/browser-errors.txt"
if [[ -s "$OUT/browser-errors.txt" ]];then cat "$OUT/browser-errors.txt" >&2;exit 1;fi
printf 'Normal-motion three chapters, collection return x3 and ending: PASS\n'
