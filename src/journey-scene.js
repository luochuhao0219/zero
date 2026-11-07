import * as THREE from '../vendor/three.module.js';

const HERO_ASSET = './assets/story/puppet-hero.png';
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const damp = (a,b,dt,speed=7) => THREE.MathUtils.lerp(a,b,1-Math.exp(-speed*dt));

// A thin leather artwork is deliberately represented as layered image planes.
// The camera, object tilt, inspection ring and cast shadow are rendered live.
export class OpeningScene {
  constructor(canvas) {
    this.canvas=canvas;this.visible=true;this.loaded=false;this.frames=0;
    this.progress=0;this.pointer={x:0,y:0};this.smoothPointer={x:0,y:0};this.feature=0;
    try { this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'}); }
    catch { this.fallback=true;return; }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate=false;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.1,30);this.camera.position.z=9;
    this.object=new THREE.Group();this.scene.add(this.object);
    this.light=new THREE.DirectionalLight(0xffe8c5,2);this.light.position.set(-3,4,7);this.light.castShadow=true;
    this.light.shadow.mapSize.set(1024,1024);Object.assign(this.light.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});
    this.light.shadow.normalBias=.01;this.light.shadow.bias=-.0001;this.light.shadow.radius=4;
    this.scene.add(this.light,this.light.target);
    const receiver=new THREE.Mesh(new THREE.PlaneGeometry(35,22),new THREE.ShadowMaterial({color:0x58442d,opacity:.17}));
    receiver.position.z=-1.15;receiver.receiveShadow=true;this.scene.add(receiver);this.shadowReceiver=receiver;
    this.texture=new THREE.TextureLoader().load(HERO_ASSET,()=>{
      this.loaded=true;document.body.classList.add('intro-webgl-ready');
    },undefined,()=>{this.assetError=true;});
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const geometry=new THREE.PlaneGeometry(3.24,4.86);
    const material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,alphaTest:.12,
      side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false});
    this.puppet=new THREE.Mesh(geometry,material);this.puppet.castShadow=true;
    this.puppet.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:this.texture,alphaTest:.22});
    this.object.add(this.puppet);
    const edge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:this.texture,color:0x6d3c22,
      transparent:true,alphaTest:.12,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false}));
    edge.position.z=-.013;this.object.add(edge);
    this.detailRing=new THREE.Mesh(new THREE.RingGeometry(.97,1,96),new THREE.MeshBasicMaterial({
      color:0x914c2d,transparent:true,opacity:0,side:THREE.DoubleSide,depthTest:false}));
    this.detailRing.position.z=.045;this.detailRing.renderOrder=4;this.object.add(this.detailRing);
    this.regions=[{x:.27,y:1.56,r:.62},{x:.22,y:-.55,r:.66},{x:-.68,y:.69,r:.31}];
    this.detailRing.position.set(this.regions[0].x,this.regions[0].y,.045);
    this.detailRing.scale.setScalar(this.regions[0].r);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
  }
  resize(){
    if(this.fallback)return;
    const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;
    this.width=width;this.height=height;this.mobile=width<=700;
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }
  setProgress(progress){this.progress=clamp(progress);}
  setPointer(x,y){this.pointer={x:clamp(x,-1,1),y:clamp(y,-1,1)};}
  update(time,dt,reduced){
    if(this.fallback||!this.visible||!this.loaded)return;
    this.frames++;
    const p=THREE.MathUtils.smoothstep(this.progress,.25,.88),h=2*Math.tan(THREE.MathUtils.degToRad(19))*9,w=h*this.camera.aspect;
    this.smoothPointer.x=damp(this.smoothPointer.x,this.pointer.x,dt,5);
    this.smoothPointer.y=damp(this.smoothPointer.y,this.pointer.y,dt,5);
    const px=reduced?0:this.smoothPointer.x,py=reduced?0:this.smoothPointer.y;
    const x=this.mobile?THREE.MathUtils.lerp(w*.22,0,p):THREE.MathUtils.lerp(w*.245,-w*.22,p);
    const y=this.mobile?THREE.MathUtils.lerp(-.78,1.30,p):THREE.MathUtils.lerp(-.08,-.12,p);
    const size=this.mobile?THREE.MathUtils.lerp(.66,.46,p):THREE.MathUtils.lerp(1.02,1.13,p);
    this.shadowReceiver.material.opacity=this.mobile?THREE.MathUtils.lerp(.17,.08,p):.17;
    this.object.position.set(x+px*.06,y+(reduced?0:Math.sin(time*.7)*.026),0);
    this.object.scale.setScalar(size);
    this.object.rotation.set(-py*.035,THREE.MathUtils.lerp(-.12,.16,p)+px*.11,
      THREE.MathUtils.lerp(-.07,.025,p)+px*.013+(reduced?0:Math.sin(time*.4)*.008));
    this.light.position.set(x-3+px*3.8,3.8-py*2,7);this.light.target.position.copy(this.object.position);
    const region=this.regions[this.feature];
    this.detailRing.position.x=damp(this.detailRing.position.x,region.x,dt,9);
    this.detailRing.position.y=damp(this.detailRing.position.y,region.y,dt,9);
    this.detailRing.scale.setScalar(damp(this.detailRing.scale.x,region.r,dt,9));
    this.detailRing.material.opacity=THREE.MathUtils.smoothstep(p,.65,.95)*.45;
    this.renderer.shadowMap.needsUpdate=this.frames%2===0||reduced;
    this.renderer.render(this.scene,this.camera);
  }
  diagnostics(){return {fallback:!!this.fallback,loaded:this.loaded,visible:this.visible,progress:this.progress,
    feature:this.feature,frames:this.frames,pointer:{...this.smoothPointer},rotation:this.object?{x:this.object.rotation.x,y:this.object.rotation.y,z:this.object.rotation.z}:null};}
}

