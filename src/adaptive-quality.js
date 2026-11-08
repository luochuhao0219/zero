/** Conservative one-way degradation. Pauses do not count as slow frames. */
export class AdaptiveQuality {
  constructor() { this.tier=0;this.samples=[];this.last=null; }
  resetClock() { this.last=null;this.samples=[]; }
  observe(now) {
    const elapsed=this.last===null?0:now-this.last;this.last=now;
    if(elapsed>5000){this.resetClock();return false;}
    if(elapsed<=0||this.tier>=4)return false;
    this.samples.push(elapsed);
    // Bound emergency recovery by time, not 20 one-second frames per tier.
    const recent=this.samples.slice(-20);
    const severe=recent.length>=4&&recent.every(frame=>frame>100)&&recent.reduce((a,b)=>a+b,0)>=2000;
    if(this.samples.length<150&&!severe)return false;
    const sorted=this.samples.sort((a,b)=>a-b);this.samples=[];
    if(sorted[Math.floor(sorted.length*.5)]<=22)return false;
    this.tier++;return true;
  }
}
export const qualityPixelRatio=(base,tier)=>Math.min(base,[Infinity,1.25,1,.85,.7][tier]);
