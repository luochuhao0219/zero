import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {EffectComposer} from '../vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from '../vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from '../vendor/addons/postprocessing/OutputPass.js';
import {ShaderPass} from '../vendor/addons/postprocessing/ShaderPass.js';
import {Reflector} from '../vendor/addons/objects/Reflector.js';

// Real surface maps, authored architecture, and an actual reflected 3D courtyard.
// The projection puzzles and their coordinates remain owned by scene.js.
const TAU=Math.PI*2;
function random(seed=712){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

export function createMaterials(stage){
  const loader=new THREE.TextureLoader(),promises=[],cache=new Map();
  const load=(name,map,repeat=[1,1])=>{
    const key=`${name}/${map}/${repeat}`;
    if(cache.has(key))return cache.get(key);
    let resolve;promises.push(new Promise(r=>resolve=r));
    const t=loader.load(`./assets/materials/${name}/${map}.jpg`,()=>resolve(true),undefined,()=>resolve(false));
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,stage.renderer.capabilities.getMaxAnisotropy());
    t.colorSpace=map==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;cache.set(key,t);return t;
  };
  const woodMaps={map:load('wood','color'),normalMap:load('wood','normal'),roughnessMap:load('wood','roughness')};
  const wood=new THREE.MeshPhysicalMaterial({...woodMaps,color:0xbca58a,roughness:.88,normalScale:new THREE.Vector2(.55,.55),clearcoat:.12,clearcoatRoughness:.45});
  const redWood=new THREE.MeshPhysicalMaterial({...woodMaps,color:0x8d4933,roughness:.8,normalScale:new THREE.Vector2(.45,.45),clearcoat:.22,clearcoatRoughness:.4});
  const darkWood=new THREE.MeshStandardMaterial({...woodMaps,color:0x7b7060,roughness:.95,normalScale:new THREE.Vector2(.6,.6)});
  const stoneMaps={map:load('stone','color'),normalMap:load('stone','normal'),roughnessMap:load('stone','roughness')};
  const stone=new THREE.MeshStandardMaterial({...stoneMaps,color:0x8a9190,normalScale:new THREE.Vector2(.7,.7),roughness:.96});
  const tiles=new THREE.MeshStandardMaterial({...stoneMaps,color:0x516263,roughness:.68,normalScale:new THREE.Vector2(.22,.22)});
  const brass=new THREE.MeshStandardMaterial({color:0x8e6b36,metalness:.72,roughness:.47,normalMap:load('linen','normal',[2,2]),normalScale:new THREE.Vector2(.08,.08)});
  const gold=new THREE.MeshStandardMaterial({color:0xab874a,metalness:.65,roughness:.48});
  const fabric=new THREE.MeshPhysicalMaterial({color:0x58251c,roughness:1,normalMap:load('linen','normal',[3,13]),roughnessMap:load('linen','roughness',[3,13]),normalScale:new THREE.Vector2(.4,.4),sheen:1,sheenColor:new THREE.Color(0xa65032),sheenRoughness:.7,side:THREE.DoubleSide});
  const clothNormal=load('linen','normal',[9,5]);
  const floor=new THREE.MeshPhysicalMaterial({map:load('stone','color',[28,28]),normalMap:load('stone','normal',[28,28]),roughnessMap:load('stone','roughness',[28,28]),color:0x77847e,roughness:.66,normalScale:new THREE.Vector2(.65,.65),clearcoat:.5,clearcoatRoughness:.24});
  return {wood,redWood,darkWood,stone,tiles,brass,gold,fabric,clothNormal,floor,ready:Promise.all(promises),cache};
}

export function createLighting(stage){
  const {scene,renderer}=stage;
  scene.background=new THREE.Color(0x17262b);scene.fog=new THREE.FogExp2(0x17262b,.035);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  scene.add(new THREE.HemisphereLight(0x8ca8b9,0x211b15,.75));
  const moon=new THREE.DirectionalLight(0xa9c6e0,3.1);moon.position.set(-9,16,3);moon.castShadow=true;
  moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-13,right:13,top:14,bottom:-9,near:1,far:45});
  moon.shadow.normalBias=.035;moon.shadow.bias=-.00015;moon.shadow.radius=3;scene.add(moon);
  const warm=new THREE.SpotLight(0xffc179,420,35,Math.PI*.32,.9,2);warm.position.set(1,8,8);warm.target.position.set(0,3,-1);
  warm.castShadow=true;warm.shadow.mapSize.set(2048,2048);warm.shadow.normalBias=.025;warm.shadow.bias=-.0002;warm.shadow.radius=3;scene.add(warm,warm.target);
  const fill=new THREE.DirectionalLight(0x9fbbcc,.65);fill.position.set(7,4,-9);scene.add(fill);
  for(const x of [-4.75,4.75]){const lantern=new THREE.PointLight(0xffa74f,40,8,2);lantern.position.set(x,5.9,.95);scene.add(lantern);}
  const rear=new THREE.PointLight(0xffc17b,55,12,2);rear.position.set(0,5.8,-4.1);scene.add(rear);
  // A small local environment supplies non-flat metal and varnish highlights.
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x263640);
  const panel=(color,intensity,x,y,z,w,h)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);environment.add(m);};
  panel(0xabc7e4,2,-5,6,2,5,7);panel(0xffb463,4,4,1,3,3,5);panel(0xffd49d,3,0,0,-6,8,4);
  const pmrem=new THREE.PMREMGenerator(renderer);stage.environmentTarget=pmrem.fromScene(environment,.06,.1,30);scene.environment=stage.environmentTarget.texture;scene.environmentIntensity=.48;pmrem.dispose();
  environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  stage.moonLight=moon;stage.warmLight=warm;
}

