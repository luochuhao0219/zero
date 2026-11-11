import {rigPoint,rigCanonicalPoint} from './articulated-rig.js';
import {getJoints,withJoints,jointPoint,canonicalToPaper,solveLimb,solveHand,crouchAt} from './puppet-motion.js';
import * as THREE from '../vendor/three.module.js';
import {bound,actorPaperCenter,movePaperItem,snapPose,sceneryDefault} from './studio-space.js';
const degrees=180/Math.PI;
/** One owner per drag; a second finger is accepted only for an actor-size pinch. */
export class StudioControls {
  constructor(studio){
    this.studio=studio;this.stage=studio.stage;this.canvas=this.stage.canvas;this.pointers=new Map();this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.08);
    for(const [type,method] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancelEvent'],['lostpointercapture','cancelEvent'],['keydown','key'],['wheel','wheel']])this.canvas.addEventListener(type,event=>this[method](event),type==='wheel'?{passive:false}:undefined);
  }
  get actors(){return this.studio.actors?.()||this.studio.draft.actors;}
  get active(){return this.studio.active&&!this.studio.playback&&!document.querySelector('dialog[open]');}
  screen(point){const r=this.canvas.getBoundingClientRect(),p=new THREE.Vector3(point.x,point.y,point.z||.08).project(this.stage.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
  hit(x,y){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),this.stage.camera);return this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());}
  targets(){
    if(!this.active)return [];const {draft}=this.studio,frame=draft.frames[draft.frame],targets=[];
    const actors=this.actors,selected=this.studio.selection;
    for(let index=0;index<draft.count;index++){
      const actor=actors[index];if(actor.present===false)continue;const rig=this.stage.projected[0].actors[index];rig.updateWorldMatrix(true,true);const prefix=index?'青绿':'朱红';
      const add=(kind,part,label,extra={},offset={x:0,y:0})=>{const point=rigPoint(rig,part,offset);if(point)targets.push({kind,index,part,point,screen:this.screen(point),label:prefix+'·'+label,...extra});};
      add('hand','handFront','前手',{side:'Front'},{x:0,y:14});
      if(selected&&draft.selected===index){
        add('hand','handBack','后手',{side:'Back'},{x:0,y:14});add('neck','head','颈部',{joint:'neck'},{x:15,y:-80});add('hips','pelvis','下蹲');add('joint','torso','腰部',{joint:'waist'});
        for(const side of ['Front','Back'])add('foot','foot'+side,side==='Front'?'前脚':'后脚',{side},{x:10,y:9});
        if(['hand','joint'].includes(selected.kind)&&!selected.joint?.includes('knee')&&selected.joint!=='waist'){const side=selected.side||'Front';add('joint','fore'+side,'肘部',{side,joint:'elbow'+side});add('joint','hand'+side,'手腕',{side,joint:'wrist'+side},{x:30,y:0});}
        if(['foot','hips'].includes(selected.kind)||selected.joint?.startsWith('knee'))for(const side of ['Front','Back'])add('joint','shin'+side,side==='Front'?'前膝':'后膝',{side,joint:'knee'+side});
      }
      const point=actorPaperCenter(actor);targets.push({kind:'actor',index,point,screen:this.screen(point),label:prefix+'影人',actor});
    }
    const prop=frame.prop;if(prop.kind!=='none'){const mesh=this.stage.studioWorld.props[prop.kind];const point=mesh.position.clone().add(new THREE.Vector3(0,prop.kind==='umbrella'?.85:prop.kind==='lantern'?-.4:-.18,0));targets.unshift({kind:'prop',point,screen:this.screen(point),label:'拖动道具'});}
    const scene=this.stage.studioWorld.scenes[draft.scene];targets.push({kind:'scenery',point:scene.position.clone(),screen:this.screen(scene.position),width:scene.scale.x,height:scene.scale.y,label:'拖动景片'});return targets;
  }
  pick(x,y,touch=false){
    const targets=this.targets(),near=(a,r)=>Math.hypot(x-a.screen.x,y-a.screen.y)<r;
    const hand=targets.filter(t=>['arm','hand','neck','hips','foot','joint'].includes(t.kind)&&near(t,touch?27:18)).sort((a,b)=>Math.hypot(x-a.screen.x,y-a.screen.y)-Math.hypot(x-b.screen.x,y-b.screen.y))[0];
    const prop=targets.find(t=>t.kind==='prop'&&near(t,touch?38:27));if(prop&&(!hand||Math.hypot(x-prop.screen.x,y-prop.screen.y)<Math.hypot(x-hand.screen.x,y-hand.screen.y)*.85))return prop;if(hand)return hand;if(prop)return prop;
    for(const t of targets.filter(t=>t.kind==='actor')){const size=t.actor.size,top=this.screen({...t.point,y:t.point.y+1.15*size}),side=this.screen({...t.point,x:t.point.x+.43*size});if(((x-t.screen.x)/Math.max(20,Math.abs(side.x-t.screen.x)))**2+((y-t.screen.y)/Math.max(40,Math.abs(top.y-t.screen.y)))**2<1)return t;}
    return targets.find(t=>{if(t.kind!=='scenery')return false;const side=this.screen({...t.point,x:t.point.x+t.width/2}),top=this.screen({...t.point,y:t.point.y+t.height/2});return Math.abs(x-t.screen.x)<Math.max(touch?35:22,Math.abs(side.x-t.screen.x))&&Math.abs(y-t.screen.y)<Math.max(touch?25:16,Math.abs(top.y-t.screen.y));})||null;
  }
  down(event,target){
    if(!this.active||event.button!==0)return;
    if(this.drag){
      if(this.drag.kind!=='actor'||this.pointers.size!==1||event.pointerType!=='touch')return;
      event.preventDefault();this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.canvas.setPointerCapture(event.pointerId);const points=[...this.pointers.values()];this.pinch={distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),size:this.actors[this.drag.index].size};return;
    }
    const chosen=target||this.pick(event.clientX,event.clientY,event.pointerType==='touch');if(!chosen){this.studio.selection=null;this.studio.positionControls();return;}
    const hit=this.hit(event.clientX,event.clientY);if(!hit)return;event.preventDefault();this.studio.beginChange();this.studio.select(chosen.kind,chosen.index,chosen);
    if(chosen.kind==='prop'){const p=this.studio.frame().prop,mesh=this.stage.studioWorld.props[p.kind],position=this.studio.paperPosition(mesh.position);p.x=position.x;p.y=position.y;p.holder=-1;}
    if(chosen.kind==='scenery')this.studio.frame().scenery||=sceneryDefault(this.studio.draft.scene);
    const item=this.item(chosen),rig=chosen.index!==undefined?this.stage.projected?.[0]?.actors?.[chosen.index]:null,canonical=rig&&rig.userData.jointNodes?rigCanonicalPoint(rig,hit):null;this.drag={...chosen,owner:event.pointerId,hit,startY:event.clientY,start:{...item,...(item.joints?{joints:{...item.joints}}:{})},canonical,rig,startTarget:chosen.part?jointPoint(item,chosen.part,chosen.kind==='hand'?{x:0,y:14}:{x:0,y:0}):null,feet:chosen.kind==='hips'?['Front','Back'].map(side=>canonicalToPaper(item,jointPoint(item,'foot'+side))):null,angle:chosen.center?Math.atan2(hit.y-chosen.center.y,(item.flip?-1:1)*(hit.x-chosen.center.x)):0};
    this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.canvas.setPointerCapture(event.pointerId);this.canvas.focus({preventScroll:true});this.stage.inputActive=true;this.canvas.style.cursor='grabbing';
  }
  item(target=this.drag){return target.kind==='prop'?this.studio.frame().prop:target.kind==='scenery'?this.studio.frame().scenery:this.actors[target.index];}
  move(event){
    if(!this.active)return;
    if(!this.drag){const target=this.pick(event.clientX,event.clientY,event.pointerType==='touch');this.canvas.style.cursor=target?'grab':'default';return;}
    if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const d=this.drag,item=this.item();
    if(this.pinch){const points=[...this.pointers.values()];if(points.length===2)item.size=bound(this.pinch.size*Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)/Math.max(10,this.pinch.distance),.65,1.35);this.studio.changed(false);return;}
    const hit=this.hit(event.clientX,event.clientY);if(!hit)return;
    if(['hand','foot'].includes(d.kind)&&d.canonical){const p=rigCanonicalPoint(d.rig,hit),target={x:d.startTarget.x+p.x-d.canonical.x,y:d.startTarget.y+p.y-d.canonical.y};Object.assign(item,d.kind==='hand'?solveHand(d.start,d.side,target):solveLimb(d.start,d.side,target,true));}
    else if(d.kind==='neck'&&d.canonical){const pivot=jointPoint(d.start,'head'),p=rigCanonicalPoint(d.rig,hit),a=Math.atan2(d.canonical.y-pivot.y,d.canonical.x-pivot.x),b=Math.atan2(p.y-pivot.y,p.x-pivot.x),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a))*degrees;Object.assign(item,withJoints(d.start,{neck:getJoints(d.start).neck+delta}));}
    else if(d.kind==='hips'){Object.assign(item,crouchAt(d.start,d.start.y-(hit.y-d.hit.y)/5.55*100,d.feet));}
    else if(d.kind==='joint'){Object.assign(item,withJoints(d.start,{[d.joint]:getJoints(d.start)[d.joint]-(event.clientY-d.startY)*.65}));}
    else if(d.kind==='arm'){const angle=Math.atan2(hit.y-d.center.y,(item.flip?-1:1)*(hit.x-d.center.x)),delta=Math.atan2(Math.sin(angle-d.angle),Math.cos(angle-d.angle));item.pose=bound(d.start.pose+delta*degrees,-30,120);}
    else if(d.spawn){item.x=bound((hit.x/10.25+.5)*100,16,84);item.y=bound((.5-(hit.y-3.25)/5.55)*100+(d.kind==='actor'?52*.415*item.size:0),d.kind==='actor'?45:25,d.kind==='actor'?86:85);}else Object.assign(item,movePaperItem(d.start,(hit.x-d.hit.x)/10.25*100,-(hit.y-d.hit.y)/5.55*100,d.kind));
    this.studio.snapCandidate=d.kind==='prop'?this.nearestHand(event.clientX,event.clientY):null;this.studio.changed(false);
  }
  nearestHand(x,y){const hands=this.targets().filter(t=>t.kind==='hand'&&t.side==='Front'),target=hands.find(t=>Math.hypot(t.screen.x-x,t.screen.y-y)<48);return target?.index??null;}
  up(event){
    if(!this.drag||!this.pointers.has(event.pointerId))return;
    const d=this.drag;if(d.kind==='prop'&&this.studio.snapCandidate!==null)this.studio.frame().prop.holder=this.studio.snapCandidate;
    if(d.kind==='arm')this.item().pose=snapPose(this.item().pose);
    this.release();this.studio.changed();this.studio.finishChange();
  }
  cancelEvent(event){if(this.pointers.has(event.pointerId))this.cancel(true);}
  release(){const ids=[...this.pointers.keys()];this.drag=null;this.pinch=null;this.pointers.clear();this.studio.snapCandidate=null;this.stage.inputActive=false;this.stage.dirty=true;this.canvas.style.cursor='default';for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);}
  cancel(restore=false){const dragging=!!this.drag;this.release();if(dragging&&restore)this.studio.cancelChange();}
  wheel(event){if(!this.active)return;const target=this.pick(event.clientX,event.clientY);if(!target||!['actor','arm','hand'].includes(target.kind))return;event.preventDefault();this.studio.beginChange();this.studio.select('actor',target.index);const actor=this.actors[target.index];actor.size=bound(actor.size-Math.sign(event.deltaY)*.035,.65,1.35);this.studio.changed();this.studio.finishChange();}
  key(event){
    if(!this.active)return;const key=event.key.toLowerCase(),actor=this.actors[this.studio.draft.selected];
    if((event.ctrlKey||event.metaKey)&&key==='z'){event.preventDefault();this.studio.undo();return;}
    if(['1','2'].includes(key)){event.preventDefault();this.studio.select('actor',Number(key)-1);return;}
    if(!['arrowleft','arrowright','arrowup','arrowdown','q','e','f','+','-'].includes(key))return;event.preventDefault();this.studio.beginChange();
    const step=event.shiftKey?3:1,selection=this.studio.selection||{},item=selection.kind==='prop'?this.studio.frame().prop:selection.kind==='scenery'?(this.studio.frame().scenery||=sceneryDefault(this.studio.draft.scene)):actor;
    if(key.startsWith('arrow')&&['hand','foot'].includes(selection.kind)){
      const point=jointPoint(actor,selection.part,selection.kind==='hand'?{x:0,y:14}:{x:0,y:0}),delta=event.shiftKey?16:6;point.x+=(key==='arrowright'?delta:key==='arrowleft'?-delta:0)*(actor.flip?-1:1);point.y+=key==='arrowdown'?delta:key==='arrowup'?-delta:0;Object.assign(actor,selection.kind==='hand'?solveHand(actor,selection.side,point):solveLimb(actor,selection.side,point,true));
    }else if(key.startsWith('arrow')&&selection.kind==='hips')Object.assign(actor,crouchAt(actor,actor.y+(key==='arrowdown'?1:key==='arrowup'?-1:0)));
    else if(key.startsWith('arrow')&&selection.kind==='joint')Object.assign(actor,withJoints(actor,{[selection.joint]:getJoints(actor)[selection.joint]+(key==='arrowdown'||key==='arrowright'?3:-3)}));
    else if(key.startsWith('arrow')&&selection.kind==='neck')Object.assign(actor,withJoints(actor,{neck:getJoints(actor).neck+(key==='arrowdown'||key==='arrowright'?3:-3)}));
    else if(key.startsWith('arrow'))Object.assign(item,movePaperItem(item,key==='arrowright'?step:key==='arrowleft'?-step:0,key==='arrowdown'?step:key==='arrowup'?-step:0,item===actor?'actor':'prop'));
    else if(key==='f')actor.flip=!actor.flip;else if(key==='q'||key==='e'){const joint=selection.joint||(selection.kind==='foot'?'knee'+selection.side:selection.kind==='hand'?'elbow'+selection.side:'shoulderFront');Object.assign(actor,withJoints(actor,{[joint]:getJoints(actor)[joint]+(key==='e'?3:-3)}));}else actor.size=bound(actor.size+(key==='+'?.04:-.04),.65,1.35);
    this.studio.changed();this.studio.finishChange();
  }
}
