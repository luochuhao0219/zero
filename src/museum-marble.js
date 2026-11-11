import * as THREE from '../vendor/three.module.js';

// Object-space sampling keeps the mineral veins continuous around bevelled edges.
export function marbleMaterial(renderer,errors){
  let done;const ready=new Promise(resolve=>done=resolve),url='./assets/museum/ivory-marble.png';
  const map=new THREE.TextureLoader().load(url,()=>done(),undefined,()=>{errors.push(url);done();});
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const m=new THREE.MeshPhysicalMaterial({map,color:'#fff8e9',bumpMap:map,bumpScale:.006,roughness:.23,metalness:.02,clearcoat:.65,clearcoatRoughness:.16,envMapIntensity:1.1});
  m.userData.ready=ready;
  m.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 marblePoint;\nvarying vec3 marbleNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nmarblePoint=position;marbleNormal=normal;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 marblePoint;\nvarying vec3 marbleNormal;').replace('#include <map_fragment>',`
      vec3 weights=pow(abs(marbleNormal),vec3(4.));weights/=max(dot(weights,vec3(1.)),.0001);
      vec3 p=marblePoint*.62+vec3(.5);
      diffuseColor*=texture2D(map,p.zy)*weights.x+texture2D(map,p.xz)*weights.y+texture2D(map,p.xy)*weights.z;
    `);
  };
  return m;
}
export function inscriptionMaterial(room){
  const c=document.createElement('canvas');c.width=1536;c.height=384;
  const ctx=c.getContext('2d');ctx.textAlign='center';ctx.fillStyle='#855315';
  ctx.filter='blur(1.5px)';ctx.globalAlpha=.95;ctx.font='58px "Songti SC", SimSun, serif';
  ctx.fillText('江 汉 皮 影  ·  '+room.name,768,94);
  ctx.font='30px "Songti SC", SimSun, serif';
  ctx.fillText('光 影 留 声   一 灯 一 幕   江 汉 流 芳   旧 戏 新 传',768,160);
  ctx.fillText('山 川 风 物   百 艺 相 生   刻 镂 成 影   弦 歌 不 息',768,220);
  ctx.fillRect(190,265,1156,2);ctx.font='24px serif';ctx.fillText('珞 珈 夜 戏    ·    非 遗 光 影 纪',768,322);
  ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.28;
  for(let i=0;i<230;i++)ctx.fillRect((i*137)%1536,(i*197)%384,3+(i%8),2+(i%4));
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
}
