import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('drag helper preserves the caller loop index',()=>{
  const result=spawnSync('bash',['-c',`
    source scripts/qa/browser-common.sh
    ab(){ if [[ "$1" == eval ]];then printf '{"x":100,"y":100}\\n';fi;return 0; }
    pause(){ :; }
    i=17
    drag_handle '#example' 12 6
    [[ "$i" == 17 ]]
  `],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||'drag_handle overwrote the caller index');
});
