import {MUSEUM_STOPS} from './route-state.js';
/** Snap to a cabinet on arrival; fresh scrolling always lets the visitor leave. */
export class CabinetVisit {
  constructor(){this.reset();}
  reset(){this.aligned=null;this.dismissed=null;this.destination=null;this.pendingTarget=null;}
  // An explicit cabinet/overview shortcut can pass intermediate exhibits.
  seek(target){this.reset();this.destination=target;}
  interrupt(){this.destination=null;}
  constrain(current,target){
    if(this.destination!==null){
      if(Math.abs(current-this.destination)>.001)return target;
      this.aligned=MUSEUM_STOPS.find(s=>Math.abs(s.at-this.destination)<.001)||null;
      this.destination=null;
    }
    if(this.aligned){
      const departing=Math.abs(target-this.aligned.at)>=.0001;
      // Finish the short turn before consuming scroll input received during it.
      // The queued movement resumes automatically, never requiring another click.
      if(Math.abs(current-this.aligned.at)>.00002){
        if(departing)this.pendingTarget=target;
        return this.aligned.at;
      }
      if(!departing&&this.pendingTarget===null)return this.aligned.at;
      if(!departing)target=this.pendingTarget;
      this.pendingTarget=null;this.dismissed=this.aligned;this.aligned=null;
    }
    // Hysteresis prevents the same cabinet from immediately grabbing the camera
    // again while departing or reversing close to its front-facing pose.
    if(this.dismissed&&Math.abs(current-this.dismissed.at)>.035)this.dismissed=null;
    const forward=target>=current;
    const stops=MUSEUM_STOPS.filter(s=>s!==this.dismissed&&(forward?s.at>=current-.001&&s.at<=target:s.at<=current+.001&&s.at>=target));
    const stop=forward?stops[0]:stops.at(-1);
    if(stop){this.aligned=stop;return stop.at;}
    return target;
  }
}
