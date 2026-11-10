import * as THREE from '../vendor/three.module.js';
import {smooth,MUSEUM_ENTRY} from './route-state.js';
import {photoFrame,photoPoint,photoRect} from './interior-framing.js';
import {CABINET_VIEWS,CABINET_POINTS,galleryJourney} from './museum-gallery.js';
import {HALL_ZOOM,MUSEUM_ARRIVAL,museumEntranceFrame} from './museum-entrance.js';
import {stageEntranceFrame,entranceEase} from './stage-entrance.js';

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
      cropA:{value:new THREE.Vector4(0,0,1,1)},cropB:{value:new THREE.Vector4(0,0,1,1)},blend:{value:0},
      doorway:{value:0},maskedImage:{value:0},arch:{value:new THREE.Vector4()},clearDoor:{value:new THREE.Vector3()},leaf:{value:new THREE.Vector2()}};
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      uniforms:this.uniforms,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,
      vertexShader:'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=vec4(position.xy,.9999,1.);}',
      fragmentShader:`uniform float opacity; uniform sampler2D imageA,imageB; uniform vec4 cropA,cropB; uniform float blend,doorway,maskedImage; uniform vec4 arch; uniform vec3 clearDoor; uniform vec2 leaf; varying vec2 screenUV;
        vec2 imageUV(vec4 crop){return vec2(crop.x+screenUV.x*crop.z,1.-crop.y-(1.-screenUV.y)*crop.w);}
        void main(){
          vec2 uvA=imageUV(cropA),p=vec2(uvA.x,1.-uvA.y);
          float aperture=0.;
          if(doorway>0.){
            float center=(arch.x+arch.y)*.5,radius=(arch.y-arch.x)*.5;
            vec2 aa=max(fwidth(p),vec2(.00001));
            float archDistance=length(vec2((p.x-center)/radius,min(0.,p.y-arch.w)/(arch.w-arch.z)));
            float arcAA=max(aa.x/radius,aa.y/(arch.w-arch.z));
            float roundTop=1.-smoothstep(1.-arcAA,1.+arcAA,archDistance);
            float leafEdge=clamp((p.y-leaf.x)/(leaf.y-leaf.x),0.,1.);
            float left=mix(arch.x,clearDoor.x,leafEdge),right=mix(arch.y,clearDoor.y,leafEdge);
            aperture=roundTop*smoothstep(left-aa.x,left+aa.x,p.x)
              *(1.-smoothstep(right-aa.x,right+aa.x,p.x))
              *(1.-smoothstep(clearDoor.z-aa.y,clearDoor.z+aa.y,p.y));
          }
          float photoBlend=maskedImage>.5?doorway*aperture:blend;
          gl_FragColor=vec4(mix(texture2D(imageA,uvA).rgb,texture2D(imageB,imageUV(cropB)).rgb,photoBlend),opacity*(maskedImage>.5?1.:1.-doorway*aperture));
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
  update(route,progress,origin,autoProgress=null){
    const narrow=this.aspect<1.15,hall=this.plates[narrow?'hallPortrait':'hall'],theater=this.plates.theater;
    const publicZoom=HALL_ZOOM;
    this.entrance=null;this.uniforms.doorway.value=0;this.uniforms.maskedImage.value=0;
    let a=hall,b=this.plates.corridor,blend=0;
    let fa=photoFrame(hall.aspect,this.aspect,mix(1,publicZoom,smooth(.3,1,progress)));
    let fb=this.frameFor('corridor',MUSEUM_ENTRY);
    const approach=autoProgress===null?0:entranceEase(.12,.235,autoProgress);
    const ft=photoFrame(theater.aspect,this.aspect,(narrow?1.1:1.025)*Math.exp(Math.log(2.6)*approach),[mix(.5,.498,approach),mix(narrow?.54:.5,.4255,approach)]);
    let galleryFrame=this.galleryFrame(progress);
    if(route==='museum'){
      this.lastMuseumProgress=progress;
      if(progress<MUSEUM_ARRIVAL){
        const entrance=this.entrance=museumEntranceFrame(hall.aspect,this.aspect,progress);
        fa=entrance.frame;
        this.uniforms.doorway.value=entrance.reveal;
        this.uniforms.arch.value.fromArray(entrance.opening.outer);
        this.uniforms.clearDoor.value.fromArray(entrance.opening.clear);
        this.uniforms.leaf.value.fromArray(entrance.opening.leaf);
        // The physical room is revealed through the photographed arch and leaves.
        b=hall;fb=fa;blend=0;
      }else{
        a=b=this.plates.corridor;fa=fb=galleryFrame;blend=0;
      }
    }else if(route==='game'){
      if(autoProgress!==null&&origin!=='museum'){
        a=b=theater;fa=fb=ft;
        if(autoProgress<.12){
          const entrance=stageEntranceFrame(hall.aspect,this.aspect,autoProgress),rect=entrance.aperture;
          a=hall;fa=entrance.frame;
          const local=photoFrame(theater.aspect,rect.width*this.aspect/rect.height,1.025,[.5,.5]);
          const fitted={x:local.x-rect.x*local.width/rect.width,y:local.y-rect.y*local.height/rect.height,width:local.width/rect.width,height:local.height/rect.height};
          const align=entranceEase(.15,.85,entrance.t);
          fb=Object.fromEntries(['x','y','width','height'].map(key=>[key,mix(fitted[key],ft[key],align)]));
          this.uniforms.maskedImage.value=1;this.uniforms.doorway.value=entrance.reveal;
          this.uniforms.arch.value.fromArray(entrance.opening.outer);this.uniforms.clearDoor.value.fromArray(entrance.opening.clear);this.uniforms.leaf.value.fromArray(entrance.opening.leaf);
        }
      }else if(origin==='museum'){
        const departure=this.departure||{progress:.92};
        a=this.plates.corridor;fa=this.galleryFrame(departure.progress);
        b=theater;fb=ft;blend=smooth(0,.8,progress);
      }else{
        const entrance=smooth(0,.8,progress),door=hall.doors[1];
        fa=photoFrame(hall.aspect,this.aspect,mix(publicZoom,2.65,entrance),[mix(.5,door[0],entrance),.5]);
        b=theater;fb=ft;blend=smooth(.35,.8,progress);
      }
    }
    this.doorPositions=hall.doors.map(point=>photoPoint(point,fa));
    this.uniforms.imageA.value=a.map;this.uniforms.imageB.value=b.map;this.uniforms.blend.value=blend;
    for(const [name,frame] of [['cropA',fa],['cropB',fb]])this.uniforms[name].value.set(frame.x,frame.y,frame.width,frame.height);
    this.theaterRect=photoRect(theater.paper,ft);
    this.cabinetPositions=CABINET_POINTS.map(point=>photoPoint(point,galleryFrame));
  }
}
