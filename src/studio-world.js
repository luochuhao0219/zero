import * as THREE from '../vendor/three.module.js';
import {createArticulatedRig,rigPoint} from './articulated-rig.js';
import {drawProp} from './studio-effects.js';
import {actorInWorld,screenPoint,sceneryDefault,SCREEN} from './studio-space.js';

export function propArtwork(kind){const c=document.createElement('canvas');c.width=320;c.height=360;const ctx=c.getContext('2d');ctx.translate(160,170);drawProp(ctx,1200,840,{actors:[],prop:{kind,x:0,y:0,holder:-1}},0);return c;}
/** Reuses the original cloth, lights and jointed puppets; no extra renderer. */
export class StudioWorld {
  constructor(stage,painter){
    this.stage=stage;this.painter=painter;this.active=false;this.props={};this.legacyActors=stage.actors;this.legacyProjected=stage.projected.map(p=>p.actors);this.rigs=null;
    for(const kind of ['lantern','umbrella','book'])this.props[kind]=stage.flatSprite(propArtwork(kind),1,1);
    this.scenes={bridge:stage.flatSprite(painter.scenery.bridge,1,.65),garden:stage.flatSprite(painter.scenery.branch,1,.65),moon:stage.flatSprite(painter.scenery.gate,1,.4)};
    this.hide();
  }
  hide(){for(const mesh of [...Object.values(this.props),...Object.values(this.scenes)])mesh.visible=false;}
  set(draft,frame=draft.frames[draft.frame],performing=false){
    if(!this.active){
      if(!this.rigs)this.rigs={physical:[0,1].map(i=>createArticulatedRig(this.stage,i)),projected:this.stage.projected.map(p=>[0,1].map(i=>createArticulatedRig(this.stage,i,true,p.side)))};
      this.legacyActors.forEach(r=>r.visible=false);this.legacyProjected.flat().forEach(r=>r.visible=false);this.stage.actors=this.rigs.physical;this.stage.projected.forEach((p,i)=>p.actors=this.rigs.projected[i]);
    }
    this.active=true;this.draft=draft;this.frame=frame;this.stage.studioWorld=this;
    const key=JSON.stringify([draft.scene,draft.light,draft.title,frame.line,performing]);
    if(key!==this.backgroundKey){
      this.backgroundKey=key;const image=this.stage.paperTexture.image,ctx=image.getContext('2d');
      this.painter.drawBackdrop(ctx,image.width,image.height,draft.scene,draft.light,false);
      // Quiet lettering stays on the cloth; all moving objects remain jointed meshes.
      ctx.save();ctx.fillStyle='#65533b';ctx.textAlign='center';ctx.font='54px "Studio WenKai", "Kaiti SC", serif';if(performing)ctx.fillText(frame.line||'',image.width/2,image.height*.14,image.width*.78);ctx.restore();
      this.stage.paperTexture.needsUpdate=true;this.stage.textureUploads++;this.stage.dirty=true;
    }
    this.stage.cloth.material.color.set(draft.light==='moon'?0xdde8dc:draft.light==='rain'?0xc5d2ce:0xffffff);
  }
  layout(){return this.frame.actors.slice(0,this.draft.count).map(a=>actorInWorld(a,this.stage.lightValues()));}
  update(){
    this.hide();if(!this.active)return;const {frame,draft,stage}=this,p=frame.prop,scenery=frame.scenery||sceneryDefault(draft.scene),point=screenPoint(scenery.x,scenery.y),scene=this.scenes[draft.scene];
    scene.visible=true;scene.position.set(point.x,point.y,.022);scene.scale.set(draft.scene==='bridge'?7.8:draft.scene==='garden'?4.1:3.5,draft.scene==='bridge'?1:draft.scene==='garden'?4.44:2.5,1);
    if(p.kind==='none')return;const mesh=this.props[p.kind],actor=frame.actors[p.holder];mesh.visible=true;
    if(p.holder>=0&&p.holder<draft.count&&actor?.present!==false){
      const rig=stage.projected[0].actors[p.holder];rig.updateWorldMatrix(true,true);const hand=rigPoint(rig,'handFront',{x:0,y:14});mesh.position.set(hand.x,hand.y-.085,.105);mesh.scale.set(2.72*actor.size,3.06*actor.size,1);
    }else{const point=screenPoint(p.x,p.y);mesh.position.set(point.x,point.y-.085,.105);mesh.scale.set(2.72,3.06,1);}
  }
  clear(){
    this.active=false;if(this.rigs){this.rigs.physical.forEach(r=>r.visible=false);this.rigs.projected.flat().forEach(r=>r.visible=false);}this.stage.actors=this.legacyActors;this.stage.projected.forEach((p,i)=>p.actors=this.legacyProjected[i]);this.stage.studioWorld=null;this.hide();this.backgroundKey=null;
    this.stage.drawBackground();const image=this.stage.paperTexture.image;image.getContext('2d').drawImage(this.stage.paper,0,0);this.stage.paperTexture.needsUpdate=true;this.stage.cloth.material.color.set(0xffffff);this.stage.dirty=true;
  }
}
