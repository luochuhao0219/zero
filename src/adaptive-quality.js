/** Pauses do not count as slow frames; recovery is opt-in for the gallery. */
export class AdaptiveQuality {
  constructor({recoverAfter=0}={}) { this.tier=0;this.samples=[];this.last=null;this.recoverAfter=recoverAfter;this.fastTime=0;this.recoverAt=0; }
  resetClock() { this.last=null;this.samples=[];this.fastTime=0; }
  observe(now) {
    const elapsed=this.last===null?0:now-this.last;this.last=now;
    if(elapsed>5000){this.resetClock();return false;}
    if(elapsed<=0||(this.tier>=4&&!this.recoverAfter))return false;
    this.samples.push(elapsed);
    // Bound emergency recovery by time, not 20 one-second frames per tier.
    const recent=this.samples.slice(-20);
    const severe=recent.length>=4&&recent.every(frame=>frame>100)&&recent.reduce((a,b)=>a+b,0)>=2000;
    if(this.samples.length<150&&!severe)return false;
    const sorted=this.samples.sort((a,b)=>a-b);this.samples=[];
    const median=sorted[Math.floor(sorted.length*.5)],p95=sorted[Math.floor(sorted.length*.95)];
    if(median<=22){
      this.fastTime=median<=18.5&&p95<=24?this.fastTime+median*sorted.length:0;
      if(this.recoverAfter&&this.tier>0&&this.fastTime>=this.recoverAfter&&now>=this.recoverAt){
        this.tier--;this.fastTime=0;this.recoverAt=now+this.recoverAfter;return true;
      }
      return false;
    }
    this.fastTime=0;
    if(this.tier>=4)return false;
    this.tier++;this.recoverAt=now+this.recoverAfter*2;return true;
  }
}
export const qualityPixelRatio=(base,tier)=>Math.min(base,[Infinity,1.25,1,.85,.7][tier]);