export function buildArchitecture(stage){
  const {root,materials:m}=stage,staticMeshes=[];
  const add=(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=o.receiveShadow=true;root.add(o);staticMeshes.push(o);return o;
  };
  const box=(w,h,d,x,y,z,mat=m.wood,r=.025)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),mat,x,y,z);
  const column=(r1,r2,h,x,y,z,mat=m.wood)=>add(new THREE.CylinderGeometry(r1,r2,h,32),mat,x,y,z);
  const rod=(points,r=.025,mat=m.gold)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(new THREE.TubeGeometry(curve,Math.max(8,points.length*6),r,6,false),mat);};
  // A cut-stone foundation supports individually bevelled timber boards.
  box(12.7,.78,8.1,0,-.05,-1.8,m.stone,.1);
  box(13.05,.15,8.3,0,.27,-1.8,m.darkWood,.04);
  for(let i=0;i<18;i++){const plank=box(.68,.13,7.95,-6.1+i*.718,.39,-1.8,m.wood,.018);plank.geometry.attributes.uv.array.forEach((_,k,a)=>{if(k%2===0)a[k]*=3.5;});}
  for(let step=0;step<3;step++)box(10.7-step*.65,.2,.75,0,.22-step*.24,2.55+step*.6,m.stone,.05);
  for(const x of [-5.48,5.48])for(const z of [.12,-4.1]){
    box(.86,.22,.86,x,.55,z,m.stone,.05);column(.36,.43,.22,x,.75,z,m.stone);
    column(.26,.34,.18,x,.94,z,m.stone);column(.23,.29,.22,x,1.09,z,m.darkWood);
    column(.205,.25,5.47,x,3.88,z,m.redWood);
    for(const y of [1.25,1.34,6.52,6.64])column(.247,.247,.055,x,y,z,m.brass);
    box(.6,.3,.63,x,6.65,z,m.darkWood,.04);
    for(let i=0;i<3;i++)box(.64+i*.25,.14,.7+i*.16,x,6.85+i*.15,z,m.redWood,.035);
  }
  for(const z of [.08,-4.12]){
    box(11.7,.33,.43,0,6.65,z,m.redWood,.04);box(12.2,.2,.74,0,7.11,z,m.darkWood,.04);
    for(const x of [-4.5,-2.8,-1.1,1.1,2.8,4.5]){
      // Bracket sets, carved volutes and notched cross-beams under the roof.
      for(let j=0;j<3;j++)box(.55+j*.26,.13,.5+j*.25,x,6.82+j*.15,z,m.wood,.03);
      for(const sign of [-1,1])rod([[x,6.6,z+.26],[x+sign*.22,6.37,z+.26],[x+sign*.51,6.27,z+.26],[x+sign*.7,6.39,z+.26],[x+sign*.54,6.5,z+.26]],.035,m.darkWood);
    }
  }
  for(const x of [-5.48,5.48]){
    box(.24,.3,4.5,x,6.77,-2,m.darkWood);box(.1,.14,4.5,x,6.48,-2,m.gold,.015);
    for(const z of [-.3,-3.65]){const b=box(.17,1.7,.17,x,6.02,z,m.redWood);b.rotation.x=z> -1?-.72:.72;}
  }
  // Tiled double-pitched roof, curved at the eaves and hips.
  const roofHeight=(x,t)=>8.55-1.9*t+.57*t**4+.22*(Math.abs(x)/6.5)**6;
  const roofGeo=(side)=>{const v=[],uv=[],idx=[],nx=48,nz=16;for(let j=0;j<=nz;j++){const t=j/nz,span=4.8+1.6*t;for(let i=0;i<=nx;i++){const x=(i/nx*2-1)*span;v.push(x,roofHeight(x,t),-1.7+side*t*3.25);uv.push(i/nx*7,t*4);}}for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(side>0?idx:idx.reverse());g.computeVertexNormals();return g;};
  const tileMaterial=m.tiles.clone();tileMaterial.side=THREE.DoubleSide;
  for(const side of [-1,1])add(roofGeo(side),tileMaterial);
  const tileVertices=[],tileUV=[],tileIndices=[];
  for(let j=0;j<=2;j++)for(let i=0;i<=10;i++){const a=i/10*Math.PI;tileVertices.push(-Math.cos(a)*.12,Math.sin(a)*.075,(j/2-.5)*.35);tileUV.push(i/10,j/2);}
  for(let j=0;j<2;j++)for(let i=0;i<10;i++){const a=j*11+i;tileIndices.push(a,a+11,a+1,a+1,a+11,a+12);}
  const tileGeo=new THREE.BufferGeometry();tileGeo.setAttribute('position',new THREE.Float32BufferAttribute(tileVertices,3));tileGeo.setAttribute('uv',new THREE.Float32BufferAttribute(tileUV,2));tileGeo.setIndex(tileIndices);tileGeo.computeVertexNormals();
  const matrices=[],rng=random(241),dummy=new THREE.Object3D();
  for(const side of [-1,1])for(let row=0;row<17;row++){
    const t=(row+.5)/17,span=4.8+1.6*t,count=Math.floor(span*2/.24),slope=(-1.9+2.28*t**3)/3.25;
    for(let col=0;col<count;col++){
      const x=-span+(col+.5)*2*span/count;
      dummy.position.set(x,roofHeight(x,t)+.075,-1.7+side*t*3.25);
      dummy.rotation.set(-side*Math.atan(slope),0,0);dummy.scale.set(1,.92+rng()*.16,1);dummy.updateMatrix();matrices.push(dummy.matrix.clone());
    }
  }
  const roofTiles=new THREE.InstancedMesh(tileGeo,tileMaterial,matrices.length);matrices.forEach((mat,i)=>{roofTiles.setMatrixAt(i,mat);roofTiles.setColorAt(i,new THREE.Color().setHSL(.47+rng()*.04,.07+rng()*.08,.65+rng()*.3));});roofTiles.castShadow=roofTiles.receiveShadow=true;root.add(roofTiles);
  // Caps conceal seams; miniature ridge ornaments add a recognisable roof silhouette.
  const ridge=column(.17,.17,9.9,0,8.63,-1.7,m.tiles);ridge.rotation.z=Math.PI/2;
  for(const side of [-1,1]){
    const pts=[];for(let i=0;i<=24;i++){const x=-6.4+i/24*12.8;pts.push([x,roofHeight(x,1),-1.7+side*3.25]);}rod(pts,.08,m.tiles);
  }
  for(const x of [-4.85,4.85])rod([[x,8.6,-1.7],[x+Math.sign(x)*.16,8.91,-1.7],[x+Math.sign(x)*.10,9.12,-1.7],[x-Math.sign(x)*.1,9.01,-1.7]],.085,m.tiles);
  // Inset lattice screens in the side wings and a carved apron at the stage lip.
  for(const side of [-1,1]){
    const x=side*5.82;box(.18,3.1,3.4,x,3.4,-2,m.darkWood);
    for(let i=0;i<11;i++)box(.2,2.75,.035,x,3.4,-3.55+i*.3,m.brass,.008);
    for(let i=0;i<6;i++)box(.21,.035,3.22,x,2.04+i*.54,-2,m.brass,.008);
    box(.65,.15,2.3,side*4.55,1.45,-3,m.wood);
    for(const z of [-3.9,-2.1]){box(.14,1.06,.14,side*4.55,.88,z,m.darkWood);box(.56,.1,.12,side*4.55,.72,z,m.wood);}
  }
  box(12.4,.48,.16,0,.03,2.27,m.darkWood);
  for(let x=-5.8;x<5.9;x+=.48){const q=add(new THREE.TorusGeometry(.135,.021,6,16),m.brass,x,.035,2.37);q.scale.y=.7;}
  box(10.45,.13,.2,0,.63,.05,m.wood);
  for(const x of [-5.2,5.2])box(.095,5.75,.15,x,3.5,.015,m.darkWood,.018);
  // Bake static pieces by material; fine detail does not require hundreds of draw calls.
  const batches=new Map();for(const o of staticMeshes){o.updateMatrix();let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(o.matrix);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);root.remove(o);o.geometry.dispose();}
  for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  stage.detailInstances=matrices.length;
}

