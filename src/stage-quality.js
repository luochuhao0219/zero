import * as THREE from '../vendor/three.module.js';

/** Emergency, one-way shader LOD: keep the authored geometry, textures and lights. */
export function simplifyStageMaterials(scene) {
  const replacements=new Map();
  scene.traverse(object=>{
    if(!object.isMesh)return;
    const simplify=original=>{
      if(!original.isMeshStandardMaterial)return original;
      if(!replacements.has(original)){
        const material=new THREE.MeshLambertMaterial();
        for(const key of ['name','map','emissiveMap','emissiveIntensity','transparent','opacity','alphaTest','side','depthTest','depthWrite','vertexColors','fog','toneMapped','clippingPlanes','clipIntersection','clipShadows','polygonOffset','polygonOffsetFactor','polygonOffsetUnits'])material[key]=original[key];
        material.color.copy(original.color);material.emissive.copy(original.emissive);
        material.forceSinglePass=true;
        replacements.set(original,material);
      }
      return replacements.get(original);
    };
    object.material=Array.isArray(object.material)?object.material.map(simplify):simplify(object.material);
  });
  // Materials own programs, not their maps. Shared canvas/asset textures remain alive.
  for(const original of replacements.keys())original.dispose();
  return replacements.size;
}
