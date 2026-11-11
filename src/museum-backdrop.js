import * as THREE from '../vendor/three.module.js';
import {smooth,MUSEUM_ENTRY} from './route-state.js';
import {photoFrame,photoPoint,photoRect} from './interior-framing.js';
import {CABINET_VIEWS,CABINET_POINTS,galleryJourney} from './museum-gallery.js';
import {HALL_ZOOM,HALL_OPENINGS,MUSEUM_ARRIVAL,museumEntranceFrame} from './museum-entrance.js';
import {entranceEase,theaterPhotoFrame} from './stage-entrance.js';
import {FOYER_OPENING,FOYER_REACHED,foyerFrame,fitPhotoToOpening,mixPhotoFrames} from './foyer-entrance.js';
import {HALL_SIGN_LAYOUT,createHallSignage} from './hall-signage.js';

const mix=THREE.MathUtils.lerp;
const plates={
  foyer:{url:'connecting-corridor.png',aspect:1.5},
  hall:{url:'museum-door-wide.png',aspect:1.5},
  hallPortrait:{url:'museum-door-portrait.png',aspect:2/3},
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
    const signage=createHallSignage(renderer,this.errors);this.pending.push(signage.ready);
    this.ready=Promise.all(this.pending);
    this.uniforms={opacity:{value:1},imageA:{value:this.plates.hall.map},imageB:{value:this.plates.corridor.map},
      cropA:{value:new THREE.Vector4(0,0,1,1)},cropB:{value:new THREE.Vector4(0,0,1,1)},blend:{value:0},
      doorway:{value:0},maskedImage:{value:0},arch:{value:new THREE.Vector4()},clearDoor:{value:new THREE.Vector3()},leaf:{value:new THREE.Vector2()},
      hallSignage:{value:signage.map},signedA:{value:0},signedB:{value:0},signLeft:{value:new THREE.Vector4()},doorSwing:{value:0},
      galleryPreview:{value:null},galleryPreviewReady:{value:0},galleryPreviewBounds:{value:new THREE.Vector4()},
      galleryArch:{value:new THREE.Vector4()},galleryClear:{value:new THREE.Vector3()},galleryLeaf:{value:new THREE.Vector2()}};
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      uniforms:this.uniforms,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,
      vertexShader:'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=vec4(position.xy,.9999,1.);}',
      fragmentShader:`uniform float opacity; uniform sampler2D imageA,imageB; uniform vec4 cropA,cropB; uniform float blend,doorway,maskedImage; uniform vec4 arch; uniform vec3 clearDoor; uniform vec2 leaf; varying vec2 screenUV;
        uniform sampler2D hallSignage;uniform float signedA,signedB,doorSwing;uniform vec4 signLeft;
        uniform sampler2D galleryPreview;uniform float galleryPreviewReady;uniform vec4 galleryPreviewBounds,galleryArch;uniform vec3 galleryClear;uniform vec2 galleryLeaf;
        vec2 imageUV(vec4 crop){return vec2(crop.x+screenUV.x*crop.z,1.-crop.y-(1.-screenUV.y)*crop.w);}
        float doorAperture(vec2 p,vec4 arch,vec3 clearDoor,vec2 leaf){
          float center=(arch.x+arch.y)*.5,radius=(arch.y-arch.x)*.5;
          vec2 aa=max(fwidth(p),vec2(.00001));
          float archDistance=length(vec2((p.x-center)/radius,min(0.,p.y-arch.w)/(arch.w-arch.z)));
          float arcAA=max(aa.x/radius,aa.y/(arch.w-arch.z));
          float roundTop=1.-smoothstep(1.-arcAA,1.+arcAA,archDistance);
          float leafEdge=clamp((p.y-leaf.x)/(leaf.y-leaf.x),0.,1.);
          float left=mix(arch.x,clearDoor.x,leafEdge),right=mix(arch.y,clearDoor.y,leafEdge);
          return roundTop*smoothstep(left-aa.x,left+aa.x,p.x)
            *(1.-smoothstep(right-aa.x,right+aa.x,p.x))
            *(1.-smoothstep(clearDoor.z-aa.y,clearDoor.z+aa.y,p.y));
        }
        vec3 wallSign(vec3 color,vec2 uv,vec4 rect,float index){
          vec2 p=(vec2(uv.x,1.-uv.y)-rect.xy)/rect.zw;
          if(p.x>=0.&&p.x<=1.&&p.y>=0.&&p.y<=1.){
            vec4 sign=texture2D(hallSignage,vec2((p.x+index)*.5,1.-p.y));
            color=mix(color,sign.rgb,sign.a);
          }
          return color;
        }
        vec3 plateColor(sampler2D plate,vec2 uv,float signedPlate){
          vec3 color=texture2D(plate,uv).rgb;
          if(signedPlate>.5){
            color=wallSign(color,uv,signLeft,0.);
          }
          return color;
        }
        vec4 swingingLeaf(vec2 p,float side){
          vec2 size=vec2(clearDoor.y-clearDoor.x,clearDoor.z-arch.z);
          vec2 local=(p-vec2(clearDoor.x,arch.z))/size;
          float x=side<0.?local.x:1.-local.x;
          float angle=doorSwing*1.50,c=cos(angle),s=sin(angle)*.85;
          float denominator=c-(x-.5)*s;
          float along=x/max(.00001,denominator);
          float depth=1.+along*s;
          float v=.5+(local.y-.5)*depth;
          vec2 aa=max(fwidth(local),vec2(.00001));
          float mask=smoothstep(-aa.x,aa.x,along)*(1.-smoothstep(.5-aa.x,.5+aa.x,along));
          mask*=smoothstep(-aa.y,aa.y,v)*(1.-smoothstep(1.-aa.y,1.+aa.y,v))*step(.00001,denominator);
          vec2 source=vec2(clearDoor.x,arch.z)+vec2(side<0.?along:1.-along,v)*size;
          vec3 wood=texture2D(imageA,vec2(source.x,1.-source.y)).rgb*(1.-.16*doorSwing);
          return vec4(wood,mask);
        }
        void main(){
          vec2 uvA=imageUV(cropA),p=vec2(uvA.x,1.-uvA.y);
          float aperture=0.;
          if(doorway>0.)aperture=doorAperture(p,arch,clearDoor,leaf);
          float photoBlend=maskedImage>.5?doorway*aperture:blend;
          gl_FragColor=vec4(mix(plateColor(imageA,uvA,signedA),plateColor(imageB,imageUV(cropB),signedB),photoBlend),opacity*(maskedImage>.5?1.:1.-doorway*aperture));
          if(doorway>0.&&maskedImage<.5&&signedA>.5){
            vec4 leftDoor=swingingLeaf(p,-1.),rightDoor=swingingLeaf(p,1.);
            float cover=max(leftDoor.a,rightDoor.a)*aperture;
            vec3 wood=leftDoor.a>rightDoor.a?leftDoor.rgb:rightDoor.rgb;
            gl_FragColor.rgb=mix(gl_FragColor.rgb,wood,cover);
            gl_FragColor.a=max(gl_FragColor.a,cover);
          }
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
    this.entrance=null;this.uniforms.doorway.value=0;this.uniforms.maskedImage.value=0;this.uniforms.doorSwing.value=0;
    let a=hall,b=this.plates.corridor,blend=0;
    let fa=photoFrame(hall.aspect,this.aspect,mix(1,publicZoom,smooth(.3,1,progress)));
    let fb=this.frameFor('corridor',MUSEUM_ENTRY);
    const ft=theaterPhotoFrame(theater.aspect,this.aspect,autoProgress??0);
    let galleryFrame=this.galleryFrame(progress);
    if(route==='public'){
      const hallFrame=photoFrame(hall.aspect,this.aspect,mix(1,HALL_ZOOM,entranceEase(.8,1,progress)));
      if(progress<FOYER_REACHED){
        const passage=foyerFrame(this.plates.foyer.aspect,this.aspect,progress,this.frontDoorRect);
        a=this.plates.foyer;b=hall;fa=passage.frame;
        fb=mixPhotoFrames(fitPhotoToOpening(hall.aspect,this.aspect,passage.aperture,HALL_ZOOM),hallFrame,passage.alignment);
        this.uniforms.maskedImage.value=1;this.uniforms.doorway.value=1;
        this.uniforms.arch.value.fromArray(FOYER_OPENING.outer);this.uniforms.clearDoor.value.fromArray(FOYER_OPENING.clear);this.uniforms.leaf.value.fromArray(FOYER_OPENING.leaf);
      }else{a=b=hall;fa=fb=hallFrame;}
    }else if(route==='museum'){
      this.lastMuseumProgress=progress;
      if(progress<MUSEUM_ARRIVAL){
        const entrance=this.entrance=museumEntranceFrame(hall.aspect,this.aspect,progress);
        fa=entrance.frame;
        this.uniforms.doorway.value=entrance.reveal;
        this.uniforms.doorSwing.value=entrance.swing;
        this.uniforms.arch.value.fromArray(entrance.opening.outer);
        this.uniforms.clearDoor.value.fromArray(entrance.opening.clear);
        this.uniforms.leaf.value.fromArray(entrance.opening.leaf);
        // The physical room is revealed through the photographed arch and leaves.
        b=hall;fb=fa;blend=0;
      }else{
        a=b=this.plates.corridor;fa=fb=galleryFrame;blend=0;
      }
    }else if(route==='game'){
      // The physical curtains at the end of the museum reveal this same plate.
      a=b=theater;fa=fb=ft;
    }
    const layout=HALL_SIGN_LAYOUT[narrow?'narrow':'wide'];
    const galleryOpening=HALL_OPENINGS[narrow?'narrow':'wide'];
    this.doorCuePosition=photoPoint([(galleryOpening.clear[0]+galleryOpening.clear[1])*.5,(galleryOpening.outer[2]+galleryOpening.clear[2])*.5],fa);
    this.uniforms.galleryArch.value.fromArray(galleryOpening.outer);this.uniforms.galleryClear.value.fromArray(galleryOpening.clear);this.uniforms.galleryLeaf.value.fromArray(galleryOpening.leaf);
    this.doorPositions=layout.floor.map(point=>photoPoint(point,fa));
    this.uniforms.signLeft.value.fromArray(layout.signs[0]);
    this.uniforms.signedA.value=a===hall?1:0;this.uniforms.signedB.value=b===hall?1:0;
    this.uniforms.imageA.value=a.map;this.uniforms.imageB.value=b.map;this.uniforms.blend.value=blend;
    for(const [name,frame] of [['cropA',fa],['cropB',fb]])this.uniforms[name].value.set(frame.x,frame.y,frame.width,frame.height);
    this.theaterRect=photoRect(theater.paper,ft);
    this.cabinetPositions=CABINET_POINTS.map(point=>photoPoint(point,galleryFrame));
  }
}
