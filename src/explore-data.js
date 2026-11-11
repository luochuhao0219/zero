import {getJoints} from './puppet-motion.js';
import {sanitizeActions} from './motion-clips.js';
/** Stable keys preserve old single-scene drafts and image-only tickets. */
export const COMPOSITION_KEY='borrow-light-compositions-v1';
export const DRAFT_KEY='borrow-light-draft-v1';
export const FRAME_NAMES=['起场','相遇','落幕'];
const clamp=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const actors=()=>[{x:36,y:74,size:1,pose:40,variant:0,flip:false},{x:66,y:74,size:1,pose:65,variant:1,flip:true}];
const prop=()=>({kind:'none',x:50,y:65,holder:-1});
export function defaultDraft(){
  const frames=FRAME_NAMES.map(()=>({actors:actors(),line:'',prop:prop()}));
  return {version:2,title:'灯下相逢',scene:'bridge',count:2,selected:0,frame:0,light:'warm',sound:'none',soundVolume:.4,synopsis:'',template:'blank',frames,actors:frames[0].actors};
}
function cleanActors(value,fallback){return fallback.map((a,i)=>{const b=value?.[i]||{};const result={x:clamp(b.x,16,84,a.x),y:clamp(b.y,45,86,a.y),size:clamp(b.size,.65,1.35,a.size),pose:clamp(b.pose,-30,120,a.pose),variant:b.variant===1?1:0,flip:typeof b.flip==='boolean'?b.flip:a.flip,...(b.present===false?{present:false}:{})};if(b.joints&&typeof b.joints==='object'){result.joints=getJoints({...result,joints:b.joints});result.pose=result.joints.shoulderFront;}return result;});}
/** Bound every saved control; legacy actors seed three independent frames. */
export function sanitizeDraft(value){
  const d=defaultDraft();if(!value||typeof value!=='object')return d;
  d.title=typeof value.title==='string'?value.title.slice(0,18):d.title;
  d.scene=['moon','bridge','garden'].includes(value.scene)?value.scene:d.scene;
  d.count=value.count===1?1:2;d.selected=value.selected===1&&d.count===2?1:0;
  d.frame=Number.isInteger(value.frame)?clamp(value.frame,0,2,0):0;
  d.light=['warm','moon','rain'].includes(value.light)?value.light:'warm';
  d.soundVolume=clamp(value.soundVolume,0,1,.4);
  d.sound=['none','rain','gong','strings','festival'].includes(value.sound)?value.sound:'none';
  d.synopsis=typeof value.synopsis==='string'?value.synopsis.slice(0,60):'';
  d.template=['blank','garden','lantern','farewell','home'].includes(value.template)?value.template:'blank';
  const legacy=cleanActors(value.actors,actors());
  d.frames=d.frames.map((f,i)=>{const b=value.frames?.[i]||{},p=b.prop||{};return {actors:cleanActors(b.actors,legacy),line:typeof b.line==='string'?b.line.slice(0,36):'',...(Array.isArray(b.actions)?{actions:sanitizeActions(b.actions,cleanActors,legacy)}:{}),...(b.scenery?{scenery:{x:clamp(b.scenery.x,16,84,50),y:clamp(b.scenery.y,25,85,65)}}:{}),prop:{kind:['lantern','umbrella','book'].includes(p.kind)?p.kind:'none',x:clamp(p.x,16,84,50),y:clamp(p.y,25,85,65),holder:p.holder===0||p.holder===1&&d.count===2?p.holder:-1}};});
  d.actors=d.frames[d.frame].actors;return d;
}
export function selectFrame(draft,index){const next=Math.max(0,Math.min(2,Math.round(index)));draft.frame=next;draft.actors=draft.frames[next].actors;}
export function readJSON(storage,key,fallback){try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}}
export function readCompositions(storage){
  const value=readJSON(storage,COMPOSITION_KEY,[]);
  return Array.isArray(value)?value.filter(w=>w&&typeof w.image==='string'&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(w.image)&&w.image.length<600000&&typeof w.title==='string').slice(0,6).map(w=>({image:w.image,title:w.title.slice(0,18),date:typeof w.date==='string'?w.date:'',...(typeof w.id==='string'?{id:w.id.slice(0,80)}:{}),...(w.draft&&typeof w.draft==='object'?{draft:sanitizeDraft(w.draft)}:{})})):[];
}
