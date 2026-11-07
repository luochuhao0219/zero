// Record the actual WebGL animation with the browser's native video encoder.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1.5});
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>window.borrowLightDiagnostics);
  const result=await page.evaluate(async()=>{
   const source=document.querySelector('#stage'),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=840;const ctx=canvas.getContext('2d');
   const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4500000}),chunks=[],frames=[];
   const complete=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve({video:reader.result.split(',')[1],frames});reader.readAsDataURL(new Blob(chunks,{type:mimeType}));};});
   document.querySelector('#replay-intro').click();const start=performance.now();let back=false,front=false;recorder.start(250);
   function draw(now){const seconds=(now-start)/1000;ctx.fillStyle='#141912';ctx.fillRect(0,0,1280,840);const gradient=ctx.createRadialGradient(650,400,50,650,400,620);gradient.addColorStop(0,'#343a23');gradient.addColorStop(1,'#141912');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,840);
    const scale=Math.min(1240/source.width,740/source.height),w=source.width*scale,h=source.height*scale;ctx.drawImage(source,(1280-w)/2,62+(740-h)/2,w,h);ctx.fillStyle='#d9c69b';ctx.font='28px "Songti SC",serif';ctx.fillText('借光 · 珞珈夜戏',52,52);ctx.fillStyle='#999e85';ctx.font='13px "PingFang SC",sans-serif';ctx.textAlign='right';ctx.fillText(seconds<4.1?'灯起 · 幕开':seconds<7.1?'到幕后，看看光的来处':'一灯，一影，一段相遇',1228,51);ctx.textAlign='left';
    if(frames.length===0&&seconds>.9)frames.push(canvas.toDataURL('image/png').split(',')[1]);else if(frames.length===1&&seconds>3.5)frames.push(canvas.toDataURL('image/png').split(',')[1]);else if(frames.length===2&&seconds>6.5)frames.push(canvas.toDataURL('image/png').split(',')[1]);
    if(seconds>4.1&&!back){document.querySelector('#hero-view-toggle').click();back=true;}if(seconds>7.1&&!front){document.querySelector('#hero-view-toggle').click();front=true;}
    if(seconds<10)requestAnimationFrame(draw);else{recorder.stop();stream.getTracks().forEach(t=>t.stop());}
   }requestAnimationFrame(draw);return complete;
  });
  const destination=path.join(__dirname,'../screenshots/借光-动效预览.webm');fs.writeFileSync(destination,Buffer.from(result.video,'base64'));result.frames.forEach((frame,i)=>fs.writeFileSync(path.join(__dirname,`../screenshots/motion-film-${i+1}.png`),Buffer.from(frame,'base64')));console.log(JSON.stringify({video:destination,bytes:fs.statSync(destination).size,frames:result.frames.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
