/** Conservative one-way degradation. Pauses do not count as slow frames. */
export class AdaptiveQuality {
  constructor() { this.tier=0;this.samples=[];this.last=null; }
  resetClock() { this.last=null; }
  observe(now) {
    const elapsed=this.last===null?0:now-this.last;this.last=now;
    if(elapsed<=0||elapsed>5000||this.tier>=4)return false;
    this.samples.push(elapsed);
    const severe=this.samples.length>=20&&this.samples.slice(-20).every(frame=>frame>100);
    if(this.samples.length<150&&!severe)return false;
    const sorted=this.samples.sort((a,b)=>a-b);this.samples=[];
    if(sorted[Math.floor(sorted.length*.5)]<=22)return false;
    this.tier++;return true;
  }
}
export const qualityPixelRatio=(base,tier)=>Math.min(base,[Infinity,1.25,1,.85,.7][tier]);
