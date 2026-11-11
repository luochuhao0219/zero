import {puppetCanvas} from './art.js';
const cache=new Map();
function shape(ctx,d,fill,stroke='#d8b36d',width=3){const p=new Path2D(d);ctx.fillStyle=fill;ctx.fill(p);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}}
function pin(ctx,x=0,y=0){ctx.fillStyle='#2b483b';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d8b36d';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#bf9450';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
function asset(left,top,width,height,paint){const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.translate(-left,-top);paint(ctx);return {canvas,left,top,width,height};}
/** Tight, reusable cutouts keep the new fifteen-piece figure below full-canvas texture costs. */
export function articulatedAssets(variant=0){
 if(cache.has(variant))return cache.get(variant);const coat=variant?'#305448':'#a4472d',dark=variant?'#193c35':'#693321',original=puppetCanvas(0,variant,true),assets={};
 const originalPiece=(pivot,bounds,clip)=>asset(...bounds,ctx=>{ctx.save();ctx.clip(new Path2D(clip));ctx.drawImage(original,-pivot[0],-pivot[1],480,820);ctx.restore();});
 assets.head=originalPiece([264,245],[-215,-245,315,270],'M-215-245H100V-35L45 17H-58L-73 34H-92L-71-16Z');
 assets.torso=originalPiece([264,385],[-100,-153,210,186],'M-85-153H50L82-90L78 24H-78L-70-78Z');
 assets.pelvis=asset(-96,-164,205,222,ctx=>{ctx.save();ctx.clip(new Path2D('M-69-164H75L99 17Q25 76-84 28Z'));ctx.drawImage(original,-264,-535,480,820);ctx.restore();ctx.strokeStyle='#d6b16a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-84,28);ctx.quadraticCurveTo(25,76,99,17);ctx.stroke();for(let x=-65;x<=77;x+=18){ctx.beginPath();ctx.ellipse(x,38-Math.abs(x)*.15,3,5,0,0,Math.PI*2);ctx.stroke();}});
 for(const side of ['Front','Back']){
  const fill=side==='Front'?coat:dark;
  assets['upper'+side]=asset(-40,-15,80,170,ctx=>{shape(ctx,'M-23-6Q-39 40-27 116L-18 145H21L30 115Q37 42 23-6Z',fill);for(let y=25;y<125;y+=20){ctx.strokeStyle='#dab06a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-22,y);ctx.quadraticCurveTo(0,y+10,24,y);ctx.stroke();}pin(ctx);pin(ctx,0,137);});
  assets['fore'+side]=asset(-31,-12,65,145,ctx=>{shape(ctx,'M-17-5L-23 90Q-2 111 24 91L18-5Z','#314c3c');shape(ctx,'M-24 84H25V109H-23Z','#bc944f');for(let y=24;y<78;y+=19){ctx.fillStyle='#d7b66a';for(let x=-10;x<15;x+=10){ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}}pin(ctx);pin(ctx,0,115);});
  assets['hand'+side]=asset(-27,-12,63,52,ctx=>{shape(ctx,'M-12-5L-10 17L-4 34L1 28L3 10L10 29L16 24L13 4L24 11L30 5L9-6Z','#c88d47','#efd094',2);pin(ctx);});
  assets['thigh'+side]=asset(-34,-15,73,131,ctx=>{shape(ctx,'M-25-4L26-4L23 77L15 105H-22L-25 70Z',fill);ctx.strokeStyle='#d8ae62';ctx.lineWidth=2;for(let x=-15;x<24;x+=12){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,83);ctx.stroke();}pin(ctx);pin(ctx,0,100);});
  assets['shin'+side]=asset(-29,-13,63,135,ctx=>{shape(ctx,'M-18-5L19-5L19 69L13 110H-18L-20 67Z',side==='Front'?'#663b27':'#29483a');shape(ctx,'M-20 82H20V108H-20Z','#b18c4d');pin(ctx);pin(ctx,0,105);});
  assets['foot'+side]=asset(-31,-15,99,45,ctx=>{shape(ctx,'M-20-9H16L26 3Q50-4 60-12Q72 6 50 17H-25Q-34 6-20-9Z','#243e32');ctx.strokeStyle='#c5a05a';ctx.beginPath();ctx.moveTo(-25,17);ctx.lineTo(50,17);ctx.stroke();pin(ctx);});
 }
 cache.set(variant,assets);return assets;
}
