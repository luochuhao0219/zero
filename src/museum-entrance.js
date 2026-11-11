import {clamp,smooth} from './route-state.js';
import {photoFrame,photoPoint} from './interior-framing.js';
import {walkingPose} from './walking-path.js';
import {GALLERY_SHELL} from './gallery-layout.js';

export const MUSEUM_ARRIVAL=.12;
export const MUSEUM_ENTRANCE_MS=6400;
export const HALL_ZOOM=1.035;
export const HALL_OPENINGS={
  wide:{outer:[.300,.700,.399,.400],clear:[.300,.700,.849],leaf:[.399,.400],focus:[.5,.625],vanish:[.5,.625]},
  narrow:{outer:[.253,.744,.448,.449],clear:[.253,.744,.720],leaf:[.448,.449],focus:[.4985,.584],vanish:[.4985,.584]},
};

const ease=t=>t*t*t*(t*(t*6-15)+10);

/** One playback clock owns the entrance until native scrolling takes over. */
export class MuseumEntrance {
  constructor(now){this.last=now;this.elapsed=0;}
  advance(now,reduced=false){
    const elapsed=Math.max(0,now-this.last);this.last=now;
    // Returning from a hidden/throttled tab must not skip the doorway.
    if(elapsed<250)this.elapsed+=Math.min(elapsed,80);
    const fraction=reduced?1:clamp(this.elapsed/MUSEUM_ENTRANCE_MS);
    return {fraction,progress:MUSEUM_ARRIVAL*ease(fraction),done:fraction===1};
  }
}

export function museumEntranceFrame(imageAspect,viewportAspect,progress){
  const t=clamp(progress/MUSEUM_ARRIVAL),opening=HALL_OPENINGS[viewportAspect<1.15?'narrow':'wide'];
  const pan=smooth(.18,.64,t),zoom=HALL_ZOOM*Math.exp(Math.log(8/HALL_ZOOM)*smooth(.24,1,t));
  const focus=[.5+(opening.focus[0]-.5)*pan,.5+(opening.focus[1]-.5)*pan];
  const frame=photoFrame(imageAspect,viewportAspect,zoom,focus);
  // First swing the photographed timber leaves, then cross the open threshold.
  return {t,opening,frame,reveal:1,swing:smooth(0,.30,t),alignment:1-smooth(.65,1,t),vanish:photoPoint(opening.vanish,frame)};
}

/** Finish on the exact camera path used by subsequent forward/backward scroll. */
export function museumEntrancePose(progress){
  const walking=walkingPose(progress);
  if(progress>=MUSEUM_ARRIVAL)return walking;
  const t=clamp(progress/MUSEUM_ARRIVAL),z=4-2*smooth(0,1,t),blend=smooth(.065,MUSEUM_ARRIVAL,progress);
  const position=walking.position.clone().set(0,2.15,z).lerp(walking.position,blend);
  const look=walking.look.clone().set(0,2,z-8).lerp(walking.look,blend);
  return {position,look};
}

/** Keep the real viewport aspect while matching the photo's vanishing point. */
export function syncGalleryCamera(camera,pose,aspect,entrance){
  camera.aspect=aspect;
  const maxDistance=GALLERY_SHELL.right-.55+4.9;
  const requiredFov=2*Math.atan(6.5/(2*maxDistance*aspect))*180/Math.PI;
  camera.fov=Math.min(85,Math.max(camera.userData.baseFov||(aspect<1.15?62:50),requiredFov));
  // Start on the centered doorway axis, then settle into the normal gallery
  // camera while walking across the sill.
  const entryWeight=entrance?1-smooth(.65,1,entrance.t):0;
  const entryFov=Math.max(camera.fov,aspect<1.15?80:65);
  camera.fov+=(entryFov-camera.fov)*entryWeight;
  const vertical=aspect<1.15?.16:0;
  if(vertical)camera.setViewOffset(aspect,1,0,vertical,aspect,1);
  else camera.clearViewOffset();
  const distance=Math.min(maxDistance,Math.max(6.6,6.5/(2*Math.tan(camera.fov*Math.PI/360)*aspect)));
  camera.position.copy(pose.position);camera.position.x+=distance-4.9;
  camera.position.x*=1-entryWeight;
  const look=pose.look.clone();look.x+=(camera.position.x-look.x)*entryWeight;
  camera.lookAt(look);camera.updateMatrixWorld();
  if(entrance?.alignment>0){
    const axis=pose.position.clone().set(0,2.15,-2000).project(camera);
    const dx=((axis.x+1)/2-entrance.vanish[0])*entrance.alignment;
    const dy=((1-axis.y)/2-entrance.vanish[1])*entrance.alignment;
    // setViewOffset also sets camera.aspect; normalized 1×1 dimensions would
    // silently squeeze the lens and jump when adaptive quality next resizes it.
    camera.setViewOffset(aspect,1,dx*aspect,vertical+dy,aspect,1);
  }
}
