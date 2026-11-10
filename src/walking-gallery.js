import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {galleryMaterials,contactTexture} from './gallery-materials.js';
import {galleryWallArt} from './gallery-wall-art.js';
import {galleryArchitecture} from './gallery-architecture.js';
import {surfaceUV} from './surface-uv.js';
import {CabinetVignette} from './cabinet-vignette.js';
import {ANIMATED_CABINET} from './cabinet-motion.js';
import {smooth} from './route-state.js';
import {ROOMS} from './museum-content.js';
import {puppetCanvas} from './art.js';
const V=(...p)=>new THREE.Vector3(...p);
import {cabinetZ} from './walking-path.js';
export {walkingPose} from './walking-path.js';
export class WalkingGallery {
  constructor(scene,renderer){
    this.group=new THREE.Group();scene.add(this.group);this.points=[];this.signPoints=[];this.cabinetLights=[];
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
    const signPaper=new THREE.MeshStandardMaterial({color:'#dcc399',roughness:.88});
    const shadowMap=contactTexture();
    const puppetMap=new THREE.CanvasTexture(puppetCanvas(35,0));puppetMap.colorSpace=THREE.SRGBColorSpace;
    const murals=['shadow-backdrop','river-mural','craft-mural','troupe-mural','innovation-mural'].map(name=>{const texture=new THREE.TextureLoader().load('./assets/museum/'+name+'.png');texture.colorSpace=THREE.SRGBColorSpace;return texture;});
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
      const mural=new THREE.Mesh(new THREE.PlaneGeometry(6,3.45),new THREE.MeshBasicMaterial({map:murals[i],color:'#f6dab0',side:THREE.DoubleSide}));mural.rotation.y=Math.PI/2;mural.position.set(-.31,2.4,0);cab.add(mural);
      // The wall mural is fully visible; detailed labels live in the reading panel.
      // Objects are real shallow reliefs in the cabinet, not a replacement photograph.
      if(room.id===ANIMATED_CABINET)this.vignette=new CabinetVignette(cab,mural,renderer);
      else{
        const figure=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.8),new THREE.MeshStandardMaterial({map:puppetMap,transparent:true,alphaTest:.15,side:THREE.DoubleSide,roughness:.7,metalness:.05}));figure.rotation.y=Math.PI/2;figure.position.set(.3,1.85,-1.65);cab.add(figure);
      }
      // A freestanding museum label sits beside the case, outside its sightline.
      const sign=new THREE.Group();sign.position.set(1.8,0,2.9);cab.add(sign);
      box(.08,1.13,.08,0,.565,0,brass,sign);box(.56,.08,.38,0,.055,0,wood,sign);
      const plaque=box(.12,.83,.72,0,1.28,0,wood,sign);plaque.rotation.z=-.18;
      box(.015,.7,.61,.065,1.28,0,signPaper,sign).rotation.z=-.18;
      this.signPoints.push(V(-3.12,1.28,z+2.9));
      // Restrained glass edge and ceiling light preserve legibility.
      box(.04,.035,5.8,.67,3.9,0,brass,cab);box(.04,.035,5.8,.67,.8,0,brass,cab);
      this.points.push(V(-4.3,3.8,z));
    });
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
