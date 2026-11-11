/** Flat articulated puppet, in the original 480 × 820 artwork coordinates. */
export const JOINT_LIMITS={neck:[-32,35],waist:[-28,42],shoulderFront:[-55,150],elbowFront:[0,145],wristFront:[-65,65],shoulderBack:[-55,150],elbowBack:[0,145],wristBack:[-65,65],hipFront:[-65,90],kneeFront:[0,145],ankleFront:[-65,65],hipBack:[-65,90],kneeBack:[0,145],ankleBack:[-65,65]};
export const RIG_PARTS=[
 {id:'pelvis',parent:null,offset:[264,535],layer:3},
 {id:'torso',parent:'pelvis',offset:[0,-150],joint:'waist',sign:-1,layer:5},
 {id:'head',parent:'torso',offset:[0,-140],joint:'neck',sign:-1,layer:7},
 {id:'upperBack',parent:'torso',offset:[-50,-100],joint:'shoulderBack',layer:1},
 {id:'foreBack',parent:'upperBack',offset:[0,137],joint:'elbowBack',layer:1},
 {id:'handBack',parent:'foreBack',offset:[0,115],joint:'wristBack',layer:1},
 {id:'upperFront',parent:'torso',offset:[40,-100],joint:'shoulderFront',layer:8},
 {id:'foreFront',parent:'upperFront',offset:[0,137],joint:'elbowFront',layer:8},
 {id:'handFront',parent:'foreFront',offset:[0,115],joint:'wristFront',layer:9},
 {id:'thighBack',parent:'pelvis',offset:[-28,0],joint:'hipBack',layer:0},
 {id:'shinBack',parent:'thighBack',offset:[0,100],joint:'kneeBack',sign:-1,layer:0},
 {id:'footBack',parent:'shinBack',offset:[0,105],joint:'ankleBack',layer:0},
 {id:'thighFront',parent:'pelvis',offset:[35,0],joint:'hipFront',layer:2},
 {id:'shinFront',parent:'thighFront',offset:[0,100],joint:'kneeFront',sign:-1,layer:2},
 {id:'footFront',parent:'shinFront',offset:[0,105],joint:'ankleFront',layer:2}
];
export const DRAW_ORDER=[...RIG_PARTS].sort((a,b)=>a.layer-b.layer);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=Math.PI/180;
export function getJoints(actor={}){
 const defaults={neck:0,waist:0,shoulderFront:actor.pose??40,elbowFront:31.5,wristFront:0,shoulderBack:10,elbowBack:23,wristBack:0,hipFront:0,kneeFront:0,ankleFront:0,hipBack:0,kneeBack:0,ankleBack:0},result={};
 for(const [key,range] of Object.entries(JOINT_LIMITS)){const value=actor.joints?.[key];result[key]=clamp(Number.isFinite(value)?value:defaults[key],...range);}return result;
}
export function withJoints(actor,patch){const joints=getJoints(actor);for(const [key,value] of Object.entries(patch))if(JOINT_LIMITS[key]&&Number.isFinite(value))joints[key]=clamp(value,...JOINT_LIMITS[key]);return {...actor,pose:joints.shoulderFront,joints};}
export function rotate(point,angle){const c=Math.cos(angle*rad),s=Math.sin(angle*rad);return {x:point.x*c+point.y*s,y:-point.x*s+point.y*c};}
export function jointTransforms(actor){
 const joints=getJoints(actor),nodes={};
 for(const part of RIG_PARTS){const parent=nodes[part.parent],offset=rotate({x:part.offset[0],y:part.offset[1]},parent?.angle||0);nodes[part.id]={x:(parent?.x||0)+offset.x,y:(parent?.y||0)+offset.y,angle:(parent?.angle||0)+(part.joint?joints[part.joint]*(part.sign||1):0)};}
 return nodes;
}
export function jointPoint(actor,id,offset={x:0,y:0}){const node=jointTransforms(actor)[id],p=rotate(offset,node.angle);return {x:node.x+p.x,y:node.y+p.y};}
/** Two-link planar inverse kinematics with a stable bending side and bounded reach. */
export function solveTwoLink(target,l1,l2,bend=1){
 const distance=clamp(Math.hypot(target.x,target.y),Math.abs(l1-l2)+.01,l1+l2-.01),direction=Math.atan2(target.x,target.y),relative=bend*Math.acos(clamp((distance*distance-l1*l1-l2*l2)/(2*l1*l2),-1,1));
 return {upper:(direction-Math.atan2(l2*Math.sin(relative),l1+l2*Math.cos(relative)))/rad,lower:relative/rad};
}
export function solveLimb(actor,side,target,leg=false){
 const suffix=side==='Back'?'Back':'Front',nodes=jointTransforms(actor),base=nodes[leg?'pelvis':'torso'],start=nodes[(leg?'thigh':'upper')+suffix],local=rotate({x:target.x-start.x,y:target.y-start.y},-base.angle),angles=solveTwoLink(local,leg?100:137,leg?105:115,leg?-1:1);
 const patch=leg?{['hip'+suffix]:angles.upper,['knee'+suffix]:-angles.lower,['ankle'+suffix]:-angles.upper-angles.lower}:{['shoulder'+suffix]:angles.upper,['elbow'+suffix]:angles.lower};return withJoints(actor,patch);
}
/** Include the palm grip in the lower arm length, even when the wrist is turned. */
export function solveHand(actor,side,target){
 const suffix=side==='Back'?'Back':'Front',nodes=jointTransforms(actor),start=nodes['upper'+suffix],local=rotate({x:target.x-start.x,y:target.y-start.y},-nodes.torso.angle),wrist=getJoints(actor)['wrist'+suffix]*rad,dx=14*Math.sin(wrist),dy=115+14*Math.cos(wrist),angles=solveTwoLink(local,137,Math.hypot(dx,dy));
 return withJoints(actor,{['shoulder'+suffix]:angles.upper,['elbow'+suffix]:angles.lower-Math.atan2(dx,dy)/rad});
}
export function canonicalToPaper(actor,point,aspect=5.55/10.25){return {x:actor.x+(actor.flip?-1:1)*52*actor.size*aspect*(point.x-240)/820,y:actor.y+52*actor.size*(-.915+point.y/820)};}
export function paperToCanonical(actor,point,aspect=5.55/10.25){return {x:240+(point.x-actor.x)/((actor.flip?-1:1)*52*actor.size*aspect)*820,y:((point.y-actor.y)/(52*actor.size)+.915)*820};}
/** Lower the hips while solving both legs back to their existing floor contacts. */
export function crouchAt(actor,y,feet){
 const sides=['Front','Back'],contacts=feet||sides.map(side=>canonicalToPaper(actor,jointPoint(actor,'foot'+side))),minimumReach=Math.sqrt(100**2+105**2+2*100*105*Math.cos(145*rad));let top=45,bottom=86;
 for(const [i,side] of sides.entries()){const dx=paperToCanonical(actor,contacts[i]).x-jointPoint(actor,'thigh'+side).x,maxDrop=Math.sqrt(Math.max(0,205**2-dx**2)),minDrop=Math.sqrt(Math.max(0,minimumReach**2-dx**2));top=Math.max(top,contacts[i].y+52*actor.size*(.915-(535+maxDrop)/820));bottom=Math.min(bottom,contacts[i].y+52*actor.size*(.915-(535+minDrop)/820));}
 let next={...actor,y:clamp(y,Math.min(top,bottom),bottom)};for(const [i,side] of sides.entries())next=solveLimb(next,side,paperToCanonical(next,contacts[i]),true);return next;
}
export function blendActor(from,to,u){
 const amount=clamp(u,0,1),mix=(a,b)=>a+(b-a)*amount,result={...from,...(amount>=.5?{flip:to.flip,present:to.present}:{}),x:mix(from.x,to.x),y:mix(from.y,to.y),size:mix(from.size,to.size),pose:mix(from.pose,to.pose)};
 if(from.joints||to.joints){const a=getJoints(from),b=getJoints(to);result.joints=Object.fromEntries(Object.keys(JOINT_LIMITS).map(key=>[key,mix(a[key],b[key])]));result.pose=result.joints.shoulderFront;}return result;
}
export const smooth=u=>{const t=clamp(u,0,1);return t*t*(3-2*t);};
