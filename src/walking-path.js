import * as THREE from '../vendor/three.module.js';
import {MUSEUM_ENTRY,MUSEUM_STOPS,clamp,smooth} from './route-state.js';
import {CABINET_SPACING} from './gallery-layout.js';
const V=(...p)=>new THREE.Vector3(...p);
export const cabinetZ=i=>-8-i*CABINET_SPACING;
// Arrival is perpendicular to the glazing. Walking and turning use zero-slope
// easing at every stop; sampling the same path backwards is exactly reversible.
export function walkingPose(p){
  let previous={at:MUSEUM_ENTRY,z:2};
  for(let i=0;i<5;i++){
    const stop=MUSEUM_STOPS[i],z=cabinetZ(i);
    if(p<=stop.at){
      const t=clamp((p-previous.at)/(stop.at-previous.at));
      const walk=smooth(0,.72,t),turn=smooth(.38,1,t);
      const startLook=previous.at===MUSEUM_ENTRY?[0,2,previous.z-8]:[-4.9,2.15,previous.z];
      // First turn back toward the aisle, then turn into the next display.
      const aisle=smooth(0,.28,t)*(1-turn);
      const camera=V(0,2.15,THREE.MathUtils.lerp(previous.z,z,walk));
      const look=V(...startLook).lerp(V(0,2,camera.z-8),aisle).lerp(V(-4.9,2.15,z),turn);
      return {position:camera,look};
    }
    previous={at:stop.at,z};
  }
  const t=smooth(MUSEUM_STOPS.at(-1).at,1,p);
  return {position:V(0,THREE.MathUtils.lerp(2.15,2.4,t),THREE.MathUtils.lerp(cabinetZ(4),-46.6,t)),
    look:V(-4.9,2.15,cabinetZ(4)).lerp(V(0,2.4,-54),t)};
}
