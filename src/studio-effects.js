/** Small original stage props; no external images or audio recordings. */
export function propPosition(frame,count){
  const p=frame.prop,a=p.holder>=0&&p.holder<count?frame.actors[p.holder]:null;
  if(!a)return {x:p.x,y:p.y,size:1};
  const direction=a.flip?-1:1,angle=a.pose*Math.PI/180;
  // Match the two arm segments in art.js, including the forearm's fixed bend.
  const handX=Math.sin(.55)*132,handY=137+Math.cos(.55)*132;
  const localX=64+handX*Math.cos(angle)+handY*Math.sin(angle);
  const localY=285-handX*Math.sin(angle)+handY*Math.cos(angle);
  return {x:a.x+direction*.52*.7/820*100*localX*a.size,y:a.y+52*a.size*(-.915+localY/820),size:a.size};
}
export function drawProp(ctx,w,h,frame,count){
  if(frame.prop.kind==='none')return;
  const {x,y,size}=propPosition(frame,count);ctx.save();ctx.translate(w*x/100,h*y/100);ctx.scale(w/1200*size,w/1200*size);
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
  if(!line)return;ctx.save();ctx.font=`${Math.round(w*.024)}px "Zhi Mang Xing",serif`;ctx.textAlign='center';
  const chars=Array.from(line),lines=[];let row='';for(const char of chars){if(ctx.measureText(row+char).width>w*.78){lines.push(row);row='';}row+=char;}if(row)lines.push(row);
  ctx.fillStyle='#f4e9cfdf';ctx.fillRect(w*.08,h*.13,w*.84,h*.045*lines.length+h*.025);ctx.fillStyle='#63452e';lines.forEach((text,i)=>ctx.fillText(text,w*.5,h*(.17+i*.045)));ctx.restore();
}
/** Sound only starts from the play button, and is disposed on stop or close. */
export class StudioSound {
  async start(kind){
    this.stop();if(kind==='none')return;
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    try{
      const context=new Audio();this.context=context;await context.resume();if(this.context!==context)return;
      const gain=context.createGain();gain.gain.value=kind==='rain'?.045:.07;gain.connect(context.destination);
      if(kind==='rain'){
        const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=buffer.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
        const noise=context.createBufferSource(),filter=context.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=1300;noise.connect(filter);filter.connect(gain);noise.start();
      }else{
        for(const frequency of [196,319,457]){const oscillator=context.createOscillator(),envelope=context.createGain();oscillator.frequency.value=frequency;envelope.gain.setValueAtTime(.5,context.currentTime);envelope.gain.exponentialRampToValueAtTime(.001,context.currentTime+3);oscillator.connect(envelope);envelope.connect(gain);oscillator.start();oscillator.stop(context.currentTime+3);}
      }
    }catch{this.stop();}
  }
  stop(){const context=this.context;this.context=null;if(context&&context.state!=='closed')context.close().catch(()=>{});}
}
