import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {simplifyStageMaterials} from '../src/stage-quality.js';

test('emergency shader LOD preserves shared maps, alpha, clipping, geometry and emissive animation',()=>{
  const scene=new THREE.Scene(),texture=new THREE.Texture(),geometry=new THREE.PlaneGeometry();
  const material=new THREE.MeshPhysicalMaterial({map:texture,emissiveMap:texture,color:0x8d4933,emissive:0xffdeb0,emissiveIntensity:.7,side:THREE.DoubleSide,transparent:true,opacity:.8,alphaTest:.015,roughness:.8,clearcoat:.2});
  material.clippingPlanes=[new THREE.Plane()];
  let disposed=0,mapDisposed=0;material.addEventListener('dispose',()=>disposed++);texture.addEventListener('dispose',()=>mapDisposed++);
  const a=new THREE.Mesh(geometry,material),b=new THREE.Mesh(geometry,material),basic=new THREE.MeshBasicMaterial();
  const c=new THREE.Mesh(geometry,[material,basic]);scene.add(a,b,c);
  assert.equal(simplifyStageMaterials(scene),1);
  assert.ok(a.material.isMeshLambertMaterial);assert.equal(a.material,b.material);assert.equal(c.material[0],a.material);assert.equal(c.material[1],basic);
  for(const key of ['map','emissiveMap','emissiveIntensity','side','transparent','opacity','alphaTest','clippingPlanes'])assert.equal(a.material[key],material[key]);
  assert.deepEqual(a.material.color,material.color);assert.deepEqual(a.material.emissive,material.emissive);
  assert.equal(a.geometry,geometry);assert.equal(disposed,1);assert.equal(mapDisposed,0);
  a.material.emissiveIntensity=1.2;assert.equal(b.material.emissiveIntensity,1.2);
  assert.equal(simplifyStageMaterials(scene),0);assert.equal(disposed,1);
});
