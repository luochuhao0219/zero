import * as THREE from '../vendor/three.module.js';
import {smooth,MUSEUM_ENTRY} from './route-state.js';
import {photoFrame,photoPoint,photoRect} from './interior-framing.js';
import {CABINET_VIEWS,CABINET_POINTS,galleryJourney} from './museum-gallery.js';

const mix=THREE.MathUtils.lerp;
const plates={
  hall:{url:'hall-photo.jpg',aspect:1672/941,doors:[[.295,.67],[.695,.67]]},
  hallPortrait:{url:'hall-portrait.jpg',aspect:1030/1526,doors:[[.295,.65],[.695,.65]]},
  theater:{url:'theater-photo.jpg',aspect:1672/941,paper:[.352,.276,.292,.299]},
  corridor:{url:'cabinets/corridor.png',aspect:1672/941},
};

export class MuseumBackdrop {
  constructor(scene,renderer){
    this.errors=[];this.pending=[];this.aspect=1;this.viewportWidth=0;this.lastMuseumProgress=MUSEUM_ENTRY;
    const loader=new THREE.TextureLoader();
    this.plates=Object.fromEntries(Object.entries(plates).map(([name,definition])=>{
      const plate={...definition};
      this.pending.push(new Promise(resolve=>{
        plate.map=loader.load('./assets/interior/'+plate.url,map=>{
          plate.aspect=map.image.width/map.image.height;resolve();
        },undefined,()=>{this.errors.push(plate.url);resolve();});
      }));
      plate.map.colorSpace=THREE.SRGBColorSpace;
      plate.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      return [name,plate];
    }));
    this.ready=Promise.all(this.pending);
    this.uniforms={opacity:{value:1},imageA:{value:this.plates.hall.map},imageB:{value:this.plates.corridor.map},
      cropA:{value:new THREE.Vector4(0,0,1,1)},cropB:{value:new THREE.Vector4(0,0,1,1)},blend:{value:0}};
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      uniforms:this.uniforms,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,
      vertexShader:'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=vec4(position.xy,.9999,1.);}',
      fragmentShader:`uniform float opacity; uniform sampler2D imageA,imageB; uniform vec4 cropA,cropB; uniform float blend; varying vec2 screenUV;
        vec2 imageUV(vec4 crop){return vec2(crop.x+screenUV.x*crop.z,1.-crop.y-(1.-screenUV.y)*crop.w);}
        void main(){gl_FragColor=vec4(mix(texture2D(imageA,imageUV(cropA)).rgb,texture2D(imageB,imageUV(cropB)).rgb,blend),opacity);
          #include <colorspace_fragment>
        }`,
    }));
    this.mesh.frustumCulled=false;this.mesh.renderOrder=-1000;scene.add(this.mesh);
  }
  resize(width,height){this.aspect=width/height;this.viewportWidth=width;}
  frameFor(id){
    const view=CABINET_VIEWS[id],narrow=this.aspect<1.15;
    return photoFrame(this.plates.corridor.aspect,this.aspect,view.zoom,view[narrow?'mobileFocus':'focus']);
  }
  galleryFrame(progress){
    const view=galleryJourney(progress),a=this.frameFor(view.from),b=this.frameFor(view.to);
    return Object.fromEntries(['x','y','width','height'].map(key=>[key,mix(a[key],b[key],view.blend)]));
  }
  leaveMuseum(){
    this.departure={progress:this.lastMuseumProgress};
  }
  update(route,progress,origin){
    const narrow=this.aspect<1.15,hall=this.plates[narrow?'hallPortrait':'hall'],theater=this.plates.theater;
    const publicZoom=1.035;
    let a=hall,b=this.plates.corridor,blend=0;
    let fa=photoFrame(hall.aspect,this.aspect,mix(1,publicZoom,smooth(.3,1,progress)));
    let fb=this.frameFor('corridor',MUSEUM_ENTRY);
    const ft=photoFrame(theater.aspect,this.aspect,narrow?1.1:1.025,[.5,narrow?.54:.5]);
    this.doorPositions=hall.doors.map(point=>photoPoint(point,fa));
    let galleryFrame=this.galleryFrame(progress);
    if(route==='museum'){
      this.lastMuseumProgress=progress;
      if(progress<MUSEUM_ENTRY){
        const entrance=smooth(0,.09,progress),door=hall.doors[0];
        fa=photoFrame(hall.aspect,this.aspect,mix(publicZoom,2.65,entrance),[mix(.5,door[0],entrance),mix(.5,.52,entrance)]);
        // Doorway push and reveal are sampled from scroll, never elapsed time.
        b=hall;fb=fa;blend=0;
      }else{
        a=b=this.plates.corridor;fa=fb=galleryFrame;blend=0;
      }
    }else if(route==='game'){
      if(origin==='museum'){
        const departure=this.departure||{progress:.92};
        a=this.plates.corridor;fa=this.galleryFrame(departure.progress);
        b=theater;fb=ft;blend=smooth(0,.8,progress);
      }else{
        const entrance=smooth(0,.8,progress),door=hall.doors[1];
        fa=photoFrame(hall.aspect,this.aspect,mix(publicZoom,2.65,entrance),[mix(.5,door[0],entrance),.5]);
        b=theater;fb=ft;blend=smooth(.35,.8,progress);
      }
    }
    this.uniforms.imageA.value=a.map;this.uniforms.imageB.value=b.map;this.uniforms.blend.value=blend;
    for(const [name,frame] of [['cropA',fa],['cropB',fb]])this.uniforms[name].value.set(frame.x,frame.y,frame.width,frame.height);
    this.theaterRect=photoRect(theater.paper,ft);
    this.cabinetPositions=CABINET_POINTS.map(point=>photoPoint(point,galleryFrame));
  }
}
