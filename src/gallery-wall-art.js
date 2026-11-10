import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {cabinetZ} from './walking-path.js';
import {GALLERY_SHELL} from './gallery-layout.js';

// Wall-mounted illustrations share one atlas and a handful of static batches.
// The frames are part of the room, so they keep their perspective while walking.
export function galleryWallArt(parent,renderer,{wood,brass,linenNormal}){
  const errors=[],batches=new Map();
  let loaded;
  const ready=new Promise(resolve=>{loaded=resolve;});
  const url='./assets/museum/wall-art-atlas.png';
  const atlas=new THREE.TextureLoader().load(url,()=>loaded(),undefined,()=>{errors.push(url);loaded();});
  atlas.colorSpace=THREE.SRGBColorSpace;
  atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const art=new THREE.MeshStandardMaterial({map:atlas,color:'#fff1d8',roughness:.94,
    emissiveMap:atlas,emissive:'#ffd49a',emissiveIntensity:.32,envMapIntensity:.12});
  const silk=new THREE.MeshStandardMaterial({color:'#dcc8a1',roughness:.96,
    normalMap:linenNormal,normalScale:new THREE.Vector2(.06,.06)});
  const backing=new THREE.MeshStandardMaterial({color:'#201b16',roughness:1});

  const surface=(x,y,z,yaw)=>new THREE.Matrix4().makeRotationY(yaw).setPosition(x,y,z);
  function add(geometry,material,transform,x=0,y=0,z=0){
    geometry.translate(x,y,z).applyMatrix4(transform);
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push(geometry);
  }
  function bar(w,h,d,x,y,z,material,transform){
    add(new THREE.BoxGeometry(w,h,d),material,transform,x,y,z);
  }
  function frame(width,x,y,z,yaw,variant,small=false){
    const height=width/1.5,mat=small?.065:.16,rim=small?.045:.08;
    const w=width+mat*2,h=height+mat*2,t=surface(x,y,z,yaw);
    bar(w+rim*2+.035,h+rim*2+.035,.025,0,0,.018,backing,t);
    bar(w,h,.045,0,0,.052,silk,t);
    for(const sign of [-1,1]){
      bar(w+rim*2,rim,.12,0,sign*(h+rim)/2,.08,wood,t);
      bar(rim,h,.12,sign*(w+rim)/2,0,.08,wood,t);
      bar(w+.025,.018,.025,0,sign*h/2,.147,brass,t);
      bar(.018,h,.025,sign*w/2,0,.147,brass,t);
      for(const side of [-1,1])add(new THREE.CircleGeometry(small?.022:.038,12),brass,t,side*(w+rim)/2,sign*(h+rim)/2,.145);
    }
    const picture=new THREE.PlaneGeometry(width,height),uv=picture.attributes.uv;
    const col=variant%2,row=Math.floor(variant/2),inset=.003;
    for(let i=0;i<uv.count;i++)uv.setXY(i,col*.5+inset+uv.getX(i)*(.5-inset*2),(1-row)*.5+inset+uv.getY(i)*(.5-inset*2));
    add(picture,art,t,0,0,.081);
  }

  // Keep cultural illustrations between the windows, in quiet old wood frames.
  // The wall over each case is stone, matching the photographed entrance.
  for(let i=0;i<5;i++)frame(2.65,GALLERY_SHELL.right-.19,2.75,cabinetZ(i),-Math.PI/2,i%4);
  frame(1.85,GALLERY_SHELL.left+.19,2.95,7,Math.PI/2,0);
  for(const [material,geometries] of batches){
    const geometry=mergeGeometries(geometries),mesh=new THREE.Mesh(geometry,material);
    mesh.name='museum-wall-art';parent.add(mesh);
    geometries.forEach(part=>part.dispose());
  }
  return {ready,errors};
}
