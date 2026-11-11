import * as THREE from '../vendor/three.module.js';
import {CabinetClock} from './cabinet-motion.js';
import {MUSEUM_STOPS} from './route-state.js';

// The eight PNG cells are rigid leather cutouts. UVs and vertex positions never
// change during playback: shoulders, elbows, hips and knees rotate as a tree.
export const ATLAS_SIZE=[1536,1024];
const CELLS={body:[0,0],upper:[1,0],forearm:[2,0],thigh:[3,0],shin:[0,1],femaleBody:[1,1],femaleUpper:[2,1],femaleForearm:[3,1]};
const RAD=Math.PI/180;
export function performanceMaterial(map){return new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});}
export function loadPuppetAtlas(renderer,errors){
 let done;const ready=new Promise(resolve=>done=resolve),url='./assets/museum/jointed-puppet-atlas.png';
 const map=new THREE.TextureLoader().load(url,()=>done(),undefined,()=>{errors.push(url);done();});
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return {map,ready};
}
export function loadParasolTexture(renderer,errors){
 let done;const ready=new Promise(resolve=>done=resolve),url='./assets/museum/oil-paper-parasol.png';
 const map=new THREE.TextureLoader().load(url,()=>done(),undefined,()=>{errors.push(url);done();});
 map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return {map,ready};
}
function cutout(key,pivot,scale,material){
 const [col,row]=CELLS[key],g=new THREE.PlaneGeometry(384*scale,512*scale);
 const uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(col+uv.getX(i))/4,(1-row+uv.getY(i))/2);
 const mesh=new THREE.Mesh(g,material);
 mesh.position.set((192-pivot[0])*scale,(pivot[1]-256)*scale,0);
 return mesh;
}
function limb(parent,material,key,pivot,scale,at,depth){
 const joint=new THREE.Group();joint.position.set(at[0],at[1],depth);joint.add(cutout(key,pivot,scale,material));parent.add(joint);return joint;
}
export function createArticulatedPuppet(material,female=false){
 const root=new THREE.Group(),joints={};const legMaterial=material.clone();legMaterial.color.set('#a65332');root.name='painted-articulated-puppet';
 const body=cutout(female?'femaleBody':'body',[0,0],1,material);body.position.z=2;root.add(body);
 for(const [side,x,depth] of [['back',female?222:237,0],['front',female?184:190,4]]){
  const upper=limb(root,material,female?'femaleUpper':'upper',female?[188,73]:[193,72],.42,[x,-262],depth);
  const forearm=limb(upper,material,female?'femaleForearm':'forearm',female?[188,71]:[188,68],.36,[female?0:2,-(female?350:362)*.42],1);
  joints[side+'Shoulder']=upper;joints[side+'Elbow']=forearm;
 }
 for(const [side,x,depth] of [['back',female?220:250,0],['front',female?185:205,1]]){
  const thigh=limb(root,legMaterial,'thigh',[196,70],.38,[x,-413],depth);
  const shin=limb(thigh,legMaterial,'shin',[182,73],.36,[-20*.38,-380*.38],1);
  thigh.children[0].scale.x=1.35;shin.children[0].scale.x=1.35;
  joints[side+'Hip']=thigh;joints[side+'Knee']=shin;
 }
 return {root,joints,basePosition:root.position.clone()};
}
export function jointPose(seconds,index=0,partner=0,reduced=false){
 const phase=((seconds%8)+8)%8*Math.PI/4+index*.45+partner*Math.PI;
 const lift=reduced?0:(1-Math.cos(phase))*.5;
 const step=reduced?0:Math.sin(phase);
 if(index===1)return partner?{
  frontShoulder:42+35*lift,frontElbow:30+45*lift,backShoulder:-18,backElbow:34,
  frontHip:4+5*step,frontKnee:-12-8*Math.max(0,step),backHip:-6,backKnee:-10,
 }:{
  frontShoulder:52+12*step,frontElbow:78+8*lift,backShoulder:18+8*lift,backElbow:92-12*lift,
  frontHip:3,frontKnee:-10,backHip:-4,backKnee:-9,
 };
 if(index===2)return partner?{
  frontShoulder:100+12*step,frontElbow:12+8*lift,backShoulder:22+18*lift,backElbow:36,
  frontHip:10+19*step,frontKnee:-12-38*Math.max(0,step),backHip:-10-19*step,backKnee:-12-38*Math.max(0,-step),
 }:{
  frontShoulder:68+16*lift,frontElbow:28+18*lift,backShoulder:-24+10*step,backElbow:38,
  frontHip:10+19*step,frontKnee:-12-38*Math.max(0,step),backHip:-10-19*step,backKnee:-12-38*Math.max(0,-step),
 };
 if(index===3)return partner?{
  frontShoulder:88-68*lift,frontElbow:75-52*lift,backShoulder:-35+25*lift,backElbow:42,
  frontHip:5+10*step,frontKnee:-16-25*lift,backHip:-10,backKnee:-18,
 }:{
  frontShoulder:25+85*lift,frontElbow:28+65*lift,backShoulder:-38+12*step,backElbow:44,
  frontHip:8-12*step,frontKnee:-12-30*lift,backHip:-7+12*step,backKnee:-16,
 };
 if(index===4)return partner?{
  frontShoulder:75+40*step,frontElbow:25+45*lift,backShoulder:-55+25*lift,backElbow:58,
  frontHip:5+18*step,frontKnee:-14-40*Math.max(0,step),backHip:-8-18*step,backKnee:-12-32*Math.max(0,-step),
 }:{
  frontShoulder:108-38*step,frontElbow:28+36*(1-lift),backShoulder:-62+22*lift,backElbow:45,
  frontHip:6-18*step,frontKnee:-14-40*Math.max(0,-step),backHip:-9+18*step,backKnee:-12-32*Math.max(0,step),
 };
 return {
  frontShoulder:30+55*lift,frontElbow:15+70*lift,
  backShoulder:-12+28*lift,backElbow:18+45*(1-lift),
  frontHip:8+16*step,frontKnee:-8-40*Math.max(0,step),
  backHip:-8-16*step,backKnee:-8-40*Math.max(0,-step),
 };
}
export function stageMotion(seconds,index=0,partner=0,reduced=false){
 if(index===0||reduced)return {x:0,y:0,tilt:0};
 const phase=((seconds%8)+8)%8*Math.PI/4;
 const wave=Math.sin(phase),lift=(1-Math.cos(phase))*.5,direction=partner?-1:1;
 if(index===1)return {x:direction*.045*wave,y:.025*lift,tilt:direction*.025*wave};
 if(index===2)return {x:.16*wave,y:.055*Math.max(0,wave),tilt:direction*.025*wave};
 if(index===3)return {x:direction*.10*lift,y:.11*lift,tilt:direction*.045*wave};
 return {x:direction*.18*wave,y:.095*Math.max(0,wave*direction),tilt:direction*.075*wave};
}
function coloredShape(geometry,color){return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));}
function performanceProp(index,scene,parasol){
 if(index<2)return null;
 const prop=new THREE.Group();prop.position.z=.12;scene.add(prop);
 if(index===2){
  prop.add(new THREE.Mesh(new THREE.PlaneGeometry(1.32,.88),new THREE.MeshBasicMaterial({map:parasol,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthTest:false,depthWrite:false})));
 }else if(index===3){
  prop.add(coloredShape(new THREE.CircleGeometry(.17,24),'#b63e33'));
  const center=coloredShape(new THREE.CircleGeometry(.09,12),'#efd27a');center.position.z=.01;prop.add(center);
  for(let i=0;i<8;i++){const petal=coloredShape(new THREE.CircleGeometry(.025,8),'#e8b866');const a=i*Math.PI/4;petal.position.set(Math.cos(a)*.13,Math.sin(a)*.13,.02);prop.add(petal);}
 }else{
  prop.add(coloredShape(new THREE.CircleGeometry(.43,18,0,Math.PI),'#f2d899'));
  for(let i=0;i<7;i++){const spoke=coloredShape(new THREE.PlaneGeometry(.009,.29),'#9c5630');spoke.position.set(Math.cos(i*Math.PI/6)*.13,Math.sin(i*Math.PI/6)*.13,.01);spoke.rotation.z=-i*Math.PI/6;prop.add(spoke);}
  prop.position.set(1.02,.50,.12);
 }
 prop.traverse(part=>{if(part.isMesh)part.renderOrder=30;});
 return prop;
}
export function createPicturePerformance(mural,atlas,index,renderer,parasol){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,1.725,-1.725,.1,10);camera.position.z=5;
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(6,3.45),mural.material.clone());backdrop.material.depthTest=false;backdrop.material.depthWrite=false;backdrop.renderOrder=-100;scene.add(backdrop);
 const target=new THREE.WebGLRenderTarget(1536,884,{depthBuffer:false});
 const material=new THREE.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:false,depthTest:false,forceSinglePass:true});
 const scale=index===2?.002:index===3?.0025:.0028;
 const rigs=[createArticulatedPuppet(material),createArticulatedPuppet(material,true)];
 const prop=performanceProp(index,scene,parasol);
 rigs.forEach((rig,i)=>{
  // Attached to the picture plane, behind the glass; never freestanding in the case.
  rig.root.scale.set(i?-scale:scale,scale,scale);
  rig.root.position.set(i?1.48:-1.55,index===2?.65:.80,.045+i*.002);
  rig.basePosition=rig.root.position.clone();
  scene.add(rig.root);
  // Painter-order composition inside the image, never across gallery geometry.
  rig.root.children[0].renderOrder=10;
  for(const [name,joint] of Object.entries(rig.joints))joint.children[0].renderOrder=name.includes('Shoulder')||name.includes('Elbow')?(name.startsWith('front')?20:3):(name.startsWith('front')?6:5);
 });
 let last=null,wasReduced=null;
 rigs.prop=prop;
 rigs.render=(seconds,progress,reduced,visible)=>{
  if(!atlas.image||!backdrop.material.map.image)return;
  const first=last===null,near=Math.abs(progress-MUSEUM_STOPS[index].at)<.13;
  if(!first&&(!visible||!near||reduced===wasReduced&&Math.abs(seconds-last)<1/24))return;
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(previous);
  if(first){mural.material.map=target.texture;mural.material.needsUpdate=true;}
  last=seconds;wasReduced=reduced;
 };
 return rigs;
}
export class MuseumPerformances {
 constructor(pictures){this.pictures=pictures;this.clock=new CabinetClock();this.paused=false;this.reading=false;this.reduced=false;}
 setPaused(value){this.paused=Boolean(value);}
 update(time,progress,reduced,visible){
  this.reduced=reduced;
  const seconds=this.clock.tick(time,visible&&!reduced&&!this.paused&&!this.reading);
  this.pictures.forEach((rigs,index)=>{
   rigs.forEach((rig,partner)=>{
    const pose=jointPose(seconds,index,partner,reduced);
    for(const [name,angle] of Object.entries(pose))rig.joints[name].rotation.z=angle*RAD;
    const motion=stageMotion(seconds,index,partner,reduced);
    rig.root.position.copy(rig.basePosition).add(new THREE.Vector3(motion.x,motion.y,0));
    rig.root.rotation.z=motion.tilt;
   });
   if(rigs.prop){
    const phase=reduced?0:((seconds%8)+8)%8*Math.PI/4;
    if(index===2){
     // Keep the parasol's handle at the raised puppet's palm as its joints move.
     rigs[1].root.updateMatrixWorld(true);
     const hand=rigs[1].joints.frontElbow.localToWorld(new THREE.Vector3(25,-125,0));
     rigs.prop.position.set(hand.x,hand.y+.39,.12);
     rigs.prop.rotation.z=0;
    }
    if(index===3){const travel=(1-Math.cos(phase))*.5;rigs.prop.position.set(-.72+1.44*travel,.45+.42*Math.sin(Math.PI*travel),.12);rigs.prop.rotation.z=phase;}
    if(index===4){rigs.prop.position.x=1.02+.18*Math.sin(phase);rigs.prop.position.y=.50+.10*Math.max(0,Math.sin(phase));rigs.prop.rotation.z=.28*Math.sin(phase);}
   }
  });
  this.pictures.forEach(rigs=>rigs.render?.(seconds,progress,reduced,visible));
 }
 diagnostics(){return {seconds:this.clock.seconds,running:this.clock.running,paused:this.paused,reduced:this.reduced,cabinets:this.pictures.length,animation:'five distinct rigid-joint scenes with three props'};}
}
