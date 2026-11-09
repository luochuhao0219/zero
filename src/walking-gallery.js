import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {galleryMaterials,contactTexture} from './gallery-materials.js';
import {ROOMS} from './museum-content.js';
import {puppetCanvas} from './art.js';
const V=(...p)=>new THREE.Vector3(...p);
import {cabinetZ} from './walking-path.js';
export {walkingPose} from './walking-path.js';
export class WalkingGallery {
  constructor(scene,renderer){
    this.group=new THREE.Group();scene.add(this.group);this.points=[];this.signPoints=[];
    const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
    this.materials=galleryMaterials(renderer,scene);this.ready=this.materials.ready;this.errors=this.materials.errors;
    const {wood,brass,wall,floor,glass}=this.materials;
    const box=(w,h,d,x,y,z,m,parent=this.group)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.045,w*.15,h*.15,d*.15)),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
    box(22,.15,86,5,-.1,-33,floor);box(.3,5.8,86,-6,2.8,-33,wall);box(.3,5.8,86,16,2.8,-33,wall);box(12,.2,86,0,5.7,-33,wood);box(12,5.8,.3,0,2.8,-76,wall);
    this.group.add(new THREE.HemisphereLight('#9db9c2','#30251d',.75));
    const sun=new THREE.DirectionalLight('#a5c3d0',1.1);sun.position.set(3,6,6);this.group.add(sun);
    for(let z=6;z>-76;z-=6){box(12,.12,.15,0,5.4,z,wood);for(const x of [-5.7,5.7])box(.15,5.4,.18,x,2.7,z,wood);}
    const shadowMap=contactTexture();
    for(let z=5;z>-76;z-=3){box(21,.012,.025,5,.005,z,mat('#303b39'));}
    box(.035,.012,86,.7,.012,-33,brass);box(.035,.012,86,1,.012,-33,brass);
    const puppetMap=new THREE.CanvasTexture(puppetCanvas(35,0));puppetMap.colorSpace=THREE.SRGBColorSpace;
    const murals=['shadow-backdrop','river-mural','craft-mural','troupe-mural','innovation-mural'].map(name=>{const texture=new THREE.TextureLoader().load('./assets/museum/'+name+'.png');texture.colorSpace=THREE.SRGBColorSpace;return texture;});
    ROOMS.forEach((room,i)=>{
      const z=cabinetZ(i),cab=new THREE.Group();cab.position.set(-5,0,z);this.group.add(cab);
      box(1.2,.75,6,0,.375,0,wood,cab);box(.15,3.3,6,-.5,2.35,0,wood,cab);box(1.3,.2,6,0,4.1,0,wood,cab);
      for(const dz of [-3,3])box(1.3,3.3,.12,0,2.4,dz,wood,cab);
      // Inlaid mouldings, panel seams and aged metal hardware catch grazing light.
      for(const y of [.08,.62,.77,3.98,4.18])box(1.42,.055,6.18,.02,y,0,y===.77||y===3.98?brass:wood,cab);
      for(const dz of [-2.91,2.91]){box(.12,3.26,.12,.67,2.38,dz,brass,cab);for(const y of [1,3.6]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.038,8,6),brass);screw.position.set(.75,y,dz);cab.add(screw);}}
      for(let dz=-2.6;dz<3;dz+=1.3){box(.03,.46,1.16,.62,.37,dz,wood,cab);box(.035,.025,.25,.65,.43,dz,brass,cab);}
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8,8),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.3,.012,0);cab.add(shadow);
      for(const offset of [-1.8,0,1.8]){const lamp=new THREE.PointLight('#ffe0b5',2.2,6,2);lamp.position.set(1.15,3.65,offset);cab.add(lamp);}
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.1,.035,5.6),new THREE.MeshBasicMaterial({color:'#ffe2a1'}));strip.position.set(.38,3.91,0);cab.add(strip);
      const glazing=new THREE.Mesh(new THREE.PlaneGeometry(5.75,3.05),glass);glazing.rotation.y=Math.PI/2;glazing.position.set(.72,2.34,0);cab.add(glazing);
      const mural=new THREE.Mesh(new THREE.PlaneGeometry(6,3.45),new THREE.MeshBasicMaterial({map:murals[i],side:THREE.DoubleSide}));mural.rotation.y=Math.PI/2;mural.position.set(-.31,2.4,0);cab.add(mural);
      // The wall mural is fully visible; detailed labels live in the reading panel.
      // Objects are real shallow reliefs in the cabinet, not a replacement photograph.
      const figure=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.8),new THREE.MeshStandardMaterial({map:puppetMap,transparent:true,alphaTest:.15,side:THREE.DoubleSide,roughness:.7,metalness:.05}));figure.rotation.y=Math.PI/2;figure.position.set(.3,1.85,-1.65);cab.add(figure);
      // A freestanding museum label sits beside the case, outside its sightline.
      const sign=new THREE.Group();sign.position.set(1.8,0,2.9);cab.add(sign);
      box(.08,1.13,.08,0,.565,0,brass,sign);box(.56,.08,.38,0,.055,0,wood,sign);
      const plaque=box(.12,.83,.72,0,1.28,0,wood,sign);plaque.rotation.z=-.18;
      box(.015,.7,.61,.065,1.28,0,new THREE.MeshStandardMaterial({color:'#e9d7ae',roughness:.88}),sign).rotation.z=-.18;
      this.signPoints.push(V(-3.12,1.28,z+2.9));
      // Restrained glass edge and ceiling light preserve legibility.
      box(.04,.035,5.8,.67,3.9,0,brass,cab);box(.04,.035,5.8,.67,.8,0,brass,cab);
      this.points.push(V(-4.3,3.8,z));
    });
  }
  sync(camera){return this.points.map(p=>{const v=p.clone().project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z<1];});}
  syncSigns(camera){return this.signPoints.map(p=>{const v=p.clone().project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z<1];});}
}
