import {getJoints,withJoints,jointPoint,canonicalToPaper,paperToCanonical,solveLimb,solveHand,crouchAt,blendActor,smooth,clamp} from './puppet-motion.js';
export const MOTIONS=[
 {id:'wave',name:'招手挥别',duration:2.8,poses:['起手','摆手','扬手','停顿','收手']},
 {id:'nod',name:'点头回应',duration:1.8,poses:['看向','低头','点头','回应','回正']},
 {id:'look',name:'抬头望月',duration:2.6,poses:['起势','抬头','望月','停顿','回正']},
 {id:'salute',name:'拱手作揖',duration:3,poses:['起势','拢手','俯身','停礼','回正']},
 {id:'bow',name:'鞠躬行礼',duration:2.8,poses:['站定','俯身','低头','停礼','回正']},
 {id:'offer',name:'递物相赠',duration:3.4,poses:['持物','伸手','接物','相赠','收手']},
 {id:'walk',name:'迈步走近',duration:3.2,poses:['起步','迈步','落脚','换步','行走','抬脚','落脚','停步','站定']},
 {id:'crouch',name:'屈膝下蹲',duration:2.4,poses:['站定','落身','屈膝','下蹲','蹲稳']},
 {id:'stand',name:'缓缓起身',duration:2.4,poses:['准备','抬身','伸膝','站起','站稳']},
 {id:'kneel',name:'跪地行礼',duration:3.2,poses:['站定','落膝','跪坐','行礼','停礼']},
 {id:'wait',name:'停一停',duration:1.2,poses:['开始','停留','停留','停留','结束']}
];
export const motionInfo=id=>MOTIONS.find(m=>m.id===id)||MOTIONS.at(-1);
const envelope=u=>smooth(u/.22)*smooth((1-u)/.22);
const mix=(a,b,u)=>a+(b-a)*u;
export {solveHand} from './puppet-motion.js';
/** A planted foot stays at its paper-space contact until its swing phase. */
export function walkActor(actor,u,destination,held=false){
 const progress=smooth(u),travel=destination.x-actor.x,cycles=Math.max(1,Math.ceil(Math.abs(travel)/4)),phase=progress*cycles,weight=smooth(u/.08)*smooth((1-u)/.08),j=getJoints(actor);
 let next={...actor,x:mix(actor.x,destination.x,progress),y:mix(actor.y,destination.y,progress)+(1.8-Math.sin(phase*Math.PI*2)**2*.16)*weight};
 for(const [index,side] of ['Front','Back'].entries()){
  const initial=canonicalToPaper(actor,jointPoint(actor,'foot'+side)),p=phase-index*.5,step=Math.max(0,Math.floor(p)),q=p<0?0:p-step,stride=travel/cycles,swing=p<0?0:smooth(q/.45),contact={x:initial.x+Math.min(cycles,step+swing)*stride,y:initial.y+(destination.y-actor.y)*progress-Math.sin(swing*Math.PI)*2.1};
  next=solveLimb(next,side,paperToCanonical(next,contact),true);
 }
 const swing=Math.sin(phase*Math.PI*2)*18*weight;return withJoints(next,{shoulderBack:j.shoulderBack+swing,elbowBack:j.elbowBack+12*weight,...(!held?{shoulderFront:j.shoulderFront-swing,elbowFront:j.elbowFront+12*weight}:{}),neck:j.neck-2*weight,waist:j.waist+3*weight});
}
function animateActor(base,type,u,context,index){
 const j=getJoints(base),w=envelope(u),rise=smooth(u/.8);let next={...base,joints:{...j}};
 if(type==='wait')return next;
 if(type==='walk'){const target=context.nextActors?.[index]||base,direction=base.flip?-1:1,x=Math.abs(target.x-base.x)>.5?target.x:clamp(base.x+direction*12,16,84);return walkActor(base,u,{x,y:target.y},context.prop?.holder===index);}
 if(type==='wave')return withJoints(next,{shoulderFront:mix(j.shoulderFront,108,w),elbowFront:mix(j.elbowFront,68+Math.sin(u*Math.PI*6)*24,w),wristFront:Math.sin(u*Math.PI*6)*18*w,neck:j.neck-4*w});
 if(type==='nod')return withJoints(next,{neck:j.neck+Math.sin(u*Math.PI*2)**2*22*w});
 if(type==='look')return withJoints(next,{neck:mix(j.neck,-27,w),waist:j.waist-5*w,shoulderFront:mix(j.shoulderFront,80,w),elbowFront:mix(j.elbowFront,55,w)});
 if(type==='bow')return withJoints(next,{waist:mix(j.waist,32,w),neck:mix(j.neck,24,w),elbowFront:j.elbowFront+18*w,elbowBack:j.elbowBack+18*w});
 if(type==='salute'){
  next=withJoints(next,{waist:j.waist+19*w,neck:j.neck+23*w});const ready={...next};const torso=jointPoint(next,'torso'),target={x:torso.x+70,y:torso.y-16};
  for(const side of ['Front','Back']){const solved=solveHand(next,side,target),sj=getJoints(solved),patch={};for(const key of ['shoulder','elbow','wrist'])patch[key+side]=mix(getJoints(ready)[key+side],sj[key+side],w);next=withJoints(next,patch);}return next;
 }
 if(type==='crouch'){next=crouchAt(base,clamp(base.y+7.2*rise,45,86));return withJoints(next,{waist:j.waist+12*rise,neck:j.neck+8*rise});}
 if(type==='stand'){const reference={...(context.referenceActors?.[index]||base),x:base.x,size:base.size,flip:base.flip},amount=smooth(u),feet=['Front','Back'].map(side=>{const from=canonicalToPaper(base,jointPoint(base,'foot'+side)),to=canonicalToPaper(reference,jointPoint(reference,'foot'+side));return {x:mix(from.x,to.x,amount),y:mix(from.y,to.y,amount)};});next=crouchAt(base,mix(base.y,reference.y,amount),feet);const rj=getJoints(reference);return withJoints(next,{waist:mix(j.waist,rj.waist,amount),neck:mix(j.neck,rj.neck,amount)});}
 if(type==='kneel'){next.y=clamp(base.y+6.4*rise,45,86);return withJoints(next,{hipFront:mix(j.hipFront,6,rise),hipBack:mix(j.hipBack,-8,rise),kneeFront:mix(j.kneeFront,115,rise),kneeBack:mix(j.kneeBack,125,rise),ankleFront:mix(j.ankleFront,45,rise),ankleBack:mix(j.ankleBack,50,rise),waist:j.waist+28*rise,neck:j.neck+23*rise,shoulderFront:mix(j.shoulderFront,60,rise),elbowFront:mix(j.elbowFront,100,rise)});}
 return next;
}
export function sampleAction(actors,action,u,context={}){
 let result=actors.map((a,i)=>action.actor===-1||action.actor===i?animateActor(a,action.type,u,context,i):{...a}),prop={...context.prop};
 if(action.type==='offer'){
  const source=action.actor===1?1:0,receiver=1-source,a=actors[source],b=actors[receiver];
  if(a?.present!==false&&b?.present!==false&&Math.abs(a.x-b.x)<27&&Math.abs(a.y-b.y)<10){
   const grip={x:(a.x+b.x)/2,y:(a.y+b.y)/2-23*(a.size+b.size)/2},weight=envelope(u);
   result=result.map((base,i)=>{const actor=withJoints(base,{waist:getJoints(base).waist+12*weight}),posed=solveHand(actor,'Front',paperToCanonical(actor,grip)),j=getJoints(actor),p=getJoints(posed);return withJoints(actor,{shoulderFront:mix(j.shoulderFront,p.shoulderFront,weight),elbowFront:mix(j.elbowFront,p.elbowFront,weight),wristFront:mix(j.wristFront,p.wristFront,weight),neck:j.neck+7*weight});});
   if(prop.kind!=='none')prop.holder=u>=.55?receiver:source;
  }
 }
 if(action.keys?.length){const keys=action.keys;let i=0;while(i<keys.length-2&&u>keys[i+1].t)i++;const a=keys[i],b=keys[Math.min(i+1,keys.length-1)],t=smooth((u-a.t)/Math.max(.001,b.t-a.t));result=actors.map((actor,index)=>action.actor===-1||action.actor===index||action.type==='offer'?blendActor(a.actors[index]||actor,b.actors[index]||actor,t):actor);}
 return {actors:result,prop};
}
/** Unknown/corrupt action data cannot create arbitrary resources or unbounded timelines. */
export function sanitizeActions(value,cleanActors,fallback){
 if(!Array.isArray(value))return [];
 return value.filter(a=>a&&MOTIONS.some(m=>m.id===a.type)).slice(0,3).map(a=>{
  const result={type:a.type,actor:a.actor===1?1:a.actor===-1?-1:0,duration:clamp(Number.isFinite(a.duration)?a.duration:motionInfo(a.type).duration,.7,8)};
  if(Array.isArray(a.keys)){
   const keys=a.keys.filter(k=>k&&Number.isFinite(k.t)&&Array.isArray(k.actors)).slice(0,9).map(k=>({t:clamp(k.t,0,1),actors:cleanActors(k.actors,fallback)})).sort((a,b)=>a.t-b.t).filter((key,i,all)=>!i||key.t>all[i-1].t);
   if(keys.length>=2){keys[0].t=0;keys.at(-1).t=1;result.keys=keys;}
  }return result;
 });
}
