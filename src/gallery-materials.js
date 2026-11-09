import * as THREE from '../vendor/three.module.js';
import {interiorEnvironment} from './museum-finishes.js';
export function galleryMaterials(renderer,scene){
 const pending=[],errors=[],loader=new THREE.TextureLoader(),cache=new Map();
 function map(folder,kind,repeat=1){const key=folder+'/'+kind;if(cache.has(key))return cache.get(key);let done;pending.push(new Promise(r=>done=r));const url='./assets/materials/'+key+'.jpg';const texture=loader.load(url,()=>done(),()=>{},()=>{errors.push(url);done();});texture.colorSpace=kind==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());cache.set(key,texture);return texture;}
 const surface=(folder,color,roughness,repeat=1)=>new THREE.MeshStandardMaterial({color,map:map(folder,'color',repeat),normalMap:map(folder,'normal',repeat),roughnessMap:map(folder,'roughness',repeat),normalScale:new THREE.Vector2(.45,.45),roughness,envMapIntensity:.4});
 const wood=surface('aged-wood','#ad896b',.62),wall=surface('aged-plaster','#a8b4ae',.98,2),floor=surface('stone','#83918b',.75,8);
 const brass=new THREE.MeshStandardMaterial({color:'#c09b57',metalness:.78,roughness:.38,envMapIntensity:.9});
 const glass=new THREE.MeshPhysicalMaterial({color:'#c4e1df',metalness:.15,roughness:.12,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.075,depthWrite:false,envMapIntensity:1.1,side:THREE.DoubleSide});
 const linenNormal=map('linen','normal');
 const environment=interiorEnvironment(renderer,scene);
 return {wood,wall,floor,brass,glass,linenNormal,environment,errors,ready:Promise.all(pending)};
}
export function contactTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(15,12,8,.65)');g.addColorStop(.45,'rgba(15,12,8,.25)');g.addColorStop(1,'rgba(15,12,8,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
