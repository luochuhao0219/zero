import {jointPoint,canonicalToPaper} from './puppet-motion.js';
/** Small original stage props; no external images or audio recordings. */
export function propPosition(frame,count,aspect=.7){
  const p=frame.prop,candidate=p.holder>=0&&p.holder<count?frame.actors[p.holder]:null,a=candidate?.present===false?null:candidate;
  if(!a)return {x:p.x,y:p.y,size:1};
  return {...canonicalToPaper(a,jointPoint(a,'handFront',{x:0,y:14}),aspect),size:a.size};
}
export function drawProp(ctx,w,h,frame,count){
  if(frame.prop.kind==='none')return;
  const {x,y,size}=propPosition(frame,count,h/w);ctx.save();ctx.translate(w*x/100,h*y/100);ctx.scale(w/1200*size,w/1200*size);
  ctx.lineWidth=4;ctx.strokeStyle='#65482d';ctx.fillStyle='#ad4e32';
  if(frame.prop.kind==='lantern'){
    ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(0,-10);ctx.stroke();
    const glow=ctx.createRadialGradient(0,32,3,0,32,95);glow.addColorStop(0,'#f7d98280');glow.addColorStop(1,'#f7d98200');ctx.fillStyle=glow;ctx.fillRect(-95,-63,190,190);
    ctx.fillStyle='#ae5134';ctx.beginPath();ctx.ellipse(0,30,30,39,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ecc37a';for(const x of [-15,0,15]){ctx.beginPath();ctx.moveTo(x,-3);ctx.quadraticCurveTo(x*1.5,30,x,63);ctx.stroke();}ctx.fillStyle='#694932';ctx.fillRect(-23,-12,46,9);ctx.fillRect(-23,66,46,8);ctx.fillRect(-2,74,4,25);
  }else if(frame.prop.kind==='umbrella'){
    ctx.beginPath();ctx.moveTo(0,-125);ctx.lineTo(0,40);ctx.quadraticCurveTo(0,60,-18,53);ctx.stroke();
    ctx.fillStyle='#96734b';ctx.beginPath();ctx.moveTo(-100,-70);ctx.quadraticCurveTo(-65,-140,0,-145);ctx.quadraticCurveTo(65,-140,100,-70);ctx.quadraticCurveTo(50,-90,0,-70);ctx.quadraticCurveTo(-50,-90,-100,-70);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#d4b576';for(const x of [-65,-30,30,65]){ctx.beginPath();ctx.moveTo(0,-145);ctx.quadraticCurveTo(x,-120,x*1.35,-76);ctx.stroke();}
  }else{
    ctx.fillStyle='#dfc58d';ctx.beginPath();ctx.moveTo(-40,-24);ctx.lineTo(-3,-17);ctx.lineTo(36,-24);ctx.lineTo(36,29);ctx.lineTo(-3,35);ctx.lineTo(-40,29);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-3,-17);ctx.lineTo(-3,35);ctx.stroke();ctx.lineWidth=2;for(let y=-9;y<20;y+=9){ctx.beginPath();ctx.moveTo(-31,y);ctx.lineTo(-12,y+3);ctx.moveTo(8,y+3);ctx.lineTo(28,y);ctx.stroke();}
  }ctx.restore();
}
export function drawDialogue(ctx,w,h,line){
  if(!line)return;ctx.save();ctx.font=`${Math.round(w*.024)}px "Studio WenKai","Kaiti SC",serif`;ctx.textAlign='center';
  const chars=Array.from(line),lines=[];let row='';for(const char of chars){if(ctx.measureText(row+char).width>w*.78){lines.push(row);row='';}row+=char;}if(row)lines.push(row);
  ctx.fillStyle='#f4e9cfdf';ctx.fillRect(w*.08,h*.13,w*.84,h*.045*lines.length+h*.025);ctx.fillStyle='#63452e';lines.forEach((text,i)=>ctx.fillText(text,w*.5,h*(.17+i*.045)));ctx.restore();
}
export {StudioSound} from './theater-score.js';
