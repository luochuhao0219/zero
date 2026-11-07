// A quiet, original synthesized sound bed. It contains no recordings or chants.
// The visitor explicitly enables it; scroll position crossfades the two spaces.
export class TravelSound {
  constructor(context){
    this.context=context;this.enabled=false;this.warmth=0;
    const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);
    let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.035)/1.035;data[i]=last*3;}
    this.wind=context.createGain();this.street=context.createGain();this.wind.gain.value=this.street.gain.value=0;
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
    const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=620;
    const band=context.createBiquadFilter();band.type='bandpass';band.frequency.value=950;band.Q.value=.6;
    source.connect(low).connect(this.wind).connect(context.destination);source.connect(band).connect(this.street).connect(context.destination);source.start();
    this.nextBell=0;
  }
  set(progress,enabled,playing=false){
    const time=this.context.currentTime,warmth=Math.max(0,Math.min(1,(progress-.35)/.4));
    this.enabled=enabled;this.warmth=playing?1:warmth;
    this.wind.gain.setTargetAtTime(enabled?.06*(1-this.warmth*.75):0,time,.6);
    this.street.gain.setTargetAtTime(enabled?.055*this.warmth:0,time,.7);
    if(enabled&&this.warmth>.25&&time>this.nextBell){this.bell();this.nextBell=time+6;}
  }
  bell(){
    const time=this.context.currentTime;
    for(const [frequency,level] of [[587.33,.006],[1174.66,.002],[1761.99,.001]]){
      const osc=this.context.createOscillator(),gain=this.context.createGain();osc.type='sine';osc.frequency.value=frequency;
      gain.gain.setValueAtTime(.00001,time);gain.gain.exponentialRampToValueAtTime(level,time+.02);gain.gain.exponentialRampToValueAtTime(.00001,time+2.3);
      osc.connect(gain).connect(this.context.destination);osc.start(time);osc.stop(time+2.4);
    }
  }
}
