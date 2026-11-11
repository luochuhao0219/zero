import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {surfaceUV} from './surface-uv.js';
import {GALLERY_SHELL,GALLERY_WINDOWS,GALLERY_LANTERNS} from './gallery-layout.js';

/** Stone reveals, timber coffers and real window bars match the doorway photo. */
export function galleryArchitecture(parent,m){
  const batches=new Map(),lanternLights=[];
  const {left,right,front,back,height}=GALLERY_SHELL,width=right-left,length=front-back,cx=(left+right)/2,cz=(front+back)/2;
  function add(geometry,material,x,y,z,rx=0,ry=0){
    if(geometry.index){const original=geometry;geometry=original.toNonIndexed();original.dispose();}
    geometry.rotateX(rx).rotateY(ry).translate(x,y,z);
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push(geometry);
  }
  function box(w,h,d,x,y,z,material,round=false,uv={}){
    const geometry=round?new RoundedBoxGeometry(w,h,d,1,Math.min(.025,w/5,h/5,d/5)):new THREE.BoxGeometry(w,h,d);
    if(material.map)surfaceUV(geometry,[w,h,d],{...material.userData.surface,...uv});
    add(geometry,material,x,y,z);
  }
  function rod(from,to,r,material){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const geometry=new THREE.CylinderGeometry(r,r,delta.length(),8);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    add(geometry,material,...mid.toArray());
  }
  box(width,.18,length,cx,-.09,cz,m.floor);
  for(const x of [left,right]){
    box(.3,height,length,x,height/2,cz,m.wall);
    box(.36,.34,length,x,.17,cz,m.stone,true);
    box(.36,.15,length,x,height-.11,cz,m.stone,true);
  }
  box(width,height,.3,cx,height/2,back,m.wall);
  // Individual boards give the ceiling real recessed seams and long grain.
  box(width,.12,length,cx,height+.12,cz,m.ceiling);
  const boardCount=Math.ceil(width/.58),boardWidth=width/boardCount;
  for(let i=0;i<boardCount;i++)box(boardWidth-.012,.16,length,left+(i+.5)*boardWidth,height,cz,m.ceiling,false,{grainAxis:2});
  for(const x of [left+.4,-2.4,.9,right-.4])box(.18,.24,length,x,height-.18,cz,m.beam);
  for(let z=7;z>back;z-=4.75){
    box(width,.33,.34,cx,height-.35,z,m.beam,true);
    for(const x of [left+.22,right-.22]){
      box(.45,.58,.65,x,height-.64,z,m.beam,true);
    }
  }
  // A restrained stone margin replaces the brightly patterned runner.
  for(const x of [left+.42,right-.42])box(.17,.012,length,x,.006,cz,m.stone);

  function window(w,h,x,y,z,yaw,viewIndex){
    const t=new THREE.Matrix4().makeRotationY(yaw).setPosition(x,y,z);
    function part(geometry,material,px=0,py=0,pz=0){
      geometry.translate(px,py,pz).applyMatrix4(t);add(geometry,material,0,0,0);
    }
    function bar(bw,bh,bd,px,py,pz,material){
      const geometry=new THREE.BoxGeometry(bw,bh,bd);
      if(material.map)surfaceUV(geometry,[bw,bh,bd],material.userData.surface);
      part(geometry,material,px,py,pz);
    }
    bar(w+.52,h+.48,.16,0,0,0,m.stone);
    bar(w+.19,h+.17,.20,0,0,.10,m.lacquer);
    part(new THREE.PlaneGeometry(w,h),m.windowViews[viewIndex%m.windowViews.length],0,0,.215);
    for(const s of [-1,1]){
      bar(.095,h+.1,.10,s*w/2,0,.26,m.wood);
      bar(w+.15,.10,.10,0,s*h/2,.26,m.wood);
    }
    for(let i=1;i<4;i++)bar(.045,h,.08,-w/2+w*i/4,0,.27,m.lacquer);
    for(let i=1;i<6;i++)bar(w,.045,.08,0,-h/2+h*i/6,.27,m.lacquer);
    bar(w+.64,.16,.44,0,-h/2-.15,.12,m.stone);
    bar(w+.65,.12,.22,0,h/2+.19,.07,m.stone);
  }
  for(const [i,z] of GALLERY_WINDOWS.entries()){
    window(2.30,3.46,left+.18,3.18,z,Math.PI/2,2*i);
    window(2.30,3.46,right-.18,3.18,z,-Math.PI/2,2*i+1);
    for(const x of [left+.18,right-.18])for(const side of [-1,1]){
      box(.26,5.1,.22,x,2.65,z+side*1.55,m.stone,true);
      box(.37,.14,.39,x,5.15,z+side*1.55,m.stone,true);
    }
  }
  // The cool end window anchors the same sightline as the entrance photograph.
  window(3.4,4.35,cx+.65,2.78,back+.18,0,3);

  for(const z of GALLERY_LANTERNS){
    const x=-.25;
    add(new THREE.CylinderGeometry(.10,.16,.07,12),m.bronze,x,5.51,z);
    rod([x,5.48,z],[x,4.84,z],.016,m.bronze);
    add(new THREE.TorusGeometry(.07,.013,6,14),m.bronze,x,4.87,z);
    add(new THREE.CylinderGeometry(.10,.38,.24,6),m.bronze,x,4.69,z);
    add(new THREE.CylinderGeometry(.32,.23,.75,6),m.lampGlass,x,4.20,z);
    add(new THREE.CylinderGeometry(.26,.14,.14,6),m.bronze,x,3.76,z);
    add(new THREE.SphereGeometry(.065,10,8),m.brass,x,3.64,z);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      rod([x+Math.sin(a)*.326,4.59,z+Math.cos(a)*.326],[x+Math.sin(a)*.237,3.82,z+Math.cos(a)*.237],.025,m.bronze);
    }
    for(const [r,y] of [[.34,4.59],[.25,3.82]])add(new THREE.CylinderGeometry(r,r,.045,6),m.bronze,x,y,z);
    const lamp=new THREE.PointLight('#ffc176',48,20,2);lamp.position.set(x,4.13,z);parent.add(lamp);lanternLights.push(lamp);
  }

  // Small old tables and celadon vessels repeat the photographed corridor detail.
  for(const z of [-12.75,-31.75,-41.25]){
    const x=left+.72;
    box(.86,.10,1.7,x,1.36,z,m.wood,true);
    box(.76,.20,1.52,x,1.20,z,m.wood,true);
    for(const dx of [-.31,.31])for(const dz of [-.65,.65])box(.085,1.2,.085,x+dx,.65,z+dz,m.lacquer,true);
    box(.65,.06,1.4,x,.30,z,m.wood);
    const profile=[[.16,0],[.23,.07],[.29,.24],[.28,.42],[.20,.54],[.13,.60],[.14,.65]].map(p=>new THREE.Vector2(...p));
    add(new THREE.LatheGeometry(profile,24),m.ceramic,x,1.41,z);
    add(new THREE.TorusGeometry(.135,.023,8,24),m.ceramic,x,2.06,z,Math.PI/2);
  }
  for(const [material,geometries] of batches){
    const geometry=mergeGeometries(geometries),mesh=new THREE.Mesh(geometry,material);
    mesh.name='photograph-matched-gallery';parent.add(mesh);
    geometries.forEach(part=>part.dispose());
  }
  return {lanternLights};
}
