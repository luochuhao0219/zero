import {clamp} from './route-state.js';
import {photoFrame,photoRect} from './interior-framing.js';
import {HALL_ZOOM} from './museum-entrance.js';
import {sampleCameraPath} from './camera-path.js';

export const STAGE_ENTRANCE_MS=14800;
export const STAGE_ARRIVAL=.82;
export const STAGE_OPENINGS={
  wide:{outer:[.548,.846,.199,.346],clear:[.587,.788,.812],leaf:[.269,.322],focus:[.688,.540]},
  narrow:{outer:[.544,.871,.430,.500],clear:[.589,.811,.734],leaf:[.473,.499],focus:[.701,.605]},
};
const mix=(a,b,t)=>a+(b-a)*t;
export function entranceEase(a,b,value){const t=clamp((value-a)/(b-a));return t*t*t*(t*(t*6-15)+10);}
const travelKeys=[[0,0],[.19,.11],[.31,.165],[.45,.26],[.64,.49],[.73,.59],[1,STAGE_ARRIVAL]]
  .map(([t,p])=>[t,[p,0,0],[0,0,0]]);
export const stageTravelProgress=fraction=>sampleCameraPath(travelKeys,clamp(fraction)).position[0];
export const stageTravelPhase=p=>p<.12?'door':p<.165?'screen':p<.27?'crossing':p<.49?'market':p<.64?'arrival':'backstage';

/** The entire original route plays: door → paper → market → stage → controls. */
export class StageEntrance{
  constructor(now){this.last=now;this.elapsed=0;}
  advance(now,reduced=false,ready=true){
    const delta=Math.max(0,now-this.last);this.last=now;
    if(ready&&delta<250)this.elapsed+=Math.min(delta,80);
    const fraction=ready&&reduced?1:clamp(this.elapsed/STAGE_ENTRANCE_MS);
    return {fraction,progress:stageTravelProgress(fraction),done:fraction===1};
  }
}

/** The photographed right doorway reveals the original indoor paper screen. */
export function stageEntranceFrame(imageAspect,aspect,progress){
  const t=clamp(progress/.12),opening=STAGE_OPENINGS[aspect<1.15?'narrow':'wide'];
  const pan=entranceEase(0,.60,t),zoom=HALL_ZOOM*Math.exp(Math.log(8/HALL_ZOOM)*entranceEase(0,1,t));
  const frame=photoFrame(imageAspect,aspect,zoom,[mix(.5,opening.focus[0],pan),mix(.5,opening.focus[1],pan)]);
  return {t,opening,frame,reveal:entranceEase(.01,.30,t),
    aperture:photoRect([opening.outer[0],opening.outer[2],opening.outer[1]-opening.outer[0],opening.clear[2]-opening.outer[2]],frame)};
}

/** A continuous final arc reaches the regular game camera without a second cut. */
export function stageEntrancePose(storyProgress,fitted,targetAngle){
  const keys=[
    [.59,[.03,30,6],[-1.5,3.5,-.65]],
    [.65,[.17,24,5.8],[-2.9,3.5,-.65]],
    [.70,[.32,22,5.9],[-2,3.4,-.65]],
    [.78,[targetAngle,24,6.5],[0,3.5,-.65]],
    [.21+STAGE_ARRIVAL*.79,[targetAngle,21.6,6.15],[0,3.5,-.65]],
  ];
  const sample=sampleCameraPath(keys,storyProgress),[angle,scale,y]=sample.position,radius=scale*fitted/21.6;
  return {angle,position:[Math.sin(angle)*radius,y,Math.cos(angle)*radius-.7],look:sample.look};
}
