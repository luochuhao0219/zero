/** Saved free-play works: stable keys preserve existing drafts and tickets. */
export const COMPOSITION_KEY='borrow-light-compositions-v1';
export const DRAFT_KEY='borrow-light-draft-v1';
export function defaultDraft(){return {title:'灯下相逢',scene:'bridge',count:2,selected:0,actors:[{x:36,y:74,size:1,pose:40,variant:0,flip:false},{x:66,y:74,size:1,pose:65,variant:1,flip:true}]};}
/** Accept only our bounded form state, never arbitrary image paths or stored markup. */
export function sanitizeDraft(value){
  const d=defaultDraft(),clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
  if(!value||typeof value!=='object')return d;
  d.title=typeof value.title==='string'?value.title.slice(0,18):d.title;
  d.scene=['moon','bridge','garden'].includes(value.scene)?value.scene:d.scene;
  d.count=value.count===1?1:2;d.selected=value.selected===1&&d.count===2?1:0;
  d.actors=d.actors.map((a,i)=>{const b=value.actors?.[i]||{};return {x:clamp(b.x,16,84,a.x),y:clamp(b.y,45,86,a.y),size:clamp(b.size,.65,1.35,a.size),pose:clamp(b.pose,-30,120,a.pose),variant:b.variant===1?1:0,flip:typeof b.flip==='boolean'?b.flip:a.flip};});
  return d;
}
export function readJSON(storage,key,fallback){try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}}
export function readCompositions(storage){const value=readJSON(storage,COMPOSITION_KEY,[]);return Array.isArray(value)?value.filter(w=>w&&typeof w.image==='string'&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(w.image)&&w.image.length<600000&&typeof w.title==='string').slice(0,6).map(w=>({image:w.image,title:w.title.slice(0,18),date:typeof w.date==='string'?w.date:''})):[];}
