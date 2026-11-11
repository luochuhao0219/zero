import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUNDTRACKS,soundtrack,scoreStep,stepSeconds,voiceSamples,TheaterScore,StudioSound} from '../src/theater-score.js';
import {TravelSound} from '../src/travel-sound.js';
import {defaultDraft,sanitizeDraft} from '../src/explore-data.js';

function fixture(t){
 const intervals=new Set(),delays=[];const oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval,oldTimeout=globalThis.setTimeout;
 globalThis.setInterval=fn=>{intervals.add(fn);return fn;};globalThis.clearInterval=fn=>intervals.delete(fn);globalThis.setTimeout=fn=>{delays.push(fn);return fn;};t.after(()=>{globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;globalThis.setTimeout=oldTimeout;});
 const param=()=>({value:0,calls:[],setTargetAtTime(value,time,constant){this.calls.push({value,time,constant});},cancelScheduledValues(){}});
 const node=()=>({connect(other){return other;},disconnect(){this.disconnected=true;},gain:param(),pan:param(),frequency:param()});
 const sources=[],context={currentTime:0,sampleRate:8000,state:'running',destination:node(),createGain:node,createStereoPanner:node,createConvolver:node,createBiquadFilter:node,createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {sampleRate:rate,length,getChannelData:i=>data[i]};},createBufferSource(){const source={...node(),start(time){this.started=time;},stop(time){this.stopped=time;}};sources.push(source);return source;},async resume(){},async close(){this.state='closed';}};
 return {context,intervals,delays,sources};
}
test('scores contain pentatonic melodies, accompaniment, harmony and contrasting rhythms',()=>{
 assert.equal(soundtrack('gong').id,'festival');assert.equal(soundtrack('unknown').id,'none');assert.deepEqual(scoreStep('none',0),[]);assert.ok(stepSeconds('rain')>stepSeconds('festival'));
 for(const {id} of SOUNDTRACKS.slice(1)){const events=Array.from({length:128},(_,n)=>scoreStep(id,n)).flat();const melodic=events.filter(e=>['pluck','flute','pad','bell'].includes(e.instrument));assert.ok(new Set(melodic.map(e=>e.note)).size>10);assert.ok(melodic.every(e=>[2,4,6,9,11].includes(e.note%12)));assert.ok(new Set(events.map(e=>e.instrument)).size>=4);assert.ok(events.every(e=>e.duration>0&&e.level>0&&e.level<.5));}
});
test('synthesized voices are finite, audible, enveloped and never clip individually',()=>{
 for(const instrument of ['pluck','flute','pad','bell','drum','wood']){const data=voiceSamples(instrument,69,2,12000),peak=Math.max(...data.map(Math.abs)),rms=Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);assert.ok(peak>.05&&peak<1,instrument+' peak');assert.ok(rms>.005,instrument+' energy');assert.ok(data.every(Number.isFinite));assert.ok(Math.abs(data[0])<.001);assert.ok(Math.abs(data.at(-1))<.01);assert.deepEqual(data,voiceSamples(instrument,69,2,12000));}
});
test('new soundtrack choices and volume persist, while legacy gong and silent work stay compatible',()=>{
 for(const sound of ['none','gong','rain','strings','festival']){const d=defaultDraft();d.sound=sound;d.soundVolume=.65;const saved=sanitizeDraft(JSON.parse(JSON.stringify(d)));assert.equal(saved.sound,sound);assert.equal(saved.soundVolume,.65);}
 assert.equal(sanitizeDraft({soundVolume:99}).soundVolume,1);assert.equal(sanitizeDraft({soundVolume:-3}).soundVolume,0);assert.equal(sanitizeDraft({soundVolume:Infinity,sound:'https://example.org/audio.mp3'}).soundVolume,.4);assert.equal(sanitizeDraft({}).sound,'none');
});
test('scheduler bounds catch-up work, caches audio and releases scheduled voices on stop',t=>{
 const {context,intervals,sources}=fixture(t),score=new TheaterScore(context,'festival',.4);score.start();assert.equal(intervals.size,1);assert.ok(score.voices.size>0&&score.voices.size<=48);const firstStep=score.step;score.start();assert.equal(score.step,firstStep);score.setVolume(.2);assert.equal(score.volume,.2);assert.equal(score.step,firstStep);
 context.currentTime=1000;score.schedule();assert.ok(score.next>context.currentTime);assert.ok(score.voices.size<=48);assert.ok(score.buffers.size<=64);score.stop();assert.equal(intervals.size,0);assert.equal(score.running,false);assert.ok(sources.every(s=>s.stopped<=context.currentTime+.12));for(const source of sources)source.onended?.();assert.equal(score.voices.size,0);score.dispose();assert.equal(score.master.disconnected,true);
});
test('journey background ducks for studio music and returns to its previous level',t=>{
 const {context,intervals}=fixture(t),travel=new TravelSound(context);travel.set(.8,true);assert.equal(intervals.size,1);const volume=travel.score.volume;assert.ok(volume>0);travel.duck(true);assert.equal(travel.score.volume,0);travel.duck(false);assert.equal(travel.score.volume,volume);travel.set(.8,false);assert.equal(intervals.size,0);
});
test('canceling an unfinished audio resume never starts a stale preview',async t=>{
 const {context,intervals,delays}=fixture(t),old=globalThis.AudioContext;let finishResume;context.resume=()=>new Promise(resolve=>{finishResume=resolve;});globalThis.AudioContext=function(){return context;};t.after(()=>{if(old===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=old;});let changes=0;const sound=new StudioSound({onStateChange:()=>changes++}),pending=sound.start('strings');sound.stop();finishResume();await pending;assert.equal(sound.active,false);assert.equal(intervals.size,0);for(const fn of delays)fn();assert.equal(context.state,'closed');assert.ok(changes>=1);
});
test('rain preview stops its ambience and melody, then closes and disconnects the owned session',async t=>{
 const {context,intervals,delays}=fixture(t),old=globalThis.AudioContext;globalThis.AudioContext=function(){return context;};t.after(()=>{if(old===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=old;});const sound=new StudioSound();await sound.start('rain',.35);assert.equal(sound.active,true);const score=sound.score,rain=score.rain,ambience=rain.buffer.getChannelData(0);assert.ok(rain.loop);assert.equal(Math.abs(ambience[0]),0);assert.equal(Math.abs(ambience.at(-1)),0);sound.stop();assert.equal(sound.active,false);assert.equal(intervals.size,0);assert.equal(rain.stopped,context.currentTime+.12);for(const fn of delays)fn();assert.equal(context.state,'closed');assert.equal(score.bus.disconnected,true);
});
