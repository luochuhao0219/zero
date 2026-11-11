/** Original pentatonic chamber scores, synthesized locally with no media downloads. */
export const SOUNDTRACKS=[{id:'none',name:'静静看戏',detail:'只留光影，不放配乐'},{id:'strings',name:'月下丝弦',detail:'拨弦、竹笛与疏落铃音'},{id:'festival',name:'灯市小调',detail:'轻快弦音、木鱼与小鼓'},{id:'rain',name:'雨落庭院',detail:'细雨、慢弦与远处笛声'}];
export const soundtrack=id=>SOUNDTRACKS.find(s=>s.id===(id==='gong'?'festival':id))||SOUNDTRACKS[0];
const tempos={strings:72,festival:92,rain:62};
const chords=[[50,54,57],[47,50,54],[40,47,54],[45,47,52]];
const phrases=[[[0,74,3],[4,76,2],[6,69,2],[10,66,3],[14,69,2]],[[0,71,4],[6,69,2],[8,66,3],[12,64,3]],[[0,66,2],[3,69,3],[8,71,3],[12,74,4]],[[0,76,3],[4,71,2],[8,69,4],[14,66,2]],[[0,69,4],[6,66,2],[8,64,3],[12,62,4]],[[0,64,3],[4,66,3],[8,69,3],[12,71,4]],[[0,74,4],[6,71,2],[8,69,4],[14,66,2]],[[0,64,4],[6,66,2],[8,62,7]]];
export const stepSeconds=kind=>30/(tempos[soundtrack(kind).id]||72);
/** Immutable note events make the online scheduler and offline checks agree. */
export function scoreStep(kind,step){
 const id=soundtrack(kind).id;if(id==='none')return [];const beat=stepSeconds(id),bar=Math.floor(step/8),chord=chords[Math.floor(bar/2)%4],within=step%16,events=[];
 const add=(instrument,note,duration,level,pan=0)=>events.push({instrument,note,duration,level,pan});
 if(step%2===0)add('pluck',chord[(step/2)%3]+12,1.8,id==='festival'?.2:.15,-.35);
 const phrase=phrases[Math.floor(step/16)%phrases.length],melody=phrase.find(n=>n[0]===within);
 if(melody){const note=melody[1]+(id==='rain'?-12:0);add(id==='festival'?'pluck':'flute',note,Math.max(.65,melody[2]*beat*.92),id==='festival'?.27:.13,.22);if(id==='festival'&&within%4===0)add('flute',note-12,melody[2]*beat*.85,.055,.3);}
 if(step%16===0)for(const note of chord)add('pad',note,beat*15.5,.028,0);
 if(step%32===28)add('bell',chord[1]+24,2.8,.055,-.15);
 if(id==='festival'&&step%8===0)add('drum',38,.3,.15,0);
 if(id==='festival'&&step%4===2)add('wood',82,.12,.07,-.18);
 if(id==='strings'&&step%16===8)add('wood',78,.1,.026,.18);
 return events;
}
const midiHz=note=>440*2**((note-69)/12);
function random(seed){let state=seed>>>0||1;return ()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296*2-1;};}
/** Small physical-model string and breathy additive voices; envelopes are baked once. */
export function voiceSamples(instrument,note,duration,rate=24000,seed=31){
 const length=Math.ceil(rate*duration),data=new Float32Array(length),frequency=midiHz(note),noise=random(seed+note*313),period=Math.max(2,Math.round(rate/frequency-.5)),ring=new Float32Array(period);let filtered=0,phase=0;
 if(instrument==='pluck')for(let n=0;n<period;n++)ring[n]=noise()*.8;
 for(let n=0;n<length;n++){
  const t=n/rate,end=(length-n)/rate;let value;
  if(instrument==='pluck'){const k=n%period;value=ring[k];ring[k]=(ring[k]+ring[(k+1)%period])*.4984;value*=Math.min(1,t/.004,end/.12);}
  else if(instrument==='flute'){phase+=2*Math.PI*frequency/rate*(1+.0022*Math.sin(t*31)*Math.min(1,t/.4));filtered=filtered*.84+noise()*.16;const env=Math.min(1,t/.14,end/.28);value=(Math.sin(phase)*.72+Math.sin(phase*2)*.16+Math.sin(phase*3)*.045+filtered*.075)*env;}
  else if(instrument==='pad'){const env=Math.min(1,t/.75,end/1.3);value=(Math.sin(t*frequency*Math.PI*2)*.65+Math.sin(t*frequency*1.003*Math.PI*2)*.25+Math.sin(t*frequency*4*Math.PI)*.1)*env;}
  else if(instrument==='bell')value=(Math.sin(t*frequency*Math.PI*2)+.18*Math.sin(t*frequency*2.76*Math.PI*2)+.06*Math.sin(t*frequency*4.1*Math.PI*2))*Math.exp(-t*2.5)*Math.min(1,t/.008,end/.12);
  else if(instrument==='drum'){phase+=2*Math.PI*(56+76*Math.exp(-t*32))/rate;value=(Math.sin(phase)+noise()*.04)*Math.exp(-t*19)*Math.min(1,t/.004,end/.025);}
  else value=(noise()*.35+Math.sin(t*frequency*Math.PI*2)*.65)*Math.exp(-t*56)*Math.min(1,t/.002,end/.015);
  data[n]=value*.72;
 }return data;
}
function impulse(context){const rate=context.sampleRate,length=Math.floor(rate*1.45),buffer=context.createBuffer(2,length,rate),noise=random(8021);for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let n=0;n<length;n++)data[n]=noise()*Math.exp(-n/rate*5)*.3;}return buffer;}
/** Bounded look-ahead scheduling; changing volume never restarts a melody. */
export class TheaterScore {
 constructor(context,kind='strings',volume=.4){
  this.context=context;this.kind=soundtrack(kind).id;this.volume=volume;this.warmth=.5;this.buffers=new Map();this.voices=new Set();this.nodes=[];this.running=false;
  const c=context;this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);this.bus=c.createGain();this.bus.gain.value=.8;this.bus.connect(this.master);this.reverb=c.createConvolver();this.reverb.buffer=impulse(c);this.wet=c.createGain();this.wet.gain.value=.2;this.bus.connect(this.reverb).connect(this.wet).connect(this.master);
 }
 start(){if(this.running||this.kind==='none')return;this.running=true;this.step=0;this.next=this.context.currentTime+.06;this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.22);if(this.kind==='rain')this.startRain();this.schedule();this.timer=setInterval(()=>this.schedule(),90);}
 setVolume(volume){this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.4));if(this.running)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.12);}
 setWarmth(value){this.warmth=Math.max(0,Math.min(1,value));}
 schedule(){if(!this.running)return;const now=this.context.currentTime;if(this.next<now-.3){this.step+=Math.ceil((now-this.next)/stepSeconds(this.kind));this.next=now+.04;}let budget=0;while(this.next<now+.22&&budget++<4){for(const event of scoreStep(this.kind,this.step))this.note(event,this.next);this.step++;this.next+=stepSeconds(this.kind);}}
 note(event,time){
  if(this.voices.size>=48)return;const c=this.context,key=`${event.instrument}:${event.note}:${event.duration.toFixed(3)}`;let buffer=this.buffers.get(key);
  if(!buffer){const data=voiceSamples(event.instrument,event.note,event.duration,24000);buffer=c.createBuffer(1,data.length,24000);buffer.getChannelData(0).set(data);if(this.buffers.size>=64)this.buffers.delete(this.buffers.keys().next().value);this.buffers.set(key,buffer);}
  const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner?.();source.buffer=buffer;gain.gain.value=event.level*(event.instrument==='flute'?.65+this.warmth*.45:1);source.connect(gain);if(pan){pan.pan.value=event.pan;gain.connect(pan).connect(this.bus);}else gain.connect(this.bus);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();pan?.disconnect();};source.start(time);source.stop(time+event.duration+.01);
 }
 startRain(){const c=this.context,buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0),noise=random(149);let last=0;for(let n=0;n<data.length;n++){last=last*.93+noise()*.07;data[n]=last*Math.min(1,n/(c.sampleRate*.06),(data.length-1-n)/(c.sampleRate*.06));}const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=2700;gain.gain.value=.12;source.connect(filter).connect(gain).connect(this.bus);source.start();this.rain=source;this.nodes.push(source,filter,gain);}
 stop(){clearInterval(this.timer);this.timer=null;this.running=false;const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(0,now,.025);for(const source of this.voices)try{source.stop(now+.12);}catch{}if(this.rain){try{this.rain.stop(now+.12);}catch{}this.rain=null;}}
 dispose(){this.stop();for(const node of [this.bus,this.reverb,this.wet,this.master,...this.nodes])node.disconnect();this.nodes=[];this.buffers.clear();}
}
/** Owns its context, so preview / performance / collection cannot leak audio sessions. */
export class StudioSound {
 constructor({onStateChange=()=>{},onError=()=>{}}={}){this.onStateChange=onStateChange;this.onError=onError;}
 get active(){return !!this.score?.running;}
 async start(kind,volume=.4){
  this.stop();if(soundtrack(kind).id==='none')return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){this.onError();return;}
  try{const context=new Audio();this.context=context;await context.resume();if(this.context!==context)return;this.score=new TheaterScore(context,kind,volume);this.score.start();this.onStateChange();}catch{this.stop();this.onError();}
 }
 setVolume(value){this.score?.setVolume(value);}
 stop(){const context=this.context,score=this.score;this.context=null;this.score=null;score?.stop();this.onStateChange();if(context){setTimeout(()=>{score?.dispose();if(context.state!=='closed')context.close().catch(()=>{});},140);}}
}
