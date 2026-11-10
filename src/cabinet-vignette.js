import * as THREE from '../vendor/three.module.js';
import {puppetRigAssets} from './art.js';
import {CabinetClock,CABINET_LOOP_SECONDS,cabinetMotionAmount,cabinetPose} from './cabinet-motion.js';

const rad=degrees=>degrees*Math.PI/180;

// All coordinates below describe the existing troupe mural, in top-left image
// space. Only lanterns and their reflections move; the detailed painting stays
// on its original texture, with no frame-by-frame canvas uploads or video.
const muralFunctions=`
uniform float vignettePhase;
uniform float vignetteAmount;
float softOval(vec2 p,vec2 center,vec2 radius){
  return 1.-smoothstep(.60,1.,length((p-center)/radius));
}
float lanternMask(vec2 p,float x){
  return (1.-smoothstep(.036,.066,abs(p.x-x)))
    *smoothstep(.074,.115,p.y)*(1.-smoothstep(.383,.425,p.y));
}
vec2 swingLantern(vec2 p,float x,float phase){
  float angle=.023*sin(phase)*vignetteAmount;
  vec2 local=(p-vec2(x,.082))*vec2(1.5,1.);
  float c=cos(angle),s=sin(angle);
  vec2 rotated=mat2(c,-s,s,c)*local;
  return (rotated-local)/vec2(1.5,1.)*lanternMask(p,x);
}
float waterMask(vec2 p){
  float water=max(softOval(p,vec2(.566,.820),vec2(.169,.038)),
    softOval(p,vec2(.502,.775),vec2(.062,.030)));
  // Keep the boat, bridge, banks and their outlines fixed.
  float boat=smoothstep(.558,.575,p.x)*(1.-smoothstep(.646,.660,p.x))
    *(1.-smoothstep(.792,.804,p.y));
  return water*(1.-boat);
}
`;

const muralSample=`
#ifdef USE_MAP
  vec2 pictureUv=vMapUv;
  float glow=0.;
  if(vignetteAmount>.001){
    vec2 p=vec2(vMapUv.x,1.-vMapUv.y);
    vec2 shift=swingLantern(p,.063,vignettePhase)
      +swingLantern(p,.938,vignettePhase+.7);
    float water=waterMask(p)*vignetteAmount;
    shift.x+=water*(.00125*sin(p.y*380.+vignettePhase*2.)
      +.00045*sin(p.y*710.-vignettePhase*3.));
    shift.y+=water*.00035*sin(p.x*90.+vignettePhase*2.);
    pictureUv+=vec2(shift.x,-shift.y);
    glow=(softOval(p,vec2(.063,.201),vec2(.033,.087))
      +softOval(p,vec2(.938,.201),vec2(.033,.087)))
      *(.045*sin(vignettePhase*2.)+.016*sin(vignettePhase*5.))*vignetteAmount;
    glow+=water*.026*sin(p.y*490.+vignettePhase*2.)*sin(p.x*170.-vignettePhase);
  }
  vec4 sampledDiffuseColor=texture2D(map,pictureUv);
  diffuseColor*=sampledDiffuseColor;
  diffuseColor.rgb*=1.+glow;
#endif
`;

export class CabinetVignette {
  constructor(cabinet,mural,renderer){
    this.clock=new CabinetClock();this.paused=false;this.reading=false;this.reduced=false;this.amount=0;
    this.uniforms={vignettePhase:{value:0},vignetteAmount:{value:0}};
    mural.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.fragmentShader=muralFunctions+shader.fragmentShader.replace('#include <map_fragment>',muralSample);
    };
    mural.material.customProgramCacheKey=()=> 'troupe-mural-vignette-v1';
    mural.material.needsUpdate=true;

    const root=new THREE.Group();root.name='cabinet-four-greeting';
    root.rotation.y=Math.PI/2;root.position.set(.3,1.85,-1.65);cabinet.add(root);
    const pivot=new THREE.Group(),art=new THREE.Group();
    const footX=(270/480-.5)*1.05,footY=(.5-750/820)*1.8;
    pivot.position.set(footX,footY,0);art.position.set(-footX,-footY,0);
    root.add(pivot);pivot.add(art);this.pivot=pivot;
    const geometry=new THREE.PlaneGeometry(1.05,1.8),assets=puppetRigAssets(0);
    const part=key=>{
      const map=new THREE.CanvasTexture(assets[key]);map.colorSpace=THREE.SRGBColorSpace;
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map,
        transparent:true,alphaTest:.15,side:THREE.DoubleSide,forceSinglePass:true,roughness:.7,metalness:.05}));
    };
    art.add(part('body'));this.joints={};
    for(const [key,x] of [['back',214],['front',304]]){
      const joint=new THREE.Group(),mesh=part(key);
      const px=(x/480-.5)*1.05,py=(.5-285/820)*1.8;
      mesh.position.set(-px,-py,0);joint.position.set(px,py,key==='front'?.008:-.008);
      joint.add(mesh);art.add(joint);this.joints[key]=joint;
    }
    this.applyPose(0);
  }
  applyPose(amount){
    this.pose=cabinetPose(this.clock.seconds,amount);
    this.joints.front.rotation.z=rad(this.pose.front);this.joints.back.rotation.z=rad(this.pose.back);
    this.pivot.rotation.z=this.pose.bow;
  }
  update(time,progress,reduced,visible){
    this.reduced=reduced;this.amount=cabinetMotionAmount(progress,visible,reduced);
    this.clock.tick(time,this.amount>.001&&!this.paused&&!this.reading);
    this.uniforms.vignettePhase.value=this.clock.seconds*Math.PI*2/CABINET_LOOP_SECONDS;
    this.uniforms.vignetteAmount.value=this.amount;this.applyPose(this.amount);
  }
  setPaused(value){this.paused=Boolean(value);}
  diagnostics(){return {cabinet:4,playing:this.clock.running,paused:this.paused,reduced:this.reduced,
    seconds:+this.clock.seconds.toFixed(3),amount:+this.amount.toFixed(3),front:+this.pose.front.toFixed(2),bow:+this.pose.bow.toFixed(4)};}
}
