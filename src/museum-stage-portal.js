import * as THREE from '../vendor/three.module.js';
import {smooth} from './route-state.js';
import {photoFrame} from './interior-framing.js';
import {theaterPhotoFrame} from './stage-entrance.js';

export const STAGE_PORTAL={width:4.6,height:4.8,z:-53.5,clearAt:.12};

/** The departure starts on the exact last gallery camera, not a second scene. */
export function syncCurtainCamera(camera,source,aspect,progress){
  const walk=smooth(0,.045,progress),push=smooth(.055,STAGE_PORTAL.clearAt,progress);
  camera.aspect=aspect;camera.fov=source.fov;
  camera.position.copy(source.position).lerp(new THREE.Vector3(0,2.4,-48.3),walk)
    .lerp(new THREE.Vector3(0,2.4,-52.9),push);
  camera.quaternion.copy(source.quaternion).slerp(new THREE.Quaternion(),walk);
  const view=source.view;
  if(view?.enabled&&walk<1)camera.setViewOffset(aspect,1,
    view.offsetX/view.fullWidth*aspect*(1-walk),view.offsetY/view.fullHeight*(1-walk),aspect,1);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
}

export function stagePortalRect(camera){
  const {width,height,z}=STAGE_PORTAL;
  const a=new THREE.Vector3(-width/2,height,z).project(camera),b=new THREE.Vector3(width/2,0,z).project(camera);
  return {x:(a.x+1)/2,y:(1-a.y)/2,width:(b.x-a.x)/2,height:(a.y-b.y)/2};
}

export function curtainPhotoFrame(imageAspect,aspect,camera,progress){
  const rect=stagePortalRect(camera),frame=theaterPhotoFrame(imageAspect,aspect,progress);
  // Before the visitor turns into the aisle, the closed curtain can be edge-on.
  if(rect.width<=.0001||rect.height<=.0001||!Object.values(rect).every(Number.isFinite))return frame;
  const local=photoFrame(imageAspect,Math.max(.05,rect.width*aspect/rect.height),1.025);
  const fitted={x:local.x-rect.x*local.width/rect.width,y:local.y-rect.y*local.height/rect.height,
    width:local.width/rect.width,height:local.height/rect.height};
  const align=smooth(.075,STAGE_PORTAL.clearAt,progress);
  return Object.fromEntries(['x','y','width','height'].map(k=>[k,THREE.MathUtils.lerp(fitted[k],frame[k],align)]));
}

/** Velvet gathers along real folds; the original theatre is visible behind it. */
export class MuseumStagePortal{
  constructor(parent,materials,theater){
    this.theater=theater;this.group=new THREE.Group();parent.add(this.group);
    const {width,height,z}=STAGE_PORTAL;
    this.crop={value:new THREE.Vector4(0,0,1,1)};
    const photoMaterial=new THREE.ShaderMaterial({uniforms:{image:{value:theater.map},crop:this.crop},
      vertexShader:'varying vec4 clipPoint;void main(){clipPoint=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=clipPoint;}',
      fragmentShader:`uniform sampler2D image;uniform vec4 crop;varying vec4 clipPoint;
        void main(){vec2 p=clipPoint.xy/clipPoint.w*.5+.5;
          gl_FragColor=vec4(texture2D(image,vec2(crop.x+p.x*crop.z,1.-crop.y-(1.-p.y)*crop.w)).rgb,1.);
          #include <colorspace_fragment>
        }`,toneMapped:false});
    const picture=new THREE.Mesh(new THREE.PlaneGeometry(width,height),photoMaterial);
    picture.position.set(0,height/2,z);this.group.add(picture);
    const box=(w,h,d,x,y,depth,m)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,depth);this.group.add(mesh);
    };
    for(const x of [-width/2-.1,width/2+.1])box(.20,height+.16,.30,x,height/2,z+.10,materials.wood);
    box(width+.5,.20,.35,0,height+.08,z+.10,materials.wood);
    box(width+.56,.045,.39,0,height+.21,z+.12,materials.brass);
    const velvet=new THREE.MeshStandardMaterial({color:'#6e2422',roughness:.93,
      normalMap:materials.linenNormal,normalScale:new THREE.Vector2(.12,.12),envMapIntensity:.15,side:THREE.DoubleSide});
    velvet.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 velvetUV;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvelvetUV=uv;');
      shader.fragmentShader='varying vec2 velvetUV;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.36,.23,.09),1.-smoothstep(.016,.026,velvetUV.y));`);
    };
    this.panels=[-1,1].map(side=>{
      const geometry=new THREE.PlaneGeometry(width/2,height,36,24),mesh=new THREE.Mesh(geometry,velvet);
      mesh.position.z=z+.22;this.group.add(mesh);return {side,mesh};
    });
    const valance=new THREE.Mesh(new THREE.PlaneGeometry(width+.18,.48,48,1),velvet);
    const vp=valance.geometry.attributes.position;
    for(let i=0;i<vp.count;i++){const x=vp.getX(i);vp.setZ(i,.07*Math.cos(x*14));if(vp.getY(i)<0)vp.setY(i,vp.getY(i)-.08*Math.cos(x*3));}
    valance.geometry.computeVertexNormals();valance.position.set(0,height-.1,z+.36);this.group.add(valance);
    const sign=document.createElement('canvas');sign.width=768;sign.height=144;
    const ctx=sign.getContext('2d');ctx.fillStyle='#29241c';ctx.fillRect(0,0,768,144);
    ctx.strokeStyle='#91754d';ctx.lineWidth=3;ctx.strokeRect(8,8,752,128);
    ctx.fillStyle='#e6d6ad';ctx.font='62px "Songti SC",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('皮 影 戏 台',384,77);
    const map=new THREE.CanvasTexture(sign);map.colorSpace=THREE.SRGBColorSpace;
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(2.25,.42),new THREE.MeshBasicMaterial({map}));
    plaque.position.set(0,height+.47,z+.3);this.group.add(plaque);
    this.setOpen(0);
  }
  setOpen(value){
    if(value===this.open)return;this.open=value;
    const {width,height}=STAGE_PORTAL;
    for(const {side,mesh} of this.panels){
      const position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
      for(let i=0;i<position.count;i++){
        const u=uv.getX(i),v=uv.getY(i),fromHinge=side<0?u:1-u;
        const gathered=1-value*(.89+.05*Math.sin(Math.PI*v));
        const x=side*(width/2-fromHinge*width/2*gathered);
        const y=v*height+.14*value*Math.sin(fromHinge*Math.PI)*(1-v);
        const z=(.045+.075*value)*Math.cos(fromHinge*Math.PI*12);
        position.setXYZ(i,x,y,z);
      }
      position.needsUpdate=true;mesh.geometry.computeVertexNormals();
    }
  }
  sync(camera,aspect,progress=0){
    const frame=curtainPhotoFrame(this.theater.aspect,aspect,camera,progress);
    this.crop.value.set(frame.x,frame.y,frame.width,frame.height);
  }
}
