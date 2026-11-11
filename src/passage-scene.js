import {AdaptiveQuality} from './adaptive-quality.js';
import {galleryRenderSettings} from './gallery-quality.js';
import * as THREE from '../vendor/three.module.js';
import {MuseumWorld} from './museum-world.js';
import {MUSEUM_ENTRY,MUSEUM_STOPS} from './route-state.js';
import {publicCampusProgress,foyerPhase} from './foyer-entrance.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=THREE.MathUtils.lerp;
const damp=(a,b,dt,s=8)=>mix(a,b,1-Math.exp(-s*dt));
const TAU=Math.PI*2;
// Trace the clear opening in the 1536 × 1024 cover photograph. The timber
// leaves narrow the opening below the arch and must stay in the foreground.
const CAMPUS_DOOR={
  arch:[646/1536,954/1536,400/1024,504/1024],
  clear:[690/1536,902/1536,712/1024],
  leaf:[428/1024,476/1024],
  frame:[664/1536,400/1024,936/1536,712/1024],
};
// The interior photographs already contain their lighting and color balance.
// Applying the old HDR/ACES grade a second time washed out their real texture.
const interiorGrade=`
  vec3 film(vec3 value){
    return max(value,vec3(0.))*interiorExposure;
  }`;

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

// Campus architecture, an indoor exhibition and the market share one camera
// journey. The first threshold follows an architectural arch; only the indoor
// screen opens into the other world. Inactive worlds stop rendering.
export class PassageScene {
  constructor(canvas){
    this.canvas=canvas;this.quality=new AdaptiveQuality({recoverAfter:9000});this.progress=0;this.targetProgress=0;this.visible=true;this.frames=0;
    this.pointer={x:0,y:0};this.smoothPointer={x:0,y:0};this.assetsLoaded=0;this.assetErrors=[];
    this.lanterns=[];this.drifting=[];this.sparkTime={value:0};
    // The interior render target resolves its own MSAA. The final canvas only
    // draws a full-screen composite, so a second MSAA buffer adds no detail.
    try{this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,depth:false,alpha:false,powerPreference:'high-performance'});}
    catch{this.fallback=true;return;}
    this.basePixelRatio=Math.min(devicePixelRatio,2);this.pixelRatio=this.basePixelRatio;this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.campus=new THREE.Scene();this.campus.background=new THREE.Color('#112326');
    this.world=new MuseumWorld(this.renderer);this.gallery=this.world.scene;this.route='public';this.routeProgress=0;
    this.frameTimes=[];this.motionFrameTimes=[];this.renderer.info.autoReset=false;
    this.inspect=new URLSearchParams(location.search).has('inspect');
    this.market=new THREE.Scene();this.market.background=new THREE.Color('#162324');
    this.cameraA=new THREE.PerspectiveCamera(50,1,.06,300);
    this.cameraG=new THREE.PerspectiveCamera(50,1,.06,300);
    this.cameraB=new THREE.PerspectiveCamera(50,1,.06,300);
    this.doorPoint=new THREE.Vector3();this.portalPoint=new THREE.Vector3();this.projectedPoint=new THREE.Vector3();
    this.targetA=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.targetG=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,type:THREE.HalfFloatType,samples:Math.min(4,this.renderer.capabilities.maxSamples)});
    this.targetB=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.promises=[];this.loader=new THREE.TextureLoader();
    this.campusMap=this.load('./assets/passage/campus-entrance-connected.png');
    this.portalMap=this.load('./assets/passage/shadow-gate.png');
    this.galleryMap=this.load('./assets/passage/interior-gallery.png');
    this.puppetMap=this.load('./assets/story/puppet-hero.png');
    this.foliageMap=this.load('./assets/passage/camphor-foreground.png');
    this.marketMap=this.load('./assets/atmosphere/night-market-panorama.png');
    this.stallsMap=this.load('./assets/atmosphere/stall-neighbors-atlas.png');
    this.crowdMap=this.load('./assets/atmosphere/spectators-atlas.png');
    this.stoneMap=this.load('./assets/materials/stone/color.jpg');
    this.stoneMap.wrapS=this.stoneMap.wrapT=THREE.RepeatWrapping;
    this.makeCampus();this.makeMarket();this.makeComposite();
    Promise.all([...this.promises,this.world.ready,document.fonts.ready]).then(async()=>{
      this.assetErrors.push(...this.world.errors);
      // Prepare shader programs before allowing either threshold to open.
      try{
        await this.renderer.compileAsync(this.gallery,this.cameraG);
        await this.renderer.compileAsync(this.market,this.cameraB);
        await this.warmup();
      }catch(error){this.assetErrors.push('shader preparation: '+error.message);}
      this.loaded=true;
      window.dispatchEvent(new Event('passage:ready'));
    });
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
  }
  load(url){
    let done;this.promises.push(new Promise(resolve=>done=resolve));
    const texture=this.loader.load(url,()=>{this.assetsLoaded++;done();},undefined,()=>{this.assetErrors.push(url);done();});
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return texture;
  }
  async warmup(){
    // Program compilation alone does not upload maps or allocate shadow targets.
    // Prime the actual render paths while the loading cover is still visible.
    this.world.preview.prepare(this.cameraG,this.width,this.height,this.pixelRatio,this.targetG.samples);
    for(const [route,progress] of [['public',.50],['public',1],['museum',MUSEUM_ENTRY],...MUSEUM_STOPS.map(stop=>['museum',stop.at])]){
      const pose=this.world.update(route,progress,0,true,null);
      this.cameraG.position.copy(pose.position);this.cameraG.lookAt(pose.look);this.cameraG.updateMatrixWorld();
      this.world.syncCamera(this.cameraG);
      this.renderer.setRenderTarget(this.targetG);this.renderer.render(this.gallery,this.cameraG);
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    this.cameraA.position.set(0,2.8,28);this.cameraA.lookAt(0,2.8,-40);
    this.renderer.setRenderTarget(this.targetA);this.renderer.render(this.campus,this.cameraA);
    this.cameraB.position.set(0,2.9,29);this.cameraB.lookAt(0,3.4,-70);
    this.renderer.setRenderTarget(this.targetB);this.renderer.render(this.market,this.cameraB);
    // Compile/upload the final passes offscreen too. None of the preparation
    // views may reach the canvas before the requested route has been rendered.
    const scratch=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
    try{
      for(const material of [this.portalMaterial,this.singleMaterial]){
        this.compositeQuad.material=material;
        await this.renderer.compileAsync(this.composite,this.screenCamera);
        this.renderer.setRenderTarget(scratch);this.renderer.render(this.composite,this.screenCamera);
      }
    }finally{
      this.renderer.setRenderTarget(null);scratch.dispose();
    }
    this.world.update('public',0,0,true,null);this.renderer.info.reset();
  }
  makeCampus(){
    this.campusBackdrop=plane(this.campusMap,40,26.667,0,3,0,{transparent:false});this.campus.add(this.campusBackdrop);
    this.galleryBackdrop=plane(this.galleryMap,40,26.667,0,2.8,0,{transparent:false});
    for(const [z,width,y,flip] of [[16,19,3,1],[3,40,3.6,-1]]){
      const tree=plane(this.foliageMap,width,width*2/3,0,y,z,{alphaTest:.08,color:0xb6c3ba});
      tree.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.a *= smoothstep(0.0,.13,vMapUv.y);');};
      tree.scale.x=flip;this.campus.add(tree);this.drifting.push(tree);
    }
    const paper=painted(768,640,(c,w,h)=>{
      const r=random(22),g=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.65);
      g.addColorStop(0,'#f8d69a');g.addColorStop(.55,'#c5914f');g.addColorStop(1,'#6e492d');c.fillStyle=g;c.fillRect(0,0,w,h);
      for(let i=0;i<26000;i++){c.fillStyle=r()>.5?'#5d3f1d0c':'#fff2bc0d';c.fillRect(r()*w,r()*h,1+r()*2,1+r()*4);}
    });
    this.paper=plane(paper,7.2,5.5,0,1.35,-.13,{transparent:false});
    this.screenPuppet=plane(this.puppetMap,3.4,5.1,0,1.2,.06,{color:0x493221,opacity:.37,depthWrite:false});
    this.glowMap=painted(128,128,(c,w)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff7d8');g.addColorStop(.08,'#ffd691bd');g.addColorStop(.3,'#efae4d4a');g.addColorStop(1,'#c4861900');c.fillStyle=g;c.fillRect(0,0,w,w);});
    this.addParticles(this.campus,35,22,30,0xadc4a0,29);
    this.addParticles(this.gallery,18,15,26,0xd7b278,54);
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
    this.campusProjection=new THREE.Matrix4();
    this.uniforms={campus:{value:this.targetA.texture},gallery:{value:this.targetG.texture},market:{value:this.targetB.texture},center:{value:new THREE.Vector2(.5,.5)},campusImageFromClip:{value:new THREE.Matrix3()},doorArch:{value:new THREE.Vector4(...CAMPUS_DOOR.arch)},doorClear:{value:new THREE.Vector3(...CAMPUS_DOOR.clear)},doorLeaf:{value:new THREE.Vector2(...CAMPUS_DOOR.leaf)},doorReveal:{value:0},doorFull:{value:0},radius:{value:0},aspect:{value:1},reveal:{value:0}};
    this.uniforms.interiorExposure={value:1};
    const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec2 uvp;void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`uniform sampler2D campus,gallery,market;uniform vec2 center,doorLeaf;uniform vec4 doorArch;uniform vec3 doorClear;uniform mat3 campusImageFromClip;uniform float radius,aspect,reveal,doorReveal,doorFull,interiorExposure;varying vec2 uvp;
      ${interiorGrade}
      float campusDoorway(){
        vec3 projected=campusImageFromClip*vec3(uvp*2.-1.,1.);
        vec2 p=projected.xy/projected.z,aa=max(fwidth(p),vec2(.00001));
        float centerX=(doorArch.x+doorArch.y)*.5,radiusX=(doorArch.y-doorArch.x)*.5;
        float rise=doorArch.w-doorArch.z;
        float archDistance=length(vec2((p.x-centerX)/radiusX,min(0.,p.y-doorArch.w)/rise));
        float arcAA=max(aa.x/radiusX,aa.y/rise);
        float roundTop=1.-smoothstep(1.-arcAA,1.+arcAA,archDistance);
        float leafEdge=clamp((p.y-doorLeaf.x)/(doorLeaf.y-doorLeaf.x),0.,1.);
        float left=mix(doorArch.x,doorClear.x,leafEdge),right=mix(doorArch.y,doorClear.y,leafEdge);
        return roundTop*smoothstep(left-aa.x,left+aa.x,p.x)
          *(1.-smoothstep(right-aa.x,right+aa.x,p.x))
          *(1.-smoothstep(doorClear.z-aa.y,doorClear.z+aa.y,p.y));
      }
      void main(){
        float throughDoor=mix(campusDoorway()*doorReveal,1.,doorFull);
        vec3 color=mix(texture2D(campus,uvp).rgb,film(texture2D(gallery,uvp).rgb),throughDoor);
        vec2 p=(uvp-center)*vec2(aspect,.88);float angle=atan(p.y,p.x);float edge=radius*(1.+.045*cos(angle*8.)+.018*sin(angle*13.));float d=length(p);
        float inside=radius>=2.9?1.:(1.-smoothstep(edge-.0025,edge+.0025,d))*reveal;
        color=mix(color,texture2D(market,uvp).rgb,inside);
        float rim=exp(-abs(d-edge)*250.)*reveal*(1.-smoothstep(1.,1.7,radius));color+=vec3(.64,.34,.095)*rim*.8;
        float vignette=1.-smoothstep(.18,.9,length((uvp-.5)*vec2(.86,1.)));float shade=mix(.31,.12,throughDoor);color*=1.-shade+shade*vignette;gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`});
    this.portalMaterial=material;
    this.singleUniforms={image:{value:this.targetA.texture},grade:{value:0},interiorExposure:this.uniforms.interiorExposure};
    this.singleMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:this.singleUniforms,
      vertexShader:material.vertexShader,
      fragmentShader:`uniform sampler2D image;uniform float grade,interiorExposure;varying vec2 uvp;
      ${interiorGrade}
      void main(){
        vec3 color=texture2D(image,uvp).rgb;
        if(grade>.5)color=film(color);
        float vignette=1.-smoothstep(.18,.9,length((uvp-.5)*vec2(.86,1.)));
        float shade=mix(.31,.12,grade);gl_FragColor=vec4(color*(1.-shade+shade*vignette),1.);
        #include <colorspace_fragment>
      }`});
    this.compositeQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);this.composite.add(this.compositeQuad);
  }
  resize(){
    if(this.fallback)return;const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;
    this.width=width;this.height=height;
    // Keep enough pixels and edge coverage for plaster grain and thin mouldings.
    const settings=galleryRenderSettings(width,height,devicePixelRatio,this.quality.tier,this.renderer.capabilities.maxSamples);
    this.basePixelRatio=settings.base;this.pixelRatio=settings.pixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(width,height,false);this.mobile=width<701;
    const samples=settings.samples;
    if(this.targetG.samples!==samples){this.targetG.samples=samples;this.targetG.dispose();}
    for(const camera of [this.cameraA,this.cameraG,this.cameraB]){camera.aspect=width/height;camera.fov=this.mobile?62:50;camera.userData.baseFov=camera.fov;camera.updateProjectionMatrix();}
    for(const target of [this.targetA,this.targetG,this.targetB])target.setSize(Math.round(width*this.pixelRatio),Math.round(height*this.pixelRatio));
    this.uniforms.aspect.value=width/height;
    this.world.backdrop.resize(width,height);
    // Keep both physical entrances in view in a portrait viewport.
    this.world.hallDistanceOffset=Math.max(0,7.3/(Math.tan(THREE.MathUtils.degToRad(this.cameraG.fov/2))*this.cameraG.aspect)-12);
    const coverHeight=2*Math.tan(THREE.MathUtils.degToRad(this.cameraA.fov/2))*28;
    this.matteScale=Math.max(1,coverHeight/26.667*1.04,coverHeight*(width/height)/40*1.04);
    this.campusBackdrop.scale.setScalar(this.matteScale);this.galleryBackdrop.scale.setScalar(this.matteScale);
    this.doorPoint.set((800/1536-.5)*40*this.matteScale,3+(.5-560/1024)*26.667*this.matteScale,0);
    this.portalPoint.set(0,2.8+(.5-402/1024)*26.667*this.matteScale,0);
    this.screenPuppet.position.y=this.portalPoint.y;this.screenPuppet.scale.setScalar(this.matteScale);this.resizeDirty=true;
  }
  setProgress(p){this.targetProgress=this.progress=clamp(p);}
  setRoute(route, progress, transition=null){
    this.route=route;this.routeProgress=progress;this.routeTransition=transition;
    this.setProgress(route==='public'?progress*.23:route==='game'?.21+progress*.79:.23);
  }
  setPointer(x,y){this.pointer.x=clamp(x,-1,1);this.pointer.y=clamp(y,-1,1);}
  update(time,dt,reduced){
    if(this.fallback||!this.visible||!this.loaded){this.quality.resetClock();this.lastDrawAt=null;return;}
    const p=this.route==='public'?publicCampusProgress(this.routeProgress):this.progress;this.smoothPointer.x=damp(this.smoothPointer.x,this.pointer.x,dt,4);this.smoothPointer.y=damp(this.smoothPointer.y,this.pointer.y,dt,4);
    this.uniforms.interiorExposure.value=this.route==='public'?mix(.8,1,smooth(.24,.46,this.routeProgress)):1;
    const px=reduced||!this.presented?0:this.smoothPointer.x,py=reduced||!this.presented?0:this.smoothPointer.y;
    if(reduced&&this.lastRenderedProgress===p&&this.lastRouteProgress===this.routeProgress&&!this.routeTransition&&!this.interactionDirty&&!this.resizeDirty&&this.frames>0){this.quality.resetClock();return;}
    // A visible preview can be throttled while focus is in the editor/chat.
    // Those one-second callbacks must not permanently downgrade a sharp scene.
    const focused=document.hasFocus();
    if(focused!==this.qualityFocused){this.quality.resetClock();this.lastDrawAt=null;this.frameTimes=[];this.qualityFocused=focused;}
    if(focused){if(this.quality.observe(performance.now()))this.resize();}
    else this.quality.resetClock();
    const frameNow=performance.now();
    if(this.lastDrawAt!==null&&this.lastDrawAt!==undefined){
      const elapsed=frameNow-this.lastDrawAt;
      this.frameTimes.push(elapsed);if(this.frameTimes.length>180)this.frameTimes.shift();
      if(this.routeTransition||Math.abs(this.routeProgress-(this.lastRouteProgress??this.routeProgress))>.00001){this.motionFrameTimes.push(elapsed);if(this.motionFrameTimes.length>240)this.motionFrameTimes.shift();}
    }
    this.lastDrawAt=frameNow;this.renderer.info.reset();this.world.qualityTier=this.quality.tier;
    this.lastRenderedProgress=p;this.lastRouteProgress=this.routeProgress;this.interactionDirty=false;this.resizeDirty=false;this.frames++;this.sparkTime.value=reduced?0:time;
    const approach=smooth(0,.22,p),az=mix(28,.35,approach),ax=this.doorPoint.x*approach;
    this.sceneStartedAt??=time;
    const ay=mix(2.8,this.doorPoint.y,smooth(.02,.18,p)),idle=reduced?0:Math.sin((time-this.sceneStartedAt)*.55)*.014;
    this.cameraA.position.set(ax+px*.2,ay-py*.08+idle,az);this.cameraA.lookAt(ax+px*.06,ay,-40);this.cameraA.updateMatrixWorld();
    // Project the mask through the same camera as the cover, so pointer motion
    // and the forward walk cannot slide the corridor over the wooden doors.
    this.campusProjection.multiplyMatrices(this.cameraA.projectionMatrix,this.cameraA.matrixWorldInverse);
    const m=this.campusProjection.elements,w=40*this.matteScale,h=26.667*this.matteScale,left=-w/2,top=3+h/2;
    this.uniforms.campusImageFromClip.value.set(
      m[0]*w,-m[4]*h,m[0]*left+m[4]*top+m[12],
      m[1]*w,-m[5]*h,m[1]*left+m[5]*top+m[13],
      m[3]*w,-m[7]*h,m[3]*left+m[7]*top+m[15]
    ).invert();
    const bounds=CAMPUS_DOOR.frame;
    this.projectedPoint.set((bounds[0]-.5)*w,3+(.5-bounds[1])*h,0).project(this.cameraA);
    const doorX=(this.projectedPoint.x+1)/2,doorY=(1-this.projectedPoint.y)/2;
    this.projectedPoint.set((bounds[2]-.5)*w,3+(.5-bounds[3])*h,0).project(this.cameraA);
    this.world.backdrop.frontDoorRect={x:doorX,y:doorY,width:(this.projectedPoint.x+1)/2-doorX,height:(1-this.projectedPoint.y)/2-doorY};
    if(this.route==='public'||this.route==='game'&&this.routeProgress<.12)
      this.world.preview.prepare(this.cameraG,this.width,this.height,this.pixelRatio,this.targetG.samples);
    const pose=this.world.update(this.route,this.route==='game'?smooth(0,.25,this.routeProgress):this.routeProgress,time,reduced,this.routeTransition);
    this.cameraG.position.copy(pose.position);this.cameraG.lookAt(pose.look);this.cameraG.updateMatrixWorld();
    this.world.syncCamera(this.cameraG);
    if(this.route==='museum'){
      this.compositeMode='gallery';this.renderer.setRenderTarget(this.targetG);this.renderer.render(this.gallery,this.cameraG);
      this.compositeQuad.material=this.singleMaterial;this.singleUniforms.image.value=this.targetG.texture;this.singleUniforms.grade.value=1;
      this.renderer.setRenderTarget(null);this.renderer.render(this.composite,this.screenCamera);this.finishFrame();return;
    }
    const bz=mix(29,-46,smooth(.32,.63,p));
    this.cameraB.position.set(Math.sin(smooth(.42,.63,p)*Math.PI)*.4+px*.24,2.9-py*.1+idle,bz);this.cameraB.lookAt(0,3.4,-70);this.cameraB.updateMatrixWorld();
    this.screenPuppet.rotation.z=reduced?0:Math.sin(time*.65)*.03;this.screenPuppet.position.x=reduced?0:Math.sin(time*.5)*.1;
    this.finalPuppet.rotation.z=reduced?0:Math.sin(time*.75)*.028;
    // The first live frame keeps the poster's canopy; foreground parallax joins
    // only when walking starts, so loading does not replace the visible trees.
    const foliage=smooth(0,.035,p);
    this.drifting.forEach((tree,i)=>{tree.visible=foliage>0;tree.material.opacity=foliage;tree.rotation.z=reduced?0:Math.sin(time*.27+i)*.006;});
    this.updateLanterns(time,reduced);
    this.steam.forEach(({mesh,k,base})=>{const t=reduced?k/8:(time*.12+k/8)%1;mesh.position.copy(base);mesh.position.y+=t*2.3;mesh.position.x+=Math.sin(t*5+k)*.18;mesh.scale.setScalar(.35+t);mesh.material.opacity=Math.sin(t*Math.PI)*.05;mesh.quaternion.copy(this.cameraB.quaternion);});
    // Keep the same live corridor behind the entrance from the first frame.
    // Fading from the cover's baked hallway while walking doubled the lanterns.
    this.uniforms.doorReveal.value=this.route==='public'?1:smooth(.065,.095,p);this.uniforms.doorFull.value=this.routeTransition?.autoplay?1:smooth(.195,.226,p);
    if(this.route==='game')this.portalPoint.set(this.world.gameOrigin==='museum'?-9:4.4,3,this.world.gameOrigin==='museum'?-94:-5);
    const linen=this.world.backdrop.theaterRect;
    this.uniforms.center.value.set(linen.x+linen.width/2,1-linen.y-linen.height/2);
    const portalDistance=Math.max(.3,this.cameraG.position.distanceTo(this.portalPoint));
    let radius=2.15/(2*Math.tan(THREE.MathUtils.degToRad(this.cameraG.fov/2))*portalDistance)*smooth(.12,.22,this.routeProgress);
    if(this.routeProgress>.22)radius=mix(radius,3,smooth(.22,.25,this.routeProgress));
    if(this.routeTransition?.autoplay){
      radius=Math.min(linen.width*this.cameraG.aspect,linen.height)*.43*mix(.06,1,smooth(.145,.205,this.routeProgress));
      radius=mix(radius,3,smooth(.205,.27,this.routeProgress));
    }
    this.uniforms.radius.value=this.route==='game'?radius:0;
    const portalStart=this.routeTransition?.autoplay ? .145 : .12,portalOpen=this.routeTransition?.autoplay ? .17 : .14;
    this.uniforms.reveal.value=this.route==='game'?smooth(portalStart,portalOpen,this.routeProgress):0;
    if(p<.228){this.renderer.setRenderTarget(this.targetA);this.renderer.render(this.campus,this.cameraA);}
    if((this.route==='public'||p>.065)&&(this.route!=='game'||this.routeProgress<.27)){this.renderer.setRenderTarget(this.targetG);this.renderer.render(this.gallery,this.cameraG);}
    if(p>.27){this.renderer.setRenderTarget(this.targetB);this.renderer.render(this.market,this.cameraB);}
    // Only portals need three texture reads and the angular/rim shader per pixel.
    const single=this.route!=='public'&&p<=.065?this.targetA:this.route!=='game'&&p>=.228?this.targetG:this.route==='game'&&this.routeProgress>=.27?this.targetB:null;
    this.compositeMode=single?'single':'portal';
    this.compositeQuad.material=single?this.singleMaterial:this.portalMaterial;
    if(single)this.singleUniforms.image.value=single.texture;
    this.singleUniforms.grade.value=single===this.targetG?1:0;
    this.renderer.setRenderTarget(null);this.renderer.render(this.composite,this.screenCamera);this.finishFrame();
  }
  finishFrame(){
    if(this.inspect&&this.route==='public')document.documentElement.dataset.foyerPhase=foyerPhase(this.routeProgress);
    if(!this.presented){
      this.presented=true;document.body.classList.add('passage-ready');
      if(this.inspect)document.documentElement.dataset.passageFirstFrame=JSON.stringify({route:this.route,progress:this.routeProgress});
    }
    if(this.inspect&&performance.now()-(this.lastStatsAt||0)>800){
      this.lastStatsAt=performance.now();
      const sorted=[...this.frameTimes].sort((a,b)=>a-b),mean=sorted.reduce((a,b)=>a+b,0)/Math.max(1,sorted.length);
      const motion=[...this.motionFrameTimes].sort((a,b)=>a-b),motionMean=motion.reduce((a,b)=>a+b,0)/Math.max(1,motion.length);
      document.documentElement.dataset.journeyRender=JSON.stringify({route:this.route,progress:+this.routeProgress.toFixed(4),fps:+(1000/Math.max(1,mean)).toFixed(1),p95:sorted[Math.floor(sorted.length*.95)]||0,samples:sorted.length,motionFps:motion.length?+(1000/Math.max(1,motionMean)).toFixed(1):null,motionP95:motion[Math.floor(motion.length*.95)]||0,motionMax:motion.at(-1)||0,motionSamples:motion.length,tier:this.quality.tier,pixelRatio:this.pixelRatio,canvas:[this.canvas.width,this.canvas.height],calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,errors:this.assetErrors,cabinetAnimation:this.world.walk.vignette.diagnostics(),focused:this.qualityFocused,aaSamples:this.targetG.samples,wallTexture:[this.world.walk.materials.wall.map.image?.width,this.world.walk.materials.wall.map.image?.height],galleryLights:this.world.walk.cabinetLights.flat().filter(light=>light.visible).length});
    }
  }
  diagnostics(){return{qualityTier:this.quality.tier,memory:this.renderer?{...this.renderer.info.memory,programs:this.renderer.info.programs.length}:null,compositeMode:this.compositeMode,fallback:!!this.fallback,loaded:!!this.loaded,assetErrors:[...this.assetErrors],assetsLoaded:this.assetsLoaded,visible:this.visible,frames:this.frames,progress:this.progress,route:this.route,routeProgress:this.routeProgress,targetProgress:this.targetProgress,worldReady:!!this.world?.prepared,campusZ:this.cameraA?.position.z,galleryZ:this.cameraG?.position.z,doorReveal:this.uniforms?.doorReveal.value,marketZ:this.cameraB?.position.z,pointer:{...this.smoothPointer},cameraX:this.cameraA?.position.x,portalRadius:this.uniforms?.radius.value,pixelRatio:this.pixelRatio};}
}
