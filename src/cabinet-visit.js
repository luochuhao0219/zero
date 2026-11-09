import {MUSEUM_STOPS} from './route-state.js';
/** Scroll can approach a cabinet, but only an explicit action releases it. */
export class CabinetVisit {
  constructor(){this.locked=null;this.dismissed=null;}
  reset(){this.locked=this.dismissed=null;}
  constrain(current,target){
    if(this.locked)return this.locked.at;
    if(this.dismissed&&Math.abs(current-this.dismissed.at)>.035)this.dismissed=null;
    const forward=target>=current;
    const stops=MUSEUM_STOPS.filter(s=>s!==this.dismissed&&(forward?s.at>=current-.001&&s.at<=target:s.at<=current+.001&&s.at>=target));
    const stop=forward?stops[0]:stops.at(-1);
    if(stop){this.locked=stop;return stop.at;}
    return target;
  }
  finish(){if(!this.locked)return false;this.dismissed=this.locked;this.locked=null;return true;}
}
