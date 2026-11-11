import {clamp} from './route-state.js';
import {photoFrame} from './interior-framing.js';
import {sampleCameraPath} from './camera-path.js';

export const STAGE_ENTRANCE_MS=16800;
export const STAGE_ARRIVAL=.82;
const mix=(a,b,t)=>a+(b-a)*t;
export function entranceEase(a,b,value){const t=clamp((value-a)/(b-a));return t*t*t*(t*(t*6-15)+10);}
const travelKeys=[[0,0],[.19,.11],[.31,.165],[.45,.26],[.64,.49],[.73,.59],[1,STAGE_ARRIVAL]]
  .map(([t,p])=>[t,[p,0,0],[0,0,0]]);
export const stageTravelProgress=fraction=>sampleCameraPath(travelKeys,clamp(fraction)).position[0];
export const stageTravelPhase=p=>p<.12?'curtain':p<.165?'screen':p<.27?'crossing':p<.49?'market':p<.64?'arrival':'backstage';

export function theaterPhotoFrame(imageAspect,aspect,progress=0){
  const approach=entranceEase(.12,.235,progress),narrow=aspect<1.15;
  return photoFrame(imageAspect,aspect,(narrow?1.1:1.025)*Math.exp(Math.log(2.6)*approach),
    [mix(.5,.498,approach),mix(narrow?.54:.5,.4255,approach)]);
}

/** The entire original route plays: curtain → paper → market → stage → controls. */
export class StageEntrance{
  constructor(now){this.last=now;this.elapsed=0;}
  advance(now,reduced=false,ready=true){
    const delta=Math.max(0,now-this.last);this.last=now;
    if(ready&&delta<250)this.elapsed+=Math.min(delta,80);
    const fraction=ready&&reduced?1:clamp(this.elapsed/STAGE_ENTRANCE_MS);
    return {fraction,progress:stageTravelProgress(fraction),done:fraction===1};
  }
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
