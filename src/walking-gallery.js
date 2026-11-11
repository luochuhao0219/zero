import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {galleryMaterials,contactTexture} from './gallery-materials.js';
import {galleryWallArt} from './gallery-wall-art.js';
import {galleryArchitecture} from './gallery-architecture.js';
import {surfaceUV} from './surface-uv.js';
import {performanceMaterial,MuseumPerformances,loadPuppetAtlas,createPicturePerformance} from './museum-animation.js';
import {marbleMaterial,inscriptionMaterial} from './museum-marble.js';
import {smooth} from './route-state.js';
import {ROOMS} from './museum-content.js';
const V=(...p)=>new THREE.Vector3(...p);
import {cabinetZ} from './walking-path.js';
export {walkingPose} from './walking-path.js';
export class WalkingGallery {
  constructor(scene,renderer){
    this.group=new THREE.Group();scene.add(this.group);this.points=[];this.signPoints=[];this.cabinetLights=[];this.performances=[];
    this.materials=galleryMaterials(renderer,scene);this.ready=this.materials.ready;this.errors=this.materials.errors;
    const {wood,brass,glass}=this.materials;
    const box=(w,h,d,x,y,z,m,parent=this.group)=>{
      const geometry=new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.15,h*.15,d*.15));
      if(m.map)surfaceUV(geometry,[w,h,d],m.userData.surface);
      const mesh=new THREE.Mesh(geometry,m);mesh.userData.galleryStatic=true;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    };
    this.lanternLights=galleryArchitecture(this.group,this.materials).lanternLights;
    this.group.add(new THREE.HemisphereLight('#d6d3c4','#4f3928',.48));
    const sun=new THREE.DirectionalLight('#ffe0b1',.65);sun.position.set(-3,7,6);this.group.add(sun);
    const fill=new THREE.DirectionalLight('#a5c8e2',.38);fill.position.set(8,4,-32);this.group.add(fill);
    const shadowMap=contactTexture();
    const marble=marbleMaterial(renderer,this.errors),atlas=loadPuppetAtlas(renderer,this.errors),pending=[marble.userData.ready,atlas.ready];
    const murals=['origins-stage','river-mural','craft-mural','troupe-mural','innovation-stage'].map(name=>{
      let done;pending.push(new Promise(resolve=>done=resolve));
      const url='./assets/museum/'+name+'.png';
      const texture=new THREE.TextureLoader().load(url,()=>done(),undefined,()=>{this.errors.push(url);done();});
      texture.colorSpace=THREE.SRGBColorSpace;return texture;
    });
    this.ready=Promise.all([this.materials.ready,...pending]);
    ROOMS.forEach((room,i)=>{
      const z=cabinetZ(i),cab=new THREE.Group();cab.position.set(-5,0,z);this.group.add(cab);
      box(1.2,.75,6,0,.375,0,wood,cab);box(.15,3.3,6,-.5,2.35,0,wood,cab);box(1.3,.2,6,0,4.1,0,wood,cab);
      for(const dz of [-3,3])box(1.3,3.3,.12,0,2.4,dz,wood,cab);
      // Inlaid mouldings, panel seams and aged metal hardware catch grazing light.
      for(const y of [.08,.62,.77,3.98,4.18])box(1.42,.055,6.18,.02,y,0,y===.77||y===3.98?brass:wood,cab);
      for(const dz of [-2.91,2.91]){box(.12,3.26,.12,.67,2.38,dz,wood,cab);for(const y of [1,3.6]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.038,8,6),brass);screw.userData.galleryStatic=true;screw.position.set(.75,y,dz);cab.add(screw);}}
      for(let dz=-2.5;dz<=2.5;dz+=1.25)for(const y of [.25,.53]){
        box(.05,.235,1.12,.63,y,dz,wood,cab);
        const pull=new THREE.Mesh(new THREE.TorusGeometry(.052,.011,6,12),brass);pull.userData.galleryStatic=true;
        pull.rotation.y=Math.PI/2;pull.position.set(.676,y-.02,dz);cab.add(pull);
      }
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,8),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.3,.012,0);cab.add(shadow);
      const lights=[];
      for(const offset of [-1.55,1.55]){const lamp=new THREE.PointLight('#ffd498',7,6,2);lamp.position.set(1.15,3.65,offset);cab.add(lamp);lights.push(lamp);}
      this.cabinetLights.push(lights);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.04,.025,5.5),new THREE.MeshBasicMaterial({color:'#e8b16e'}));strip.position.set(.08,3.96,0);cab.add(strip);
      const glazing=new THREE.Mesh(new THREE.PlaneGeometry(5.75,3.05),glass);glazing.rotation.y=Math.PI/2;glazing.position.set(.72,2.34,0);cab.add(glazing);
      const mural=new THREE.Mesh(new THREE.PlaneGeometry(6,3.45),performanceMaterial(murals[i],i));mural.rotation.y=Math.PI/2;mural.position.set(-.31,2.4,0);cab.add(mural);
      this.performances.push(createPicturePerformance(mural,atlas.map,i,renderer));
      // A three-unit (half-case-width) low marble slab, facing 45 degrees up.
      // Its highest corner is .62, below the mural's lower edge at .675.
      const sign=new THREE.Group();sign.position.set(1.25,.33,0);sign.rotation.z=Math.PI/4;cab.add(sign);
      box(.10,.72,3,0,0,0,marble,sign);
      box(.78,.06,3.08,1.25,.03,0,marble,cab);
      const inscription=new THREE.Mesh(new THREE.PlaneGeometry(2.82,.66),inscriptionMaterial(room));
      inscription.rotation.y=Math.PI/2;inscription.position.set(.075,0,0);sign.add(inscription);
      // Project the invitation just beyond the marble's upper right corner.
      this.signPoints.push(V(-3.85,.91,z-1.72));
      // Restrained glass edge and ceiling light preserve legibility.
      box(.04,.035,5.8,.67,3.9,0,brass,cab);box(.04,.035,5.8,.67,.8,0,brass,cab);
      this.points.push(V(-4.3,3.8,z));
    });
    this.vignette=new MuseumPerformances(this.performances);
    this.updateLocalLights(2);
    const wallArt=galleryWallArt(this.group,renderer,this.materials);
    this.ready=Promise.all([this.ready,wallArt.ready]).then(()=>{this.errors.push(...wallArt.errors);});
    this.batchFurniture();
  }
  batchFurniture(){
    this.group.updateMatrixWorld(true);
    const batches=new Map(),meshes=[];
    this.group.traverse(mesh=>{if(mesh.userData.galleryStatic)meshes.push(mesh);});
    for(const mesh of meshes){
      let geometry=mesh.geometry.clone();
      if(geometry.index){const original=geometry;geometry=original.toNonIndexed();original.dispose();}
      geometry.applyMatrix4(mesh.matrixWorld);
      if(!batches.has(mesh.material))batches.set(mesh.material,[]);
      batches.get(mesh.material).push(geometry);mesh.removeFromParent();mesh.geometry.dispose();
    }
    for(const [material,parts] of batches){
      const mesh=new THREE.Mesh(mergeGeometries(parts),material);mesh.name='batched-antique-cabinets';this.group.add(mesh);
      parts.forEach(part=>part.dispose());
    }
  }
  updateLocalLights(cameraZ){
    // Only nearby six-unit lamps can illuminate the visitor's surroundings.
    // Always keep two groups, avoiding shader recompilation during the walk.
    const first=Math.max(0,Math.min(this.cabinetLights.length-2,Math.floor((cabinetZ(0)-cameraZ)/(cabinetZ(0)-cabinetZ(1)))));
    if(this.litPair===first)return;this.litPair=first;
    this.cabinetLights.forEach((lights,i)=>lights.forEach(lamp=>{lamp.visible=i===first||i===first+1;}));
  }
  update(time,progress,reduced,cameraZ){
    this.vignette.update(time,progress,reduced,this.group.visible);
    if(this.group.visible){
      this.updateLocalLights(cameraZ);
      const nearest=this.lanternLights.map((light,i)=>({i,d:Math.abs(light.position.z-cameraZ)})).sort((a,b)=>a.d-b.d).slice(0,3);
      this.lanternLights.forEach((light,i)=>{
        light.visible=nearest.some(item=>item.i===i);light.intensity=48*(1-smooth(9.5,14,Math.abs(light.position.z-cameraZ)));
      });
    }
  }
  sync(camera){return this.points.map(p=>{const v=p.clone().project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z<1];});}
  syncSigns(camera){return this.signPoints.map(p=>{const v=p.clone().project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z<1];});}
}
