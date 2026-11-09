import * as THREE from '../vendor/three.module.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=THREE.MathUtils.lerp;
const damp=(a,b,dt,s=8)=>mix(a,b,1-Math.exp(-s*dt));
const TAU=Math.PI*2;

function random(seed=7){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function painted(width,height,paint){const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function plane(texture,w,h,x,y,z,options={}){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,
    transparent:true,alphaTest:.025,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false,...options}));
  mesh.position.set(x,y,z);return mesh;
}
function uvPlane(texture,rect,height,x,y,z){
  const mesh=plane(texture,height*rect[1]/1024,height,x,y,z,{alphaTest:.12});
  const uv=mesh.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setX(i,(rect[0]+uv.getX(i)*rect[1])/1536);
  return mesh;
}

// Two shallow, layered worlds are joined through a camera-aligned aperture.
// Only the world visible in the current part of the journey is rendered; both
// targets are needed briefly while the paper opening reveals the other side.
export class PassageScene {
  constructor(canvas){
    this.canvas=canvas;this.progress=0;this.targetProgress=0;this.visible=true;this.frames=0;
    this.pointer={x:0,y:0};this.smoothPointer={x:0,y:0};this.assetsLoaded=0;this.assetErrors=[];
    this.lanterns=[];this.drifting=[];this.sparkTime={value:0};
    try{this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}
    catch{this.fallback=true;return;}
    this.pixelRatio=Math.min(devicePixelRatio,1.6);this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.campus=new THREE.Scene();this.campus.background=new THREE.Color('#112326');
    this.market=new THREE.Scene();this.market.background=new THREE.Color('#162324');
    this.cameraA=new THREE.PerspectiveCamera(50,1,.06,300);
    this.cameraB=new THREE.PerspectiveCamera(50,1,.06,300);
    this.portalPoint=new THREE.Vector3(2.4,1.04,0);this.projectedPoint=new THREE.Vector3();
    this.targetA=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.targetB=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.promises=[];this.loader=new THREE.TextureLoader();
    this.campusMap=this.load('./assets/passage/luojia-dusk.png');
    this.portalMap=this.load('./assets/passage/shadow-gate.png');
    this.boothMap=this.load('./assets/passage/campus-theatre.png');
    this.puppetMap=this.load('./assets/story/puppet-hero.png');
    this.foliageMap=this.load('./assets/passage/camphor-foreground.png');
    this.marketMap=this.load('./assets/atmosphere/night-market-panorama.png');
    this.stallsMap=this.load('./assets/atmosphere/stall-neighbors-atlas.png');
    this.crowdMap=this.load('./assets/atmosphere/spectators-atlas.png');
    this.stoneMap=this.load('./assets/materials/stone/color.jpg');
    this.stoneMap.wrapS=this.stoneMap.wrapT=THREE.RepeatWrapping;
    this.makeCampus();this.makeMarket();this.makeComposite();
    Promise.all(this.promises).then(()=>{this.loaded=true;document.body.classList.add('passage-ready');});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
  }
  load(url){
    let done;this.promises.push(new Promise(resolve=>done=resolve));
    const texture=this.loader.load(url,()=>{this.assetsLoaded++;done();},undefined,()=>{this.assetErrors.push(url);done();});
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return texture;
  }
  makeCampus(){
    this.campusBackdrop=plane(this.campusMap,186,124,0,3,-92,{transparent:false});this.campus.add(this.campusBackdrop);
    for(const [z,width,y,flip] of [[16,19,3,1],[3,40,3.6,-1]]){
      const tree=plane(this.foliageMap,width,width*2/3,0,y,z,{alphaTest:.08,color:0xb6c3ba});
      tree.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.a *= smoothstep(0.0,.13,vMapUv.y);');};
      tree.scale.x=flip;this.campus.add(tree);this.drifting.push(tree);
    }
    const paper=painted(768,640,(c,w,h)=>{
      const r=random(22),g=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.65);
      g.addColorStop(0,'#f8d69a');g.addColorStop(.55,'#c5914f');g.addColorStop(1,'#6e492d');c.fillStyle=g;c.fillRect(0,0,w,h);
      for(let i=0;i<26000;i++){c.fillStyle=r()>.5?'#5d3f1d0c':'#fff2bc0d';c.fillRect(r()*w,r()*h,1+r()*2,1+r()*4);}
      c.strokeStyle='#875b2b15';for(let y=0;y<h;y+=5){c.beginPath();c.moveTo(0,y);c.lineTo(w,y+.5);c.stroke();}
    });
    this.booth=new THREE.Group();this.booth.position.x=this.portalPoint.x;this.campus.add(this.booth);
    // Keep the paper texture for the market stage. The campus screen now
    // belongs to one coherent photographed-style shelter, including its ties.
    this.paper=plane(paper,7.2,5.5,0,1.35,-.13,{transparent:false});
    this.screenPuppet=plane(this.puppetMap,1.65,2.48,.08,this.portalPoint.y,.05,{color:0x493221,opacity:.36,depthWrite:false});this.booth.add(this.screenPuppet);
    this.glowMap=painted(128,128,(c,w)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff7d8');g.addColorStop(.08,'#ffd691bd');g.addColorStop(.3,'#efae4d4a');g.addColorStop(1,'#c4861900');c.fillStyle=g;c.fillRect(0,0,w,w);});
    this.makeCampusBooth();
    this.addParticles(this.campus,65,22,30,0xadc4a0,29);
  }
  makeCampusBooth(){
    // The canopy, lashed screen, stone post bases and stairs are a single
    // detailed RGBA scenic layer. The stair foot at image y=1000 is aligned
    // with the horizontal contact shadow, not suspended over the path.
    const floor=-3.48,width=12.6,height=8.4,foot=1000/1024;
    const shelter=plane(this.boothMap,width,height,0,floor+(foot-.5)*height,0,{alphaTest:.005});
    this.booth.add(shelter);
    const shadowMap=painted(256,256,(c,w,h)=>{
      const g=c.createRadialGradient(w/2,h/2,w*.1,w/2,h/2,w*.49);
      g.addColorStop(0,'#071016a6');g.addColorStop(.45,'#07101662');g.addColorStop(1,'#07101600');
      c.fillStyle=g;c.fillRect(0,0,w,h);
    });
    for(const [width,depth,z,opacity] of [[14,8,.3,.65],[10.2,2.4,.1,.7]]){
      const shadow=plane(shadowMap,width,depth,0,floor,z,{opacity,depthWrite:false,alphaTest:0});
      shadow.rotation.x=-Math.PI/2;this.booth.add(shadow);
    }
  }
  ground(scene,w,d,z,color){
    const material=new THREE.MeshBasicMaterial({map:this.stoneMap,color,transparent:true,toneMapped:false});
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 sampledDiffuseColor = texture2D(map, vMapUv * vec2(${w/3.2}, ${d/3.2})); diffuseColor *= sampledDiffuseColor; diffuseColor.a *= smoothstep(0.0,.14,vMapUv.y) * (1.0 - smoothstep(.87,1.0,vMapUv.y));`);
    };
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.05,z);scene.add(ground);
  }
  makeMarket(){
    const curved=new THREE.CylinderGeometry(65,65,34,100,1,true,0,Math.PI*2);
    const material=new THREE.MeshBasicMaterial({map:this.marketMap,side:THREE.BackSide,color:0xd6b58b,toneMapped:false,transparent:true,depthWrite:false});
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      diffuseColor.a *= smoothstep(.06,.22,vMapUv.y) * (1.0-smoothstep(.74,1.0,vMapUv.y));`);};
    this.marketMap.wrapS=THREE.RepeatWrapping;this.marketMap.repeat.x=3;
    const panorama=new THREE.Mesh(curved,material);panorama.position.set(0,10,-43);panorama.rotation.y=.25;panorama.renderOrder=-10;this.market.add(panorama);
    this.ground(this.market,55,155,-36,0x777064);
    const places=[[-7,2.85,6,0],[7.8,2.55,-4,1],[-7.6,2.85,-18,0],[7.2,2.6,-32,1]];
    for(const [x,y,z,half] of places){
      const height=half?5.8:6.4,rect=half?[752,784]:[0,720];
      const stall=uvPlane(this.stallsMap,rect,height,x,y,z);stall.rotation.y=x>0?-.12:.12;this.market.add(stall);
    }
    const regions=[[0,432],[432,336],[768,384],[1152,384]];
    for(const [x,z,i] of [[-4.5,-13,1],[4.1,-24,2],[-3.7,-33,0],[3.5,-44,3]]){
      const height=i===3?2.25:i===0?2.55:3.2;
      this.market.add(uvPlane(this.crowdMap,regions[i],height,x,height*.46-.12,z));
    }
    // The filigree layers physically pass the camera before the open square.
    for(const [z,size,angle] of [[19,15,.03],[11,19,-.08]]){
      const lace=plane(this.portalMap,size,size*2/3,0,3.4,z,{color:0x704623,opacity:.75,alphaTest:.08});lace.rotation.z=angle;this.market.add(lace);
    }
    for(const z of [6,-12,-31,-49]){
      const points=[];for(let i=0;i<=24;i++){const x=-14+i*28/24;points.push(new THREE.Vector3(x,8.1-.006*(196-x*x),z));}
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x574335}));this.market.add(line);
      for(const x of [-11,-7,-3.3,3.3,7,11])this.addLantern(x,7.5-.006*(196-x*x),z,.7+(Math.abs(x)%3)*.08);
    }
    this.makeLanternInstances();
    this.finalGate=plane(this.portalMap,15.4,10.27,0,4.7,-63,{color:0xc09a71});this.market.add(this.finalGate);
    this.finalPaper=plane(this.paper.material.map,11,8.1,0,4.0,-63.15,{color:0xd8c3a1,transparent:false});this.market.add(this.finalPaper);
    this.finalPuppet=plane(this.puppetMap,3.6,5.4,0,3.7,-63.1,{color:0x664527,opacity:.7,depthWrite:false});this.market.add(this.finalPuppet);
    this.addParticles(this.market,110,26,105,0xe6b96f,58);
    this.makeSteam();
  }
  addLantern(x,y,z,size){
    this.lanterns.push({x,y,z,size});
  }
  makeLanternInstances(){
    const map=painted(512,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#6c321c');g.addColorStop(.25,'#df8a37');g.addColorStop(.5,'#ffe7a4');g.addColorStop(.75,'#d8792b');g.addColorStop(1,'#6c321c');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#69351977';c.lineWidth=2;for(let x=0;x<w;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}c.strokeStyle='#984a242f';for(let y=0;y<h;y+=7){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}});
    const n=this.lanterns.length,create=(geo,mat,count)=>{const m=new THREE.InstancedMesh(geo,mat,count);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;this.market.add(m);return m;};
    this.lanternBodies=create(new THREE.SphereGeometry(.45,22,14),new THREE.MeshBasicMaterial({map}),n);
    this.lanternCaps=create(new THREE.CylinderGeometry(.17,.17,.07,12),new THREE.MeshBasicMaterial({color:0x5a3824}),n*2);
    this.lanternTassels=create(new THREE.CylinderGeometry(.018,.05,.4,6),new THREE.MeshBasicMaterial({color:0xb78a4d}),n);
    this.lanternGlows=create(new THREE.PlaneGeometry(3.4,3.4),new THREE.MeshBasicMaterial({map:this.glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.24}),n);
    this.lanternDummy=new THREE.Object3D();
  }
  updateLanterns(time,reduced){
    const d=this.lanternDummy;
    this.lanterns.forEach(({x,y,z,size},i)=>{
      const angle=reduced?0:Math.sin(time*.7+i)*.045;
      d.position.set(x,y,z);d.rotation.set(0,0,angle);d.scale.set(size,size*.87,size);d.updateMatrix();this.lanternBodies.setMatrixAt(i,d.matrix);
      for(let k=0;k<2;k++){const offset=(k?1:-1)*.36*size;d.position.set(x-Math.sin(angle)*offset,y+Math.cos(angle)*offset,z);d.scale.setScalar(size);d.updateMatrix();this.lanternCaps.setMatrixAt(i*2+k,d.matrix);}
      d.position.set(x+Math.sin(angle)*.6*size,y-Math.cos(angle)*.6*size,z);d.updateMatrix();this.lanternTassels.setMatrixAt(i,d.matrix);
      d.position.set(x,y,z);d.quaternion.copy(this.cameraB.quaternion);d.scale.setScalar(size);d.updateMatrix();this.lanternGlows.setMatrixAt(i,d.matrix);
    });
    for(const m of [this.lanternBodies,this.lanternCaps,this.lanternTassels,this.lanternGlows])m.instanceMatrix.needsUpdate=true;
  }
  addParticles(scene,count,width,depth,color,seed){
    const rnd=random(seed),positions=[],phases=[];
    for(let i=0;i<count;i++){positions.push((rnd()-.5)*width,rnd()*9,scene===this.market?20-rnd()*depth:25-rnd()*depth);phases.push(rnd()*TAU);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{time:this.sparkTime,tint:{value:new THREE.Color(color)},ratio:{value:this.pixelRatio}},
      vertexShader:`uniform float time,ratio; attribute float phase; varying float alpha; void main(){vec3 p=position;p.x+=sin(time*.15+phase)*.3;p.y+=sin(time*.2+phase)*.25;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(36./max(1.,-mv.z),1.,4.)*ratio;alpha=(.25+.5*sin(phase)*sin(phase))*smoothstep(.2,2.,-mv.z);}`,
      fragmentShader:`uniform vec3 tint;varying float alpha;void main(){float a=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(tint,a*alpha);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
    scene.add(new THREE.Points(geometry,material));
  }
  makeSteam(){
    this.steam=[];const map=this.glowMap;
    for(let i=0;i<16;i++){const source=i<8?-1:1,k=i%8,mesh=plane(map,1.4,2.5,source<0?-7.1:7.8,1.8,source<0?6:-4,{color:0xb0b4a2,depthWrite:false,opacity:.04});this.market.add(mesh);this.steam.push({mesh,k,base:mesh.position.clone()});}
  }
  makeComposite(){
    this.composite=new THREE.Scene();this.screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);
    this.uniforms={campus:{value:this.targetA.texture},market:{value:this.targetB.texture},center:{value:new THREE.Vector2(.5,.5)},radius:{value:0},aspect:{value:1},reveal:{value:0},time:{value:0}};
    const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec2 uvp;void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D campus,market;uniform vec2 center;uniform float radius,aspect,reveal,time;varying vec2 uvp;
      void main(){vec2 p=(uvp-center)*vec2(aspect,.88);float angle=atan(p.y,p.x);float edge=radius*(1.+.045*cos(angle*8.)+.018*sin(angle*13.));float d=length(p);float inside=radius>=2.9?1.:(1.-smoothstep(edge-.0025,edge+.0025,d))*reveal;
      vec3 a=texture2D(campus,uvp).rgb;vec3 b=texture2D(market,uvp).rgb;vec3 color=mix(a,b,inside);float rim=exp(-abs(d-edge)*250.)*reveal*(1.-smoothstep(1.,1.7,radius));color+=vec3(.64,.34,.095)*rim*.8;
      float vignette=1.-smoothstep(.18,.9,length((uvp-.5)*vec2(.86,1.)));color*=.69+.31*vignette;gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`});
    this.composite.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  }
  resize(){
    if(this.fallback)return;const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;
    this.width=width;this.height=height;this.renderer.setSize(width,height,false);this.mobile=width<701;
    for(const camera of [this.cameraA,this.cameraB]){camera.aspect=width/height;camera.fov=this.mobile?62:50;camera.updateProjectionMatrix();}
    this.targetA.setSize(Math.round(width*this.pixelRatio),Math.round(height*this.pixelRatio));this.targetB.setSize(Math.round(width*this.pixelRatio),Math.round(height*this.pixelRatio));this.uniforms.aspect.value=width/height;
    const coverHeight=2*Math.tan(THREE.MathUtils.degToRad(this.cameraA.fov/2))*120;const size=Math.max(1,coverHeight/124*1.04,coverHeight*(width/height)/186*1.04);this.campusBackdrop.scale.setScalar(size);this.resizeDirty=true;
  }
  setProgress(p){this.targetProgress=clamp(p);}
  setPointer(x,y){this.pointer.x=clamp(x,-1,1);this.pointer.y=clamp(y,-1,1);}
  update(time,dt,reduced){
    if(this.fallback||!this.visible||!this.loaded)return;
    const previous=this.progress;this.progress=reduced?this.targetProgress:damp(this.progress,this.targetProgress,dt,9);
    if(Math.abs(this.progress-this.targetProgress)<.00001)this.progress=this.targetProgress;
    this.smoothPointer.x=damp(this.smoothPointer.x,this.pointer.x,dt,4);this.smoothPointer.y=damp(this.smoothPointer.y,this.pointer.y,dt,4);
    const p=this.progress,px=reduced?0:this.smoothPointer.x,py=reduced?0:this.smoothPointer.y;
    if(reduced&&previous===p&&!this.resizeDirty&&this.frames>0)return;
    this.resizeDirty=false;this.frames++;this.sparkTime.value=reduced?0:time;
    const approach=smooth(0,.56,p),az=mix(28,.25,approach);
    const bz=mix(29,-43,smooth(.35,1,p));
    const idle=reduced?0:Math.sin(time*.55)*.018;
    const ay=mix(2.8,this.portalPoint.y,smooth(0,.45,p));
    const ax=this.portalPoint.x*approach;
    this.cameraA.position.set(ax+px*.3,ay-py*.12+idle,az);this.cameraA.lookAt(ax+px*.09,ay,-40);this.cameraA.updateMatrixWorld();
    this.cameraB.position.set(Math.sin(smooth(.5,1,p)*Math.PI)*.4+px*.24,2.9-py*.1+idle,bz);this.cameraB.lookAt(0,3.4,-70);this.cameraB.updateMatrixWorld();
    this.screenPuppet.rotation.z=reduced?0:Math.sin(time*.65)*.035;this.screenPuppet.position.x=.08+(reduced?0:Math.sin(time*.5)*.08);
    this.finalPuppet.rotation.z=reduced?0:Math.sin(time*.75)*.028;
    this.drifting.forEach((tree,i)=>tree.rotation.z=reduced?0:Math.sin(time*.27+i)*.006);
    this.updateLanterns(time,reduced);
    this.steam.forEach(({mesh,k,base})=>{const t=reduced?k/8:(time*.12+k/8)%1;mesh.position.copy(base);mesh.position.y+=t*2.3;mesh.position.x+=Math.sin(t*5+k)*.18;mesh.scale.setScalar(.35+t);mesh.material.opacity=Math.sin(t*Math.PI)*.05;mesh.quaternion.copy(this.cameraB.quaternion);});
    this.projectedPoint.copy(this.portalPoint).project(this.cameraA);this.uniforms.center.value.set(this.projectedPoint.x*.5+.5,this.projectedPoint.y*.5+.5);
    let radius=1.22/(2*Math.tan(THREE.MathUtils.degToRad(this.cameraA.fov/2))*az)*smooth(.23,.39,p);
    if(p>.52)radius=mix(radius,3,smooth(.52,.56,p));
    this.uniforms.radius.value=radius;this.uniforms.reveal.value=smooth(.22,.25,p);
    if(p<.56){this.renderer.setRenderTarget(this.targetA);this.renderer.render(this.campus,this.cameraA);}
    if(p>.22){this.renderer.setRenderTarget(this.targetB);this.renderer.render(this.market,this.cameraB);}
    this.renderer.setRenderTarget(null);this.renderer.render(this.composite,this.screenCamera);
  }
  diagnostics(){return{fallback:!!this.fallback,loaded:!!this.loaded,assetErrors:[...this.assetErrors],assetsLoaded:this.assetsLoaded,visible:this.visible,frames:this.frames,progress:this.progress,targetProgress:this.targetProgress,campusZ:this.cameraA?.position.z,marketZ:this.cameraB?.position.z,pointer:{...this.smoothPointer},cameraX:this.cameraA?.position.x,portalRadius:this.uniforms?.radius.value,pixelRatio:this.pixelRatio};}
}
