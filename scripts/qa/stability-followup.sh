#!/usr/bin/env bash
# A bounded, repeatable renderer-resource soak, not a device thermal certification.
source "$(dirname "$0")/browser-common.sh"
OUT="${QA_OUTPUT_DIR:-docs/qa/followup/stability}"
mkdir -p "$OUT"
assert(){ ab eval "(()=>{if(!($1))throw Error('QA assertion: '+$2);return true})()" >/dev/null; }
ab set media dark >/dev/null
ab set viewport 1440 900 >/dev/null
ab open http://127.0.0.1:4173/ >/dev/null
ab wait --fn 'window.borrowLightDiagnostics?.().journey.opening.loaded' >/dev/null
scroll_path 1 500
ab click '#choose-game';pause 1800
scroll_path .82 500
ab click '#start-game'
ab wait --fn 'borrowLightDiagnostics().qualityTier>=3' >/dev/null
# Actual native mouse owns pointer 1; only the adversarial second-pointer event is synthetic.
ab wait --fn 'borrowLightDiagnostics().direct.targets.length>0' >/dev/null
read -r x y < <(ab eval '(()=>{const t=borrowLightDiagnostics().direct.targets[0];return [t.screen.x,t.screen.y]})()' | python3 -c 'import sys,json;print(*(round(n) for n in json.load(sys.stdin)))')
ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null
ab eval 'window.__qaBeforePointer=JSON.stringify(borrowLightDiagnostics().state);document.querySelector("#stage").dispatchEvent(new PointerEvent("pointerdown",{pointerId:2,pointerType:"touch",button:0,bubbles:true,clientX:100,clientY:100}));document.querySelector("#stage").dispatchEvent(new PointerEvent("pointermove",{pointerId:2,pointerType:"touch",bubbles:true,clientX:400,clientY:400}));document.querySelector("#stage").dispatchEvent(new PointerEvent("pointercancel",{pointerId:2,pointerType:"touch",bubbles:true}));true' >/dev/null
assert 'JSON.stringify(borrowLightDiagnostics().state)===window.__qaBeforePointer&&borrowLightDiagnostics().direct.pointerCount===1&&!!borrowLightDiagnostics().direct.dragging' '"secondary cannot steal drag"'
# releasePointerCapture exercises the browser lostpointercapture event for the real owner.
ab eval 'document.querySelector("#stage").releasePointerCapture(1)' >/dev/null
# Chrome delivers the pending lost-capture event on the next native pointer event.
ab mouse move "$((x+1))" "$y" >/dev/null
pause 300
assert 'borrowLightDiagnostics().direct.pointerCount===0&&!borrowLightDiagnostics().direct.dragging' '"lost capture clears drag"'
ab mouse up >/dev/null
ab eval '({type:"native-owner-plus-synthetic-secondary",passed:true,direct:borrowLightDiagnostics().direct})' > "$OUT/pointer-cancellation.json"
# Real tab visibility change: capture both visibility event counters, do not fake document.hidden.
ab eval 'window.__qaVisibility=[];document.addEventListener("visibilitychange",()=>window.__qaVisibility.push({hidden:document.hidden,stage:borrowLightDiagnostics().frames,passage:borrowLightDiagnostics().journey.opening.frames,time:borrowLightDiagnostics().time}));true' >/dev/null
ab tab new --label pause-check about:blank >/dev/null
pause 4000
ab tab t1 >/dev/null
ab wait --fn '__qaVisibility.length>=2' >/dev/null
ab eval '(()=>{const [a,b]=__qaVisibility;if(!a.hidden||b.hidden||b.stage-a.stage>1||b.passage-a.passage>1||b.time-a.time>.051)throw Error("hidden tab rendered");return {events:__qaVisibility,passed:true}})()' > "$OUT/visibility.json"
ab tab close pause-check >/dev/null
# Reduced-motion idle should not spend a full GPU frame on every browser rAF.
ab set media dark reduced-motion >/dev/null
pause 1800
ab eval '(async()=>{const a=borrowLightDiagnostics();await new Promise(r=>setTimeout(r,1500));const b=borrowLightDiagnostics();if(b.frames-a.frames>1)throw Error("reduced idle redraws");return {before:a.frames,after:b.frames,tierBefore:a.qualityTier,tierAfter:b.qualityTier,passed:true}})()' > "$OUT/reduced-idle.json"
ab eval 'window.__qaReduced={state:JSON.stringify(borrowLightDiagnostics().state),frames:borrowLightDiagnostics().frames};true' >/dev/null
ab focus '#stage';ab press 1;ab press ArrowRight
pause 500
assert '!borrowLightDiagnostics().direct.dragging&&JSON.stringify(borrowLightDiagnostics().state)!==__qaReduced.state&&borrowLightDiagnostics().frames>__qaReduced.frames' '"reduced input updates and redraws"'
ab set media dark >/dev/null
ab press Escape;pause 1800
ab click '#return-hall';pause 5500
ab eval 'window.__qaSoakStart=performance.now();true' >/dev/null
for i in $(seq 1 "${QA_CYCLES:-20}");do
  ab click '#choose-museum';pause 1800
  scroll_path .95 180;scroll_path .10 180;scroll_path .39 180
  ab click '#craft-color';ab click '#craft-zoom'
  ab focus '#craft-arm';ab press ArrowRight
  scroll_path .75 180
  drag_handle '#handle-lamp' "$((i%2==0?30:-30))" 0
  drag_handle '#handle-puppet' 0 "$((i%2==0?15:-15))"
  scroll_path .92 180
  ab fill '#compose-title' "循环回归-$i"
  ab select '#compose-scene' "$([ $((i%2)) -eq 0 ] && echo bridge || echo garden)"
  drag_handle '#handle-actor-0' "$((i%2==0?20:-20))" -5
  ab focus '#compose-pose';ab press ArrowRight
  ab scrollintoview '#compose-save';ab click '#compose-save'
  assert 'borrowLightDiagnostics().exploration.works<=6' '"six-work cap"'
  if ((i%4==0));then
    ab set viewport 393 852 >/dev/null;pause 400
    assert 'document.documentElement.scrollWidth<=innerWidth+1' '"portrait overflow"'
    ab set viewport 844 390 >/dev/null;pause 400
    assert 'document.documentElement.scrollWidth<=innerWidth+1' '"landscape overflow"'
    ab set viewport 1440 900 >/dev/null;pause 400
  fi
  scroll_path .08 180
  ab click '#return-hall';pause 2000
  ab click '#choose-game';pause 1800
  scroll_path .82 200
  ab click '#start-game'
  ab wait --fn 'borrowLightDiagnostics().direct.targets.length>0' >/dev/null
  assert 'borrowLightDiagnostics().post.mode==="direct"&&borrowLightDiagnostics().simplifiedMaterials>0' '"emergency pipeline active"'
  ab press Escape;pause 1800
  ab click '#return-hall';pause 5500
  assert 'borrowLightDiagnostics().journey.route==="public"&&!borrowLightDiagnostics().journey.transition&&!borrowLightDiagnostics().journey.interaction' '"route locks cleared"'
  ab eval "(()=>{const d=borrowLightDiagnostics();return {cycle:$i,elapsedMs:performance.now()-__qaSoakStart,stage:d.memory,passage:d.journey.opening.memory,quality:d.qualityTier,works:d.exploration.works,route:d.journey.route,errors:d.journey.opening.assetErrors}})()" > "$OUT/cycle-$(printf '%02d' "$i").json"
  printf 'Cycle %s complete\n' "$i"
done
ab errors > "$OUT/browser-errors.txt"
if [[ -s "$OUT/browser-errors.txt" ]];then cat "$OUT/browser-errors.txt" >&2;exit 1;fi
python3 - "$OUT" "${QA_CYCLES:-20}" <<'PY'
import glob,json,sys,pathlib
out=pathlib.Path(sys.argv[1]);rows=[json.load(open(p)) for p in sorted(glob.glob(str(out/'cycle-*.json')))];warm=rows[2:]
expected=int(sys.argv[2]);assert len(rows)==expected,(len(rows),expected)
assert [r['cycle'] for r in rows]==list(range(1,expected+1)),'missing or duplicate cycles'
assert len(warm)>=1,'run at least three cycles'
for r in rows:
 assert not r['errors'] and r['works']<=6 and r['route']=='public',r
for renderer in ('stage','passage'):
 for key in ('geometries','textures','programs'):
  values=[r[renderer][key] for r in warm]
  assert max(values)-min(values)<=2,(renderer,key,values)
summary={'cycles':len(rows),'durationMs':round(rows[-1]['elapsedMs']),'warmupCycles':2,'warmStart':warm[0],'end':rows[-1],'maxResourceSpread':2,'passed':True}
(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print('Resource soak: PASS')
PY
