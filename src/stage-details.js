import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {puppetCanvas} from './art.js';
/** Stage-side tools, notices and audience seating; no extra lights or shadow maps. */
export function buildStageDetails(stage){
  const group=new THREE.Group();group.name='Theatre life and backstage tools';stage.scene.add(group);const batches=new Map(),m=stage.materials;
  const box=(w,h,d,x,y,z,material=m.darkWood,angle=0)=>{const geo=new THREE.BoxGeometry(w,h,d);const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,0)),new THREE.Vector3(1,1,1));geo.applyMatrix4(matrix);if(!batches.has(material))batches.set(material,[]);batches.get(material).push(geo);};
  for(const side of [-1,1]){
    // A low workbench, transport chest and a wooden hanging rack flank the cloth.
    const x=side*6.6;box(1.7,.13,1.05,x,1.05,-2,m.wood);for(const dx of [-.65,.65])for(const dz of [-.35,.35])box(.09,1.45,.09,x+dx,.33,-2+dz);
    box(1.3,.66,.85,x,-.02,1.2,m.redWood);box(1.36,.08,.9,x,.35,1.2,m.wood);box(.1,.13,.03,x,.15,1.66,m.brass);
    for(const dx of [-.73,.73])box(.07,3.6,.07,x+dx,1.35,-2.7,m.wood);box(1.7,.09,.09,x,3.1,-2.7,m.wood);
    for(let i=0;i<4;i++)box(.025,1.2,.025,x-.5+i*.3,1.7,-2.65,m.brass,side*.08);
    for(const [i,variant] of [0,1].entries()){const sprite=new THREE.Mesh(new THREE.PlaneGeometry(.55,.95),new THREE.MeshBasicMaterial({map:stage.texture(puppetCanvas(15,variant)),transparent:true,alphaTest:.05,side:THREE.DoubleSide,color:0xb5a687}));sprite.position.set(x-.35+i*.65,2.45,-2.61);group.add(sprite);}
    // Benches and tea cups keep the central walking/playing sightline clear.
    for(let row=0;row<2;row++){const z=4.3+row*2.1;box(2.5,.12,.5,side*5.2,.03,z,m.wood);for(const dx of [-1,1])box(.09,.55,.36,side*5.2+dx,-.23,z);}
    const cupMat=new THREE.MeshStandardMaterial({color:0x9d9c7d,roughness:.9});const cup=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.12,10),cupMat);cup.position.set(x+.4,1.18,-1.85);group.add(cup);
    const scroll=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.6,10),m.wood);scroll.position.set(x-.25,1.16,-2);scroll.rotation.z=Math.PI/2;group.add(scroll);
    const notice=document.createElement('canvas');notice.width=256;notice.height=384;const ctx=notice.getContext('2d');
    const paint=()=>{ctx.fillStyle='#cdb789';ctx.fillRect(0,0,256,384);ctx.strokeStyle='#6f4e32';ctx.lineWidth=3;ctx.strokeRect(12,12,232,360);ctx.textAlign='center';ctx.fillStyle='#713e2b';ctx.font='50px "Zhi Mang Xing",serif';ctx.fillText(side<0?'今夜开戏':'灯下相逢',128,76);ctx.fillStyle='#62553e';ctx.font='24px "Studio Song",serif';['一盏灯，一张幕','影随手动，戏随心生','珞珈此夜 · 借光'].forEach((line,i)=>ctx.fillText(line,128,145+i*52));ctx.strokeStyle='#8f4c32';ctx.strokeRect(95,295,66,48);ctx.font='28px "Zhi Mang Xing",serif';ctx.fillText('入戏',128,330);};
    paint();const texture=stage.texture(notice);stage.signPainters.push(()=>{paint();texture.needsUpdate=true;});const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.73),new THREE.MeshBasicMaterial({map:texture,color:0xb8aa89}));sign.position.set(side*8,1.5,-3);sign.rotation.y=-side*.28;group.add(sign);
  }
  for(const [material,geos] of batches){const merged=mergeGeometries(geos,false);geos.forEach(geo=>geo.dispose());if(merged)group.add(new THREE.Mesh(merged,material));}
  document.fonts.ready.then(()=>stage.signPainters.forEach(paint=>paint()));
}
