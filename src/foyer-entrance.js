import {clamp} from './route-state.js';
import {photoFrame,photoRect} from './interior-framing.js';
import {sampleCameraPath} from './camera-path.js';
import {entranceEase} from './stage-entrance.js';

export const FOYER_AUTO_START=.30;
export const FOYER_REACHED=.90;
export const FOYER_OPENING={outer:[.433,.566,.411,.493],clear:[.433,.566,.735],leaf:[0,.01]};
const mix=(a,b,t)=>a+(b-a)*t;
export const publicCampusProgress=p=>.23*clamp(p/.43);
export const foyerPhase=p=>p<.29?'approach':p<.43?'threshold':p<.72?'corridor':p<FOYER_REACHED?'inner-arch':'hall';

/** Keep the single passage visible between the front door and the two choices. */
export class FoyerEntrance{
  constructor(now,from=0){
    this.last=now;this.elapsed=0;this.from=clamp(from);this.duration=11000*(1-this.from*.8);
    this.keys=[[0,this.from],[.35,mix(this.from,1,.43)],[.76,mix(this.from,1,.88)],[1,1]]
      .map(([t,p])=>[t,[p,0,0],[0,0,0]]);
  }
  advance(now,reduced=false){
    const delta=Math.max(0,now-this.last);this.last=now;
    if(delta<250)this.elapsed+=Math.min(delta,80);
    const fraction=reduced?1:clamp(this.elapsed/this.duration);
    return {fraction,progress:sampleCameraPath(this.keys,fraction).position[0],done:fraction===1};
  }
}

export function fitPhotoToOpening(imageAspect,aspect,rect,zoom=1.025){
  const local=photoFrame(imageAspect,rect.width*aspect/rect.height,zoom);
  return {x:local.x-rect.x*local.width/rect.width,y:local.y-rect.y*local.height/rect.height,
    width:local.width/rect.width,height:local.height/rect.height};
}
export function mixPhotoFrames(a,b,t){
  return Object.fromEntries(['x','y','width','height'].map(key=>[key,mix(a[key],b[key],t)]));
}
export function foyerFrame(imageAspect,aspect,progress,frontDoor){
  const t=entranceEase(.40,FOYER_REACHED,progress),zoom=1.025*Math.exp(Math.log(8/1.025)*t);
  let frame=photoFrame(imageAspect,aspect,zoom,[.5,mix(.5,.59,entranceEase(0,.8,t))]);
  if(frontDoor&&progress<.40){
    frame=mixPhotoFrames(fitPhotoToOpening(imageAspect,aspect,frontDoor),frame,entranceEase(.13,.38,progress));
  }
  return {frame,t,alignment:entranceEase(.18,.86,t),
    aperture:photoRect([FOYER_OPENING.outer[0],FOYER_OPENING.outer[2],FOYER_OPENING.outer[1]-FOYER_OPENING.outer[0],FOYER_OPENING.clear[2]-FOYER_OPENING.outer[2]],frame)};
}
