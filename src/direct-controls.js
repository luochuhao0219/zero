import * as THREE from '../vendor/three.module.js';
import {LEVELS,projectPoint} from './game.js';

const rad=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Manipulation happens in world space, with projection only used for picking and labels.
export class DirectControls {
  constructor(stage,callbacks={}){
    this.stage=stage;this.canvas=stage.canvas;this.callbacks=callbacks;this.enabled=true;
    this.targets=[];this.drag=null;this.selected=null;this.hover=null;this.pointers=new Map();
    this.raycaster=new THREE.Raycaster();this.ndc=new THREE.Vector2();this.hit=new THREE.Vector3();
    this.rings=[];this.labels=[];this.layer=document.getElementById('object-labels');
    if(stage.fallback)return;
    const geometry=new THREE.TorusGeometry(.09,.012,6,24);
    for(let i=0;i<6;i++){
      const ring=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xd9f58b,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));ring.renderOrder=100;ring.visible=false;stage.scene.add(ring);this.rings.push(ring);
      const label=document.createElement('div');label.className='object-label';label.innerHTML='<span></span>';this.layer.append(label);this.labels.push(label);
    }
    this.canvas.addEventListener('pointerdown',e=>this.down(e));this.canvas.addEventListener('pointermove',e=>this.move(e));
    this.canvas.addEventListener('pointerup',e=>this.up(e));this.canvas.addEventListener('pointercancel',e=>this.up(e,true));
    this.canvas.addEventListener('lostpointercapture',e=>{if(this.pointers.has(e.pointerId))this.up(e,true);});
    this.canvas.addEventListener('pointerleave',()=>{if(!this.drag){this.hover=null;this.callbacks.onHover?.(null);}});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());this.canvas.addEventListener('wheel',e=>this.wheel(e),{passive:false});
    this.canvas.addEventListener('keydown',e=>this.key(e));this.canvas.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','q','Q','e','E'].includes(e.key))this.callbacks.onRelease?.();});
    stage.onFrame=()=>this.update();
  }
  reset(){this.cancel();this.selected=null;this.hover=null;}
  cancel(){if(this.drag&&this.drag.mode!=='orbit')this.callbacks.onCancel?.();clearTimeout(this.wheelTimer);this.drag=null;this.pointers.clear();this.stage.inputActive=false;this.canvas.style.cursor='grab';}
  screen(point){const p=point.clone().project(this.stage.camera),r=this.bounds||this.canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,z:p.z};}
  pointOnPlane(x,y,plane){const r=this.canvas.getBoundingClientRect();this.ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);this.raycaster.setFromCamera(this.ndc,this.stage.camera);return this.raycaster.ray.intersectPlane(plane,new THREE.Vector3());}
  projected(point){const light=this.stage.lightValues(),p=projectPoint(point.x,point.y,point.z,light.x,light.y);return new THREE.Vector3(p.x,p.y,.08);}
  makeTargets(){
    const stage=this.stage,s=stage.renderState,back=Math.cos(stage.angle)<0,actors=stage.actorLayout(),frontProjection=stage.projected[0];
    const targets=[];const add=(id,mode,label,point,extra={})=>targets.push({id,mode,label,point,...extra});
    if(s.level===0){
      if(back){add('lamp','lamp','拖动灯',new THREE.Vector3(s.lightX,s.lightY,-4.8),{hint:'上下左右移动灯，观察影子',radius:.55});add('depth','depth','推近 / 拉远',new THREE.Vector3(-.8,2.7,-s.depth),{hint:'沿幕布前后拖动影人，改变影子大小',body:true});}
      else{const a=actors[0],center=this.projected(new THREE.Vector3(a.x,a.y,a.z));add('shadow','shadow','拖动影子',center,{hint:'拖动影子移动位置；滚轮改变大小',body:true});add('depth','scale','拖动缩放',center.clone().add(new THREE.Vector3(.8*projectPoint(a.x,a.y,a.z,stage.lightValues().x,stage.lightValues().y).scale,-1.1,0)),{hint:'上下拖动这个角，改变影子的大小',center});}
    }else if(s.level===1){
      const physical=new THREE.Vector3(s.bridgeX,1.75,-s.bridgeDepth),center=back?physical:this.projected(physical),scale=back?1:projectPoint(s.bridgeX,1.75,-s.bridgeDepth,-.8,4.6).scale;
      add('bridge',back?'bridge':'bridge-shadow','拖动桥面',center,{hint:'左右移动、前后推拉，接上影桥',bridge:true});
      const arm=new THREE.Vector3(1.25,.12,0).applyAxisAngle(new THREE.Vector3(0,0,1),-s.bridgeAngle*rad).multiplyScalar(scale);
      add('rotate','rotate','转动',center.clone().add(arm),{hint:'抓住桥端的小圆点，转平桥面',center,initial:s.bridgeAngle});
    }else{
      actors.forEach((a,i)=>{
        const rig=back?stage.actors[i]:frontProjection.actors[i];rig.updateWorldMatrix(true,true);
        const hand=rig.userData.front.localToWorld(new THREE.Vector3(.235,-.90,0)),shoulder=rig.userData.front.getWorldPosition(new THREE.Vector3());
        add(`arm-${i}`,'arm',i?'右手':'左手',hand,{hint:'抓住手杆画一个弧，让两人作揖',center:shoulder,flip:a.flip,key:i?'poseRight':'poseLeft'});
        const body=new THREE.Vector3(a.x,a.y-.18,a.z),point=back?body:this.projected(body);
        add(`actor-${i}`,'spacing',i?'右影人':'左影人',point,{hint:'拖动身体，让两位影人靠近',body:true,index:i,projected:!back});
      });
    }
    return targets;
  }
  update(){
    const stage=this.stage,visible=stage.playing&&this.enabled&&stage.celebration<0&&!stage.viewTween&&stage.curtainOpen>.99&&(stage.reduced||stage.time-stage.transitionStart>1.65);
    this.bounds=this.canvas.getBoundingClientRect();this.targets=visible?this.makeTargets():[];const bounds=this.bounds;
    this.rings.forEach((ring,i)=>{
      const t=this.targets[i],label=this.labels[i];ring.visible=!!t;if(label.hidden===!!t)label.hidden=!t;if(!t)return;
      const p=this.screen(t.point);t.screen=p;
      const valid=p.z<1&&p.x>bounds.left+5&&p.x<bounds.right-5&&p.y>bounds.top+5&&p.y<bounds.bottom-5;
      ring.visible=valid;if(label.hidden===valid)label.hidden=!valid;if(!valid)return;
      ring.position.copy(t.point);ring.quaternion.copy(stage.camera.quaternion);
      const size=stage.camera.position.distanceTo(t.point)/17*(this.drag?.id===t.id?1.25:1);ring.scale.setScalar(size);
      const active=this.drag?.id===t.id||this.hover===t.id||this.selected===t.id;ring.material.opacity=active?1:.55+.2*Math.sin(stage.time*2+i);
      label.style.transform=`translate3d(${clamp(p.x-bounds.left+14,8,bounds.width-80)}px,${p.y-bounds.top-13}px,0) translateY(-50%)`;const text=label.firstElementChild;if(text.textContent!==t.label)text.textContent=t.label;label.classList.toggle('active',active);label.classList.toggle('dim',!!this.drag&&this.drag.id!==t.id);
    });
  }
  pick(x,y,touch=false){
    let best=null,distance=touch?35:25;
    for(const t of this.targets){const d=Math.hypot(x-t.screen.x,y-t.screen.y);if(d<distance){best=t;distance=d;}}
    if(best)return best;
    // Broad silhouettes let the player grab the artwork itself, not only the small handle.
    for(const t of this.targets){if(!t.body&&!t.bridge&&t.mode!=='lamp')continue;const w=t.bridge?1.15:t.mode==='lamp'?.34:.38,h=t.bridge?.36:t.mode==='lamp'?.45:1.18;
      const left=this.screen(t.point.clone().add(new THREE.Vector3(-w,0,0))),right=this.screen(t.point.clone().add(new THREE.Vector3(w,0,0))),top=this.screen(t.point.clone().add(new THREE.Vector3(0,h,0))),bottom=this.screen(t.point.clone().add(new THREE.Vector3(0,-h,0)));
      const rx=Math.max(15,Math.abs(right.x-left.x)/2),ry=Math.max(18,Math.abs(bottom.y-top.y)/2);
      if(((x-t.screen.x)/rx)**2+((y-t.screen.y)/ry)**2<1)return t;
    }return null;
  }
  down(e){
    if(!this.stage.playing&&e.pointerType==='touch')return;
    if(e.button!==0&&e.button!==2)return;e.preventDefault();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size>1){this.callbacks.onCancel?.();this.drag={mode:'orbit',x:e.clientX,y:e.clientY};this.stage.inputActive=true;return;}
    const t=this.enabled&&this.stage.playing&&!this.stage.viewTween&&e.button===0?this.pick(e.clientX,e.clientY,e.pointerType==='touch'):null;
    if(!t){this.drag={mode:'orbit',x:e.clientX,y:e.clientY};this.stage.inputActive=true;return;}
    this.selected=t.id;this.callbacks.onGrab?.(t);const state={...this.stage.state};
    const plane=t.mode==='bridge'?new THREE.Plane(new THREE.Vector3(0,1,0),-1.75):new THREE.Plane(new THREE.Vector3(0,0,1),-t.point.z);
    const hit=this.pointOnPlane(e.clientX,e.clientY,plane)||t.point.clone();const center=t.center?.clone();
    let axis=null;if(t.mode==='depth'){const a=this.screen(new THREE.Vector3(-.8,2.7,-.5)),b=this.screen(new THREE.Vector3(-.8,2.7,-2.3));axis={x:b.x-a.x,y:b.y-a.y};}
    this.drag={...t,startX:e.clientX,startY:e.clientY,state,plane,hit,offset:hit.clone().sub(t.point),axis,angle:center?Math.atan2(hit.y-center.y,(t.flip?-1:1)*(hit.x-center.x)):0};
    this.stage.inputActive=true;this.canvas.style.cursor='grabbing';this.callbacks.onHover?.(t);
  }
  move(e){
    if(this.pointers.has(e.pointerId))this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const d=this.drag;if(!d){const t=this.enabled?this.pick(e.clientX,e.clientY,e.pointerType==='touch'):null;this.hover=t?.id||null;this.canvas.style.cursor=t?'grab':'grab';this.callbacks.onHover?.(t);return;}
    if(d.mode==='orbit'){this.stage.viewTween=null;this.stage.dragOffset=clamp(this.stage.dragOffset+(e.clientX-d.x)*.005,-1.15,1.15);d.x=e.clientX;d.y=e.clientY;return;}
    const hit=this.pointOnPlane(e.clientX,e.clientY,d.plane);if(!hit)return;const p=hit.clone().sub(d.offset),s=d.state,patch={};
    if(d.mode==='lamp'){patch.lightX=p.x;patch.lightY=p.y;}
    else if(d.mode==='depth'){const dx=e.clientX-d.startX,dy=e.clientY-d.startY,axis=d.axis;patch.depth=s.depth+(dx*axis.x+dy*axis.y)/Math.max(100,axis.x**2+axis.y**2)*1.8;}
    else if(d.mode==='scale')patch.depth=s.depth+(e.clientY-d.startY)*.008;
    else if(d.mode==='shadow'){const scale=4.8/(4.8-s.depth);patch.lightX=(p.x+.8*scale)/(1-scale);patch.lightY=(p.y-2.9*scale)/(1-scale);}
    else if(d.mode==='bridge'){patch.bridgeX=p.x;patch.bridgeDepth=-p.z;}
    else if(d.mode==='bridge-shadow'){const scale=clamp((p.y-4.6)/(1.75-4.6),1.078,1.778);patch.bridgeDepth=4.8-4.8/scale;patch.bridgeX=(p.x+.8*(1-scale))/scale;}
    else if(d.mode==='rotate'){const a=Math.atan2(hit.y-d.center.y,hit.x-d.center.x);patch.bridgeAngle=s.bridgeAngle-angleDelta(a,d.angle)/rad;}
    else if(d.mode==='arm'){const a=Math.atan2(hit.y-d.center.y,(d.flip?-1:1)*(hit.x-d.center.x));patch[d.key]=s[d.key]+angleDelta(a,d.angle)/rad;}
    else if(d.mode==='spacing'){let x=p.x;if(d.projected){const scale=4.8/4.3;x=(x+.8*(1-scale))/scale;}patch.spacing=2*Math.abs(x);}
    this.change(patch);
  }
  change(patch){const config=LEVELS[this.stage.state.level].controls;for(const key of Object.keys(patch)){const c=config.find(c=>c.key===key);if(c)patch[key]=clamp(patch[key],c.min,c.max);else delete patch[key];}this.callbacks.onChange?.(patch);}
  up(e,cancelled=false){
    const d=this.drag;this.pointers.delete(e.pointerId);if(this.pointers.size)return;this.drag=null;this.stage.inputActive=false;this.canvas.style.cursor='grab';
    if(d&&d.mode!=='orbit'&&!cancelled)this.callbacks.onRelease?.();else if(cancelled)this.callbacks.onCancel?.();
  }
  wheel(e){if(!this.enabled||!this.stage.playing)return;const t=this.pick(e.clientX,e.clientY)||this.targets.find(t=>t.id===this.selected);if(!t)return;e.preventDefault();this.callbacks.onGrab?.(t);const s=this.stage.state,delta=Math.sign(e.deltaY);if(s.level===0)this.change({depth:s.depth+delta*.04});else if(s.level===1)this.change({bridgeAngle:s.bridgeAngle+delta*1.5});else this.change({[t.key||'spacing']:(s[t.key||'spacing'])+delta*(t.key?2:.04)});clearTimeout(this.wheelTimer);this.wheelTimer=setTimeout(()=>this.callbacks.onRelease?.(),200);}
  key(e){
    if(!this.stage.playing||!this.enabled)return;if(/^[1-4]$/.test(e.key)){e.preventDefault();const t=this.targets[Number(e.key)-1];if(t){this.selected=t.id;this.callbacks.onHover?.(t);}return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','q','Q','e','E'].includes(e.key))return;e.preventDefault();const t=this.targets.find(t=>t.id===this.selected)||this.targets[0];if(!t)return;this.selected=t.id;this.callbacks.onGrab?.(t);const s=this.stage.state,v=e.shiftKey?.025:.08,dx=e.key==='ArrowRight'?v:e.key==='ArrowLeft'?-v:0,dy=e.key==='ArrowUp'?v:e.key==='ArrowDown'?-v:0,turn=e.key.toLowerCase()==='e'?1:e.key.toLowerCase()==='q'?-1:0;
    if(s.level===0){if(t.mode==='lamp'||t.mode==='shadow')this.change({lightX:s.lightX+dx,lightY:s.lightY+dy,depth:s.depth+turn*.03});else this.change({depth:s.depth+(dx||dy||turn*.03)});}
    else if(s.level===1)this.change({bridgeX:s.bridgeX+dx,bridgeDepth:s.bridgeDepth+dy,bridgeAngle:s.bridgeAngle+turn*2});
    else if(t.key)this.change({[t.key]:s[t.key]+(dx||dy||turn*.08)*25});else this.change({spacing:s.spacing+(dx||dy||turn*.03)});
  }
  diagnostics(){return {selected:this.selected,dragging:this.drag?.mode||null,targets:this.targets.map(t=>({id:t.id,mode:t.mode,point:{x:t.point.x,y:t.point.y,z:t.point.z},screen:{...t.screen},center:t.center?{x:t.center.x,y:t.center.y,z:t.center.z}:null}))};}
}
