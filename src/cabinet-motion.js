import {MUSEUM_STOPS,clamp,smooth} from './route-state.js';

export const CABINET_LOOP_SECONDS=8;
export const ANIMATED_CABINET='people';
const stop=MUSEUM_STOPS.find(item=>item.id===ANIMATED_CABINET);

export function cabinetMotionAmount(progress,visible=true,reduced=false){
  return visible&&!reduced?1-smooth(.025,.065,Math.abs(progress-stop.at)):0;
}

// A measured greeting, with time to rest between gestures. The endpoints are
// identical and have zero velocity, so neither the pose nor its speed jumps.
export function cabinetPose(seconds,amount=1){
  const t=((seconds%CABINET_LOOP_SECONDS)+CABINET_LOOP_SECONDS)%CABINET_LOOP_SECONDS;
  const strength=clamp(amount);
  const salute=smooth(.55,2.10,t)*(1-smooth(4.05,5.85,t));
  const bow=smooth(2.05,2.95,t)*(1-smooth(3.45,4.65,t));
  return {front:35+58*salute*strength,back:10+34*salute*strength,bow:-.065*bow*strength};
}

/** Freeze the local clock while paused, reading, offscreen or in another room. */
export class CabinetClock {
  constructor(){this.seconds=0;this.last=null;this.running=false;}
  tick(now,enabled){
    const delta=this.last===null?0:now-this.last;
    if(enabled&&this.running&&delta>=0&&delta<.25)this.seconds=(this.seconds+delta)%CABINET_LOOP_SECONDS;
    this.last=now;this.running=enabled;
    return this.seconds;
  }
}