export function createCourtyard(stage){
  const {scene,materials:m}=stage,rng=random(918),dummy=new THREE.Object3D();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),m.floor);ground.rotation.x=-Math.PI/2;ground.position.y=-.48;ground.receiveShadow=true;scene.add(ground);
  for(const map of [m.floor.map,m.floor.normalMap,m.floor.roughnessMap])map.repeat.set(64,64);
  // Reflections contain the live stage, animated lanterns and moving puppets.
  const shader={...Reflector.ReflectorShader,
    uniforms:{...Reflector.ReflectorShader.uniforms,normalMap:{value:m.floor.normalMap},roughnessMap:{value:m.floor.roughnessMap}},
    vertexShader:Reflector.ReflectorShader.vertexShader.replace('void main()', 'varying vec2 floorUV; void main()').replace('vUv = textureMatrix','floorUV = uv * 64.0; vUv = textureMatrix'),
    fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('void main()', 'varying vec2 floorUV; uniform sampler2D normalMap; uniform sampler2D roughnessMap; void main()').replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 sampleUV = vUv; sampleUV.xy += (texture2D(normalMap, floorUV).xy - .5) * .013 * sampleUV.w; vec4 base = texture2DProj( tDiffuse, sampleUV );').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','float rough = texture2D(roughnessMap, floorUV).r; gl_FragColor = vec4(base.rgb * .82, .28 * (1.0 - rough * .48));')
  };
  const mirror=new Reflector(new THREE.PlaneGeometry(160,160),{textureWidth:768,textureHeight:512,multisample:0,clipBias:.005,color:0xffffff,shader});
  mirror.rotation.x=-Math.PI/2;mirror.position.y=-.469;mirror.material.transparent=true;mirror.material.depthWrite=false;mirror.renderOrder=1;scene.add(mirror);stage.groundReflection=mirror;
  // Low drifting haze uses a soft noise density, rather than a flat opaque plane.
  const mist=document.createElement('canvas');mist.width=256;mist.height=128;const g=mist.getContext('2d');
  for(let i=0;i<28;i++){const x=rng()*256,y=40+rng()*50,r=15+rng()*48,grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(158,180,181,.08)');grad.addColorStop(1,'rgba(158,180,181,0)');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);}
  const fogMap=stage.texture(mist);stage.mist=[];for(let i=0;i<5;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(25,3.2),new THREE.MeshBasicMaterial({map:fogMap,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,color:0x9bb5b9}));mesh.position.set((i%2?1:-1)*7,.55,-7-i*3);scene.add(mesh);stage.mist.push(mesh);}
  // Scattered leaves on the wet paving, all instanced.
  const fallen=new THREE.InstancedMesh(new THREE.PlaneGeometry(.14,.28),new THREE.MeshStandardMaterial({color:0x59452b,roughness:.9,side:THREE.DoubleSide}),100);
  for(let i=0;i<100;i++){dummy.position.set((rng()-.5)*28,-.455,(rng()-.5)*25);dummy.rotation.set(-Math.PI/2,0,rng()*TAU);dummy.scale.setScalar(.5+rng());dummy.updateMatrix();fallen.setMatrixAt(i,dummy.matrix);}scene.add(fallen);
}

