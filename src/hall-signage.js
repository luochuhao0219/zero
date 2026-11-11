import * as THREE from '../vendor/three.module.js';

// Coordinates belong to the stone wall and paving in each hall photograph.
// The signs are composited inside that photograph, so the entrance masks and
// camera crop carry them through the entire walk, including distant views.
export const HALL_SIGN_LAYOUT={
  wide:{signs:[[.409,.292,.182,.083]],floor:[[.5,.92]]},
  narrow:{signs:[[.367,.372,.263,.060]],floor:[[.4985,.80]]},
};

export function createHallSignage(renderer,errors){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=320;
  const ctx=canvas.getContext('2d');
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const paint=wood=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const [index,title] of ['历史馆','皮影戏台'].entries()){
      ctx.save();ctx.translate(index*1024,0);
      // Two short iron straps and a close contact shadow attach the board to stone.
      for(const x of [146,878]){
        ctx.fillStyle='#27241e';ctx.fillRect(x-5,24,10,58);
        ctx.fillStyle='#575043';ctx.fillRect(x-3,27,3,52);
        ctx.beginPath();ctx.arc(x,24,8,0,Math.PI*2);ctx.fillStyle='#373329';ctx.fill();
      }
      ctx.shadowColor='rgba(12,8,4,.65)';ctx.shadowBlur=11;ctx.shadowOffsetX=2;ctx.shadowOffsetY=8;
      ctx.fillStyle='#33271d';ctx.fillRect(48,65,928,208);
      ctx.shadowColor='transparent';
      if(wood)ctx.drawImage(wood,0,wood.height*.36,wood.width,wood.height*.23,48,65,928,208);
      ctx.fillStyle='rgba(30,22,16,.58)';ctx.fillRect(48,65,928,208);
      ctx.strokeStyle='#211b14';ctx.lineWidth=5;ctx.strokeRect(50,67,924,204);
      ctx.strokeStyle='rgba(186,158,111,.28)';ctx.lineWidth=2;ctx.strokeRect(65,82,894,174);
      for(const x of [88,936]){
        ctx.beginPath();ctx.arc(x,105,5,0,Math.PI*2);ctx.fillStyle='#a0906b';ctx.fill();
        ctx.strokeStyle='#42382b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-3,105);ctx.lineTo(x+3,105);ctx.stroke();
      }
      ctx.font='500 110px "Songti SC","STSong","SimSun",serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#e5d5b5';ctx.shadowColor='#100c07';ctx.shadowBlur=1;ctx.shadowOffsetY=2;
      const spacing=126;
      [...title].forEach((letter,i)=>ctx.fillText(letter,512+(i-(title.length-1)/2)*spacing,172));
      ctx.restore();
    }
    map.needsUpdate=true;
  };
  paint(null);
  const woodReady=new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve(image);
    image.onerror=()=>{errors.push('hall sign wood');resolve(null);};
    image.src='./assets/materials/aged-wood/color.jpg';
  });
  const ready=Promise.all([woodReady,document.fonts.ready]).then(([wood])=>paint(wood));
  return {map,ready};
}
