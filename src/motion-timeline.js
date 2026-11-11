import {sampleAction,motionInfo,walkActor} from './motion-clips.js';
import {blendActor,getJoints,smooth,clamp} from './puppet-motion.js';
export function compileMotionTimeline(draft){
 const segments=[];let time=0;
 const add=(segment,duration)=>{segments.push({...segment,start:time,duration:duration*1000});time+=duration*1000;};
 draft.frames.forEach((frame,index)=>{
  let actors=frame.actors.map(a=>({...a,joints:getJoints(a)})),prop={...frame.prop};const referenceActors=actors,nextActors=draft.frames[Math.min(2,index+1)].actors;
  add({kind:'hold',actors,prop,index,frame},.55);
  for(const [actionIndex,action] of (frame.actions||[]).entries()){
   const context={referenceActors,nextActors,prop},startActors=actors;add({kind:'action',actors:startActors,prop,index,frame,action,actionIndex,context},action.duration);
   const ending=sampleAction(startActors,action,1,context);actors=ending.actors;prop=ending.prop;
  }
  add({kind:'hold',actors,prop,index,frame},.65);
  if(index<2){const distance=Math.max(...actors.map((a,i)=>Math.abs(a.x-nextActors[i].x)));add({kind:'join',actors,to:nextActors,prop,toProp:draft.frames[index+1].prop,index,frame},Math.max(.9,Math.min(3.2,distance*.13)));}
 });return {segments,duration:time};
}
export function sampleMotionTimeline(timeline,elapsed,reduced=false){
 const time=clamp(elapsed,0,timeline.duration),segment=timeline.segments.find(s=>time<s.start+s.duration)||timeline.segments.at(-1),u=clamp((time-segment.start)/segment.duration,0,1);let actors=segment.actors,prop=segment.prop;
 if(segment.kind==='action'){const pose=sampleAction(segment.actors,segment.action,reduced?(u<.5?0:1):u,segment.context);actors=pose.actors;prop=pose.prop;}
 else if(segment.kind==='join'){
  const amount=reduced?0:smooth(u);actors=segment.actors.map((actor,i)=>{let next=blendActor(actor,segment.to[i],amount);if(!reduced&&Math.abs(actor.x-segment.to[i].x)>3){const walked=walkActor(actor,u,segment.to[i],prop.holder===i);const weight=smooth(u/.12)*smooth((1-u)/.18),joints={...next.joints};for(const side of ['Front','Back'])for(const joint of ['hip','knee','ankle']){const key=joint+side;joints[key]+=(walked.joints[key]-joints[key])*weight;}next={...next,y:next.y+(walked.y-next.y)*weight,joints};}return next;});if(amount>=.5)prop=segment.toProp;
 }
 return {actors,prop,line:segment.frame.line,scenery:segment.frame.scenery,index:segment.index,progress:time/timeline.duration,action:segment.action?.type||null};
}
export function materializeActionKeys(draft,frameIndex,actionIndex){
 const timeline=compileMotionTimeline(draft),segment=timeline.segments.find(s=>s.kind==='action'&&s.index===frameIndex&&s.actionIndex===actionIndex);if(!segment)return null;
 if(segment.action.keys)return segment.action.keys;
 const count=motionInfo(segment.action.type).poses.length;return Array.from({length:count},(_,i)=>{const t=i/(count-1),sample=sampleAction(segment.actors,segment.action,t,segment.context);return {t,actors:sample.actors.map(a=>({...a,joints:{...getJoints(a)}}))};});
}
