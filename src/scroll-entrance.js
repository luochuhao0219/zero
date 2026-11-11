import {clamp} from './route-state.js';

/** Input owns the distance; the frame clock only softens the last scroll step. */
export class ScrollEntrance {
  constructor(distance,sample){
    this.distance=distance;this.sample=sample;this.target=0;this.fraction=0;this.moved=false;this.direction=0;
  }
  move(delta){
    if(!delta)return;
    this.direction=Math.sign(delta);this.target=clamp(this.target+delta/this.distance);
    this.moved ||= this.target>0;
  }
  advance(dt,reduced=false,ready=true){
    if(ready){
      this.fraction=reduced?this.target:this.fraction+(this.target-this.fraction)*(1-Math.exp(-18*dt));
      if(Math.abs(this.fraction-this.target)<.0001)this.fraction=this.target;
    }
    return {fraction:this.fraction,progress:this.sample(this.fraction),
      done:ready&&this.fraction===1,
      cancelled:ready&&this.moved&&this.direction<0&&this.target===0&&this.fraction===0};
  }
}
