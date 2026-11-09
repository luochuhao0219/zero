import {MUSEUM_ENTRY,MUSEUM_STOPS,clamp,smooth,museumStop} from './route-state.js';

export const CABINET_VIEWS = {
  corridor:{focus:[.5,.5],mobileFocus:[.42,.5],zoom:1},
  heritage:{focus:[.42,.5],mobileFocus:[.30,.49],zoom:1.04},
  craft:{focus:[.57,.5],mobileFocus:[.574,.48],zoom:1.10},
  voices:{focus:[.66,.5],mobileFocus:[.678,.47],zoom:1.15},
  people:{focus:[.72,.5],mobileFocus:[.735,.46],zoom:1.20},
  legacy:{focus:[.765,.5],mobileFocus:[.765,.46],zoom:1.24},
};

// Cabinet locations belong to the corridor photograph, so markers move with
// the exact same cover crop as the image instead of drifting on a resized page.
export const CABINET_POINTS = [[.30,.50],[.574,.51],[.678,.57],[.735,.43],[.765,.56]];
const views=[{id:'corridor',at:MUSEUM_ENTRY},...MUSEUM_STOPS];

/** A reversible walk with still intervals beside each cabinet. */
export function galleryJourney(progress){
  const p=clamp(progress),stop=museumStop(p);
  let left=views[0],right=views[0],blend=0;
  for(let i=1;i<views.length;i++){
    if(p<=views[i].at){
      left=views[i-1];right=views[i];
      blend=smooth(left.at+(i===1?.018:.033),right.at-.033,p);break;
    }
    left=right=views[i];
  }
  const delta=stop===MUSEUM_STOPS.at(-1)?Math.min(0,p-stop.at):p-stop.at;
  return {
    from:left.id,to:right.id,blend,
    cabinet:stop.id,
    overview:1-smooth(.12,.17,p),
    reading:1-smooth(.034,.065,Math.abs(delta)),
  };
}
