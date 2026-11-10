import * as THREE from '../vendor/three.module.js';
import {clamp,smooth} from './route-state.js';
import {WalkingGallery} from './walking-gallery.js';
import {MuseumBackdrop} from './museum-backdrop.js';
import {sampleCameraPath,MUSEUM_CAMERA} from './camera-path.js';
import {MUSEUM_ARRIVAL,museumEntrancePose,syncGalleryCamera} from './museum-entrance.js';
export {MUSEUM_CAMERA} from './camera-path.js';
const mix=THREE.MathUtils.lerp;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export function sampleCamera(keys,progress){const p=sampleCameraPath(keys,progress);return {position:V(...p.position),look:V(...p.look)};}

// One photographic corridor keeps the hall's stone, wood and light continuous.
// Each cabinet has its own focus position along the reversible native scroll.
export class MuseumWorld {
  constructor(renderer){
    this.renderer=renderer;this.scene=new THREE.Scene();this.backdrop=new MuseumBackdrop(this.scene,renderer);
    this.ready=this.backdrop.ready;this.errors=this.backdrop.errors;
    this.walk=new WalkingGallery(this.scene,renderer);this.ready=Promise.all([this.backdrop.ready,this.walk.ready]);this.errors=this.backdrop.errors;this.walk.ready.then(()=>this.errors.push(...this.walk.errors));this.currentPose=this.hallPose(1);this.prepared=true;
  }
  hallPose(progress){
    const z=mix(41,12,smooth(.30,1,progress))+(this.hallDistanceOffset||0);
    return {position:V(0,3.1,z),look:V(0,3,-3)};
  }
  gamePose(progress,origin){
    return sampleCamera(origin==='museum'?[
      [0,[-9,3.2,-69],[-9,3.1,-80]],[.18,[-9,3.2,-83],[-9,3.1,-94]],[1,[-9,3.1,-93.6],[-9,3,-100]],
    ]:[[0,[0,3.1,12],[0,3,-3]],[.34,[4.4,3.1,7],[4.4,3,-5]],[1,[4.4,3.1,-4.7],[4.4,3,-10]]],clamp(progress));
  }
  update(route,progress,time,reduced,transition){
    if(transition&&!transition.autoplay&&this.transitionFrom==='public'&&route==='game')progress*=smooth(0,1,transition.fraction);
    const inGallery=route==='museum';this.walk.group.visible=inGallery;this.backdrop.mesh.visible=route!=='museum'||progress<MUSEUM_ARRIVAL;
    this.backdrop.uniforms.opacity.value=1;
    this.backdrop.mesh.renderOrder=route==='museum'?1000:-1000;
    const pose=route==='museum'?museumEntrancePose(progress):route==='game'?this.gamePose(progress,this.gameOrigin):this.hallPose(progress);
    this.walk.update(time,progress,reduced,pose.position.z);
    this.currentPose=pose;this.backdrop.update(route,progress,this.gameOrigin,transition?.autoplay?transition.routeProgress:null);return pose;
  }
  // Full-screen plates already use camera-independent image coordinates.
  syncCamera(camera){if(this.walk.group.visible){
    syncGalleryCamera(camera,this.currentPose,this.backdrop.aspect,this.backdrop.entrance);
    this.backdrop.cabinetPositions=this.walk.sync(camera);
    this.backdrop.signPositions=this.walk.syncSigns(camera);
  }else camera.clearViewOffset();}
  startTransition(from){
    this.transitionFrom=from;
    if(from==='museum')this.backdrop.leaveMuseum();
    this.transitionPose={position:this.currentPose.position.clone(),look:this.currentPose.look.clone()};
  }
}
