import * as THREE from '../vendor/three.module.js';
import {photoRect} from './interior-framing.js';
import {museumEntranceFrame,museumEntrancePose,syncGalleryCamera} from './museum-entrance.js';

/** Crop an already aligned lens without losing its off-centre vanishing point. */
export function cropGalleryCamera(camera,rect){
  const view=camera.view?.enabled?{...camera.view}:{fullWidth:camera.aspect,fullHeight:1,offsetX:0,offsetY:0,width:camera.aspect,height:1};
  camera.setViewOffset(view.fullWidth,view.fullHeight,
    view.offsetX+rect.x*view.width,view.offsetY+rect.y*view.height,
    rect.width*view.width,rect.height*view.height);
}

export function galleryPreviewFrame(imageAspect,aspect){
  const entrance=museumEntranceFrame(imageAspect,aspect,0),{outer,clear}=entrance.opening;
  const bounds=[outer[0],outer[2],outer[1]-outer[0],clear[2]-outer[2]];
  return {entrance,bounds,rect:photoRect(bounds,entrance.frame)};
}

/** The view through the hall door comes from the same room and entry camera.
 * Cache only the door-sized render: the hall does not render a second world
 * every frame, and opening the door immediately resumes the real 3D scene.
 */
export class GalleryPreview {
  constructor(renderer,scene,walk,backdrop){
    Object.assign(this,{renderer,scene,walk,backdrop});
    this.camera=new THREE.PerspectiveCamera(50,1,.06,300);
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,type:THREE.HalfFloatType,
      generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
    this.renders=0;
  }
  prepare(sourceCamera,width,height,pixelRatio,samples){
    const aspect=width/height,key=[width,height,pixelRatio,samples,sourceCamera.userData.baseFov].join(':');
    if(this.key===key)return;
    const hall=this.backdrop.plates[aspect<1.15?'hallPortrait':'hall'];
    const {entrance,bounds,rect}=galleryPreviewFrame(hall.aspect,aspect);
    this.camera.userData.baseFov=sourceCamera.userData.baseFov;
    const pose=museumEntrancePose(0);
    syncGalleryCamera(this.camera,pose,aspect,entrance);cropGalleryCamera(this.camera,rect);
    const w=Math.ceil(rect.width*width*pixelRatio),h=Math.ceil(rect.height*height*pixelRatio);
    if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}
    this.target.setSize(w,h);
    const previousTarget=this.renderer.getRenderTarget(),visible=this.walk.group.visible,backdropVisible=this.backdrop.mesh.visible;
    try{
      this.walk.group.visible=true;this.backdrop.mesh.visible=false;
      this.walk.update(0,0,true,pose.position.z);
      this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,this.camera);
      this.backdrop.uniforms.galleryPreview.value=this.target.texture;
      this.backdrop.uniforms.galleryPreviewBounds.value.fromArray(bounds);
      this.backdrop.uniforms.galleryPreviewReady.value=1;
      this.key=key;this.renders++;
    }finally{
      this.walk.group.visible=visible;this.backdrop.mesh.visible=backdropVisible;
      this.renderer.setRenderTarget(previousTarget);
    }
  }
}
