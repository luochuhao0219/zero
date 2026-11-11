import {articulatedAssets} from './articulated-art.js';
import {jointTransforms,DRAW_ORDER} from './puppet-motion.js';
import {drawPaper,gateCanvas,branchCanvas,bridgeCanvas} from './art.js';
import {drawProp,drawDialogue,propPosition} from './studio-effects.js';
/** Shared canvas painting for live cloth, saved covers and collection playback. */
export class StudioPainter {
  constructor(){this.scenery={gate:gateCanvas(),branch:branchCanvas(),bridge:bridgeCanvas()};this.backdrops=new Map();}
  drawBackdrop(ctx,w,h,scene,light,scenery=true){
    const key=`${w}-${h}-${scene}-${light}-${scenery}`;if(this.backdrops.has(key)){ctx.drawImage(this.backdrops.get(key),0,0);return;}
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
    drawPaper(c,w,h);c.save();c.globalAlpha=.14;c.fillStyle='#687453';c.beginPath();c.moveTo(0,h*.83);c.bezierCurveTo(w*.2,h*.4,w*.37,h*.95,w*.56,h*.69);c.bezierCurveTo(w*.75,h*.48,w*.9,h*.65,w,h*.55);c.lineTo(w,h);c.lineTo(0,h);c.fill();c.restore();
    if(scene==='moon'){c.fillStyle='#f8edc2';c.beginPath();c.arc(w*.75,h*.23,h*.12,0,Math.PI*2);c.fill();if(scenery){c.save();c.globalAlpha=.32;c.drawImage(this.scenery.gate,w*.61,h*.35,w*.32,h*.45);c.restore();}}
    if(scenery&&scene==='bridge'){c.save();c.globalAlpha=.42;c.drawImage(this.scenery.bridge,w*.12,h*.72,w*.76,h*.18);c.restore();c.strokeStyle='#84927666';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*.12,h*(.93+i*.016));c.bezierCurveTo(w*.4,h*(.9+i*.016),w*.65,h*(.95+i*.016),w*.88,h*(.92+i*.016));c.stroke();}}
    if(scenery&&scene==='garden'){c.save();c.globalAlpha=.55;c.drawImage(this.scenery.branch,w*.63,-h*.03,w*.4,h*.8);c.restore();}
    c.fillStyle=light==='moon'?'#7d9cab38':light==='rain'?'#425f613d':'#e5b65718';c.fillRect(0,0,w,h);
    if(light==='rain'){c.strokeStyle='#e8ecd04d';c.lineWidth=1.5;for(let i=0;i<55;i++){const x=(i*137)%w,y=(i*229)%h;c.beginPath();c.moveTo(x,y);c.lineTo(x-12,y+35);c.stroke();}}
    if(this.backdrops.size>=9)this.backdrops.delete(this.backdrops.keys().next().value);this.backdrops.set(key,canvas);ctx.drawImage(canvas,0,0);
  }
  drawActor(ctx,a,w,h){
    const height=h*.52*a.size,scale=height/820,assets=articulatedAssets(a.variant),nodes=jointTransforms(a);ctx.save();ctx.translate(w*a.x/100,h*a.y/100+height*.085);if(a.flip)ctx.scale(-1,1);ctx.translate(-240*scale,-height);ctx.scale(scale,scale);
    for(const part of DRAW_ORDER){const point=nodes[part.id],art=assets[part.id];ctx.save();ctx.translate(point.x,point.y);ctx.rotate(-point.angle*Math.PI/180);ctx.drawImage(art.canvas,art.left,art.top,art.width,art.height);ctx.restore();}ctx.restore();
  }
  drawComposition(ctx,w,h,selection=false,draft=this.draft,frame=draft.frames[draft.frame]){
    this.drawBackdrop(ctx,w,h,draft.scene,draft.light,!frame.scenery);if(frame.scenery){const p=frame.scenery;ctx.save();ctx.translate(w*p.x/100,h*p.y/100);const art=this.scenery[draft.scene==='garden'?'branch':draft.scene==='moon'?'gate':'bridge'];const sw=w*(draft.scene==='bridge'?.76:draft.scene==='garden'?.4:.34),sh=h*(draft.scene==='bridge'?.18:draft.scene==='garden'?.8:.45);ctx.globalAlpha=.5;ctx.drawImage(art,-sw/2,-sh/2,sw,sh);ctx.restore();}frame.actors.slice(0,draft.count).filter(a=>a.present!==false).forEach(a=>this.drawActor(ctx,a,w,h));drawProp(ctx,w,h,frame,draft.count);drawDialogue(ctx,w,h,frame.line);
    if(selection&&frame.actors[draft.selected]){const a=this.propSelected?propPosition(frame,draft.count):frame.actors[draft.selected];ctx.save();ctx.strokeStyle='#884c31';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.ellipse(w*a.x/100,h*a.y/100-8,50*(a.size||1),12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#56412c';ctx.font=`${Math.round(w*.02)}px sans-serif`;ctx.fillText('借光 · 珞珈夜戏',w*.055,h*.09);ctx.textAlign='right';ctx.fillStyle='#7e4530';ctx.font=`${Math.round(w*.035)}px "Zhi Mang Xing",serif`;ctx.fillText(draft.title||'无题小戏',w*.94,h*.1);ctx.textAlign='left';ctx.fillStyle='#766447';ctx.font=`${Math.round(w*.012)}px sans-serif`;ctx.fillText('原创数字小戏 / 江汉皮影主题体验',w*.055,h*.96);
  }
  poster(draft){const c=document.createElement('canvas');c.width=1200;c.height=650;this.drawComposition(c.getContext('2d'),1200,650,false,draft);return c.toDataURL('image/webp',.86);}
}
