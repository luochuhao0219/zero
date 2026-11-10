import {defaultDraft,sanitizeDraft} from './explore-data.js';
export const PLAY_DURATION=12000;
export const STORY_STARTERS=[
  {id:'garden',title:'樱下相逢',scene:'garden',prompt:'花落时，两位旧友在樱树下重逢。',lines:['这条路，好像来过。','原来你也在这里。','明年花开，再见。'],positions:[[23,77],[42,63],[33,72]],poses:[[10,10],[85,85],[110,100]],prop:'umbrella'},
  {id:'lantern',title:'借灯问路',scene:'moon',prompt:'夜路渐暗，借一盏灯，陪陌生人走一程。',lines:['请问，归路在何方？','借你一盏灯，往亮处走。','这一程，多谢相伴。'],positions:[[22,76],[42,63],[63,79]],poses:[[20,10],[65,75],[95,25]],prop:'lantern'},
  {id:'farewell',title:'桥头送别',scene:'bridge',prompt:'一个人准备离开，另一个人还有话没说。',lines:['就送到这座桥吧。','还有一句话，想对你说。','山水有相逢，珍重。'],positions:[[32,68],[43,62],[24,80]],poses:[[20,20],[45,45],[105,105]],prop:'book'},
  {id:'home',title:'夜归珞珈',scene:'moon',prompt:'灯还亮着，两位同窗结伴走过夜色。',lines:['今晚的月色真好。','前面就是归处。','明日，仍在这里等你。'],positions:[[21,45],[43,64],[62,81]],poses:[[25,25],[70,50],[100,100]],prop:'lantern'}
];
export const POSES=[{name:'招手',pose:110},{name:'作揖',pose:45},{name:'指路',pose:85},{name:'回望',pose:25,turn:true},{name:'告别',pose:100}];
export function starterDraft(id){
  const d=defaultDraft(),s=STORY_STARTERS.find(s=>s.id===id);if(!s){d.title='无题小戏';return d;}
  Object.assign(d,{title:s.title,scene:s.scene,template:s.id,synopsis:s.prompt,light:s.scene==='moon'?'moon':'warm'});
  d.frames.forEach((f,i)=>{f.line=s.lines[i];f.actors.forEach((a,j)=>{a.x=s.positions[i][j];a.pose=s.poses[i][j];});f.prop={kind:s.prop,x:50,y:60,holder:0};});
  return d;
}
/** A playback snapshot never modifies the editable poses or stored draft. */
export function samplePlay(draft,elapsed,reducedMotion=false){
  const time=Math.max(0,Math.min(PLAY_DURATION,elapsed)),index=Math.min(2,Math.floor(time/4000)),next=Math.min(2,index+1);
  const from=draft.frames[index],to=draft.frames[next],raw=Math.max(0,Math.min(1,(time%4000-1000)/2500));
  const t=reducedMotion?0:raw*raw*(3-2*raw),lerp=(a,b)=>a+(b-a)*t;
  const actors=from.actors.map((a,i)=>({...a,...(t>=.5?{flip:to.actors[i].flip}:{}),x:lerp(a.x,to.actors[i].x),y:lerp(a.y,to.actors[i].y),size:lerp(a.size,to.actors[i].size),pose:lerp(a.pose,to.actors[i].pose)}));
  return {actors,line:from.line,prop:{...(t>=.5?to.prop:from.prop),x:lerp(from.prop.x,to.prop.x),y:lerp(from.prop.y,to.prop.y)},index,progress:time/PLAY_DURATION};
}
export function copySavedDraft(work,duplicate=false){
  if(!work.draft)return null;
  const draft=sanitizeDraft(work.draft);
  if(duplicate)draft.title=Array.from(work.title).slice(0,15).join('')+'·副本';
  return draft;
}
