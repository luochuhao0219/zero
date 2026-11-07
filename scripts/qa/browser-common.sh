#!/usr/bin/env bash
# Only agent-browser drives the browser. eval reads diagnostics/geometry or scrolls the native document.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ab(){ agent-browser --session "${QA_SESSION:-zero-desktop}" "$@"; }
pause(){ ab wait "${1:-900}" >/dev/null; }
scroll_path(){
  ab eval "(async()=>{const a=scrollY,b=$1*(document.querySelector('#journey-opening').offsetHeight-innerHeight),t=performance.now();await new Promise(done=>{function f(n){const p=Math.min(1,(n-t)/$2),s=p*p*(3-2*p);scrollTo({top:a+(b-a)*s,behavior:'instant'});if(p<1)requestAnimationFrame(f);else done();}requestAnimationFrame(f)});return {scrollY}})()" >/dev/null
  pause 700
}
drag_handle(){
  local selector="$1" dx="$2" dy="$3" x y
  read -r x y < <(ab eval "(()=>{const r=document.querySelector('$selector').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["x"],d["y"])')
  ab mouse move "$x" "$y" >/dev/null;ab mouse down >/dev/null
  for i in 1 2 3 4 5 6;do ab mouse move "$((x+dx*i/6))" "$((y+dy*i/6))" >/dev/null;done
  ab mouse up >/dev/null;pause 500
}
keys(){
  python3 -c 'import json,sys;print(json.dumps([["press",sys.argv[1]] for _ in range(int(sys.argv[2]))]))' "$1" "$2" | ab batch --bail >/dev/null
}
