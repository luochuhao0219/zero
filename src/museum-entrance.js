import {clamp,smooth} from './route-state.js';
import {photoFrame,photoPoint} from './interior-framing.js';
import {walkingPose} from './walking-path.js';
import {GALLERY_SHELL} from './gallery-layout.js';

export const MUSEUM_ARRIVAL=.12;
export const MUSEUM_ENTRANCE_MS=5600;
export const HALL_ZOOM=1.035;
export const HALL_OPENINGS={
  wide:{outer:[.171,.456,.197,.338],clear:[.220,.408,.816],leaf:[.267,.324],focus:[.314,.535],vanish:[.384,.529]},
  narrow:{outer:[.144,.445,.430,.495],clear:[.191,.403,.734],leaf:[.473,.497],focus:[.297,.609],vanish:[.373,.583]},
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
  const pan=smooth(0,.56,t),zoom=HALL_ZOOM*Math.exp(Math.log(8/HALL_ZOOM)*smooth(0,1,t));
  const focus=[.5+(opening.focus[0]-.5)*pan,.5+(opening.focus[1]-.5)*pan];
  const frame=photoFrame(imageAspect,viewportAspect,zoom,focus);
  // Resolve the room while it still occupies the small doorway, before the
  // forward push magnifies it. The stone arch and door leaves never dissolve.
  return {t,opening,frame,reveal:smooth(.015,.24,t),alignment:1-smooth(.32,.82,t),vanish:photoPoint(opening.vanish,frame)};
}

/** Finish on the exact camera path used by subsequent forward/backward scroll. */
export function museumEntrancePose(progress){
  const walking=walkingPose(progress);
  if(progress>=MUSEUM_ARRIVAL)return walking;
  const t=clamp(progress/MUSEUM_ARRIVAL),z=10-8*smooth(0,1,t),blend=smooth(.065,MUSEUM_ARRIVAL,progress);
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
  const vertical=aspect<1.15?.16:0;
  if(vertical)camera.setViewOffset(aspect,1,0,vertical,aspect,1);
  else camera.clearViewOffset();
  const distance=Math.min(maxDistance,Math.max(6.6,6.5/(2*Math.tan(camera.fov*Math.PI/360)*aspect)));
  camera.position.copy(pose.position);camera.position.x+=distance-4.9;
  camera.lookAt(pose.look);camera.updateMatrixWorld();
  if(entrance?.alignment>0){
    const axis=pose.position.clone().set(0,2.15,-2000).project(camera);
    const dx=((axis.x+1)/2-entrance.vanish[0])*entrance.alignment;
    const dy=((1-axis.y)/2-entrance.vanish[1])*entrance.alignment;
    // setViewOffset also sets camera.aspect; normalized 1×1 dimensions would
    // silently squeeze the lens and jump when adaptive quality next resizes it.
    camera.setViewOffset(aspect,1,dx*aspect,vertical+dy,aspect,1);
  }
}