export function createPostProcessing(stage){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(stage.renderer,target);composer.addPass(new RenderPass(stage.scene,stage.camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(800,600),.21,.55,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  const finish=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
      float vignette=smoothstep(.2,.85,length((vUv-.5)*vec2(1.,.8)));
      c*=1.0-vignette*.24;
      float grain=fract(sin(dot(vUv+fract(time*.037),vec2(12.9898,78.233)))*43758.5453)-.5;
      c+=grain*.006;gl_FragColor=vec4(c,1.0);
    }`});composer.addPass(finish);
  let direct=false, multisampled=true;
  return {composer,bloom,finish,
    setQuality(tier){
      if(tier>=1&&multisampled){
        const replacement=composer.renderTarget1.clone();replacement.samples=0;
        composer.reset(replacement);multisampled=false;
      }
      if(tier>=2)bloom.enabled=false;
      if(tier>=3&&!direct){
        // Emergency path retains scene lighting, ACES and sRGB, but drops screen effects.
        // Release both multisample targets AND bloom mip targets, not just their passes.
        direct=true;composer.dispose();for(const pass of composer.passes)pass.dispose();
      }
    },
    resize(width,height,pixelRatio){if(!direct){composer.setPixelRatio(pixelRatio);composer.setSize(width,height);}},
    render(dt){if(direct)stage.renderer.render(stage.scene,stage.camera);else composer.render(dt);},
    diagnostics(){return {mode:direct?'direct':'composer',samples:direct?0:composer.renderTarget1.samples,bloom:!direct&&bloom.enabled};}
  };
}
