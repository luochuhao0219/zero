import * as THREE from '../vendor/three.module.js';
import {articulatedAssets} from './articulated-art.js';
import {RIG_PARTS,getJoints} from './puppet-motion.js';
export const PIXEL_SCALE=1.8/480;
const shared=new WeakMap();
/** Each figure shares immutable cropped textures/geometries; only joint transforms animate. */
export function createArticulatedRig(stage,variant=0,projected=false,side=1){
 let resources=shared.get(stage);if(!resources){resources={};shared.set(stage,resources);}if(!resources[variant]){const assets=articulatedAssets(variant);resources[variant]=Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,{...asset,texture:stage.texture(asset.canvas),geometry:new THREE.PlaneGeometry(asset.width*PIXEL_SCALE,asset.height*PIXEL_SCALE)}]));}
 const root=new THREE.Group(),nodes={};root.name='Articulated shadow figure';
 for(const part of RIG_PARTS){const node=new THREE.Group(),asset=resources[variant][part.id],parent=nodes[part.parent]||root;const offset=part.parent?part.offset:[part.offset[0]-240,part.offset[1]-410];node.position.set(offset[0]*PIXEL_SCALE,-offset[1]*PIXEL_SCALE,0);parent.add(node);nodes[part.id]=node;
  const options={map:asset.texture,transparent:true,alphaTest:.015,side:THREE.DoubleSide,depthWrite:true};const material=projected?new THREE.MeshBasicMaterial({...options,color:0x805332,opacity:.9,clippingPlanes:stage.clipPlanes}):new THREE.MeshStandardMaterial({...options,roughness:.85});const mesh=new THREE.Mesh(asset.geometry,material);mesh.position.set((asset.left+asset.width/2)*PIXEL_SCALE,-(asset.top+asset.height/2)*PIXEL_SCALE,part.layer*.001*side);node.add(mesh);
 }
 root.userData={variant,jointNodes:nodes,front:nodes.upperFront,back:nodes.upperBack};stage.root.add(root);return root;
}
export function applyArticulation(rig,actor){const joints=getJoints(actor);for(const part of RIG_PARTS)if(part.joint)rig.userData.jointNodes[part.id].rotation.z=joints[part.joint]*(part.sign||1)*Math.PI/180;}
export function rigPoint(rig,id,offset={x:0,y:0}){const node=rig.userData.jointNodes?.[id];if(!node)return null;return node.localToWorld(new THREE.Vector3(offset.x*PIXEL_SCALE,-offset.y*PIXEL_SCALE,0));}
export function rigCanonicalPoint(rig,point){rig.updateWorldMatrix(true,true);const local=rig.worldToLocal(point.clone());return {x:local.x/PIXEL_SCALE+240,y:410-local.y/PIXEL_SCALE};}