// An unscored, direct-manipulation demonstration introduces the light/shadow
// relationship before the full game. Touch scrolling stays native outside the orb.
export class LightStudy {
  constructor(canvas,handle,hint){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.handle=handle;this.hint=hint;
    this.target={x:.22,y:.69};this.light={...this.target};this.visible=false;this.dirty=true;this.draws=0;
    this.image=new Image();this.image.onload=()=>{this.loaded=true;this.makeShadow();this.dirty=true;};this.image.src=HERO_ASSET;
    handle.addEventListener('pointerdown',e=>{e.preventDefault();this.dragging=e.pointerId;handle.setPointerCapture(e.pointerId);this.move(e);});
    handle.addEventListener('pointermove',e=>{if(e.pointerId===this.dragging)this.move(e);});
    const release=()=>{this.dragging=null;};handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
    handle.addEventListener('keydown',e=>{
      const changes={ArrowLeft:[-.035,0],ArrowRight:[.035,0],ArrowUp:[0,-.035],ArrowDown:[0,.035]};
      if(!changes[e.key])return;e.preventDefault();const [x,y]=changes[e.key];this.set(this.target.x+x,this.target.y+y);
    });
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
  }
  makeShadow(){
    this.shadow=document.createElement('canvas');this.shadow.width=this.image.naturalWidth;this.shadow.height=this.image.naturalHeight;
    const ctx=this.shadow.getContext('2d');ctx.drawImage(this.image,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#403528';ctx.fillRect(0,0,this.shadow.width,this.shadow.height);
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio,2);
    this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.dirty=true;
  }
  move(event){const r=this.canvas.getBoundingClientRect();this.set((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);}
  set(x,y){this.target.x=clamp(x,.12,.87);this.target.y=clamp(y,.19,.79);this.dirty=true;}
  update(dt,reduced){
    if(!this.visible||!this.width)return;
    const distance=Math.hypot(this.target.x-this.light.x,this.target.y-this.light.y);
    if(!this.dirty&&distance<.0001)return;
    this.light.x=reduced?this.target.x:damp(this.light.x,this.target.x,dt,20);
    this.light.y=reduced?this.target.y:damp(this.light.y,this.target.y,dt,20);
    this.handle.style.left=this.hint.style.left=`${this.light.x*100}%`;
    this.handle.style.top=this.hint.style.top=`${this.light.y*100}%`;
    this.handle.setAttribute('aria-label',`移动光源，当前横向 ${Math.round(this.light.x*100)}%，纵向 ${Math.round(this.light.y*100)}%；方向键也可移动`);
    this.draw();this.dirty=false;
  }
  draw(){
    const {ctx,width:w,height:h,dpr}=this;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#d8cdb1';ctx.fillRect(0,0,w,h);
    const lx=this.light.x*w,ly=this.light.y*h;
    const glow=ctx.createRadialGradient(lx,ly,8,lx,ly,w*1.1);
    glow.addColorStop(0,'#fff5ce');glow.addColorStop(.4,'#eee1bb');glow.addColorStop(1,'#c4b38c');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#9585681a';ctx.lineWidth=.5;
    for(let x=20;x<w;x+=19){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=9;y<h;y+=13){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    if(this.loaded){
      const ph=Math.min(h*.66,w*1.13),pw=ph*2/3,px=w*.53,py=h*.49;
      // A screen-facing plane lies behind the puppet. Moving the light casts its
      // silhouette in the opposite direction; this is the same point-projection principle as the game.
      const magnification=1.45,shadowX=px+(px-lx)*(magnification-1),shadowY=py+(py-ly)*(magnification-1);
      ctx.save();ctx.globalAlpha=.29;ctx.filter='blur(2px)';ctx.drawImage(this.shadow,shadowX-pw*magnification/2,shadowY-ph*magnification/2,pw*magnification,ph*magnification);ctx.restore();
      ctx.save();ctx.strokeStyle='#9979434d';ctx.setLineDash([2,5]);ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(px,py);ctx.stroke();ctx.restore();
      ctx.save();ctx.globalAlpha=.93;ctx.drawImage(this.image,px-pw/2,py-ph/2,pw,ph);ctx.restore();
    }
    this.draws++;
  }
  diagnostics(){return {loaded:!!this.loaded,visible:this.visible,light:{...this.light},target:{...this.target},dragging:this.dragging!=null,draws:this.draws};}
}
