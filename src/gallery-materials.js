import * as THREE from '../vendor/three.module.js';
import {agedSurface,interiorEnvironment} from './museum-finishes.js';
export function galleryMaterials(renderer,scene){
  const pending=[],errors=[],loader=new THREE.TextureLoader(),cache=new Map();
  function texture(url,color=false){
    if(cache.has(url))return cache.get(url);
    let done;pending.push(new Promise(resolve=>{done=resolve;}));
    const map=loader.load(url,()=>done(),undefined,()=>{errors.push(url);done();});
    map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.anisotropy=Math.min(color?16:8,renderer.capabilities.getMaxAnisotropy());
    cache.set(url,map);return map;
  }
  // Native 4K mineral scans retain pores at close range; normal maps stay 2K.
  const map=(folder,kind)=>{
    const high=['aged-plaster','aged-masonry'].includes(folder)&&kind==='color'&&renderer.capabilities.maxTextureSize>=4096;
    return texture(`./assets/materials/${folder}/${kind}${high?'-4k':''}.jpg`,kind==='color');
  };
  function surface(folder,color,roughness,normal=.25,meters=[1,1],grain=false){
    const material=new THREE.MeshStandardMaterial({color,map:map(folder,'color'),
      normalMap:map(folder,'normal'),roughnessMap:map(folder,'roughness'),
      normalScale:new THREE.Vector2(normal,normal),roughness,envMapIntensity:.45});
    material.userData.surface={meters,grain};return material;
  }
  const wood=agedSurface(surface('aged-wood','#d0ad83',.47,.20,[.65,2.4],true),.75,1.7,.09);
  const lacquer=agedSurface(surface('aged-wood','#a77c53',.43,.15,[.65,2.4],true),.7,1.6,.1);
  const wall=agedSurface(surface('aged-plaster','#e9d4b3',.98,.42,[2.5,2.5]),.18,2.7,.15,null,1);
  wall.roughnessMap=null;wall.envMapIntensity=.10;
  // The lime finish has two scales: worn plaster and fine matte mineral pores.
  // Fade unresolved relief with its pixel footprint to keep moving edges quiet.
  const wallCompile=wall.onBeforeCompile,wallKey=wall.customProgramCacheKey();
  wall.onBeforeCompile=shader=>{
    wallCompile(shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      vec2 mineralUV=vNormalMapUv*4.0+vec2(.173,.319);
      vec2 mineralFootprint=fwidth(mineralUV);
      float mineralDetail=1.-smoothstep(.004,.025,max(mineralFootprint.x,mineralFootprint.y));
      vec2 mineralNormal=texture2D(normalMap,mineralUV).xy*2.-1.;
      normal=normalize(normal+tbn*vec3(mineralNormal*.22*mineralDetail,0.));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`
      float fineChalk=dot(texture2D(map,vMapUv*4.0+vec2(.173,.319)).rgb,vec3(.2126,.7152,.0722));
      diffuseColor.rgb*=.92+.16*smoothstep(.025,.16,fineChalk);
      #include <alphamap_fragment>
    `);
  };
  wall.customProgramCacheKey=()=>wallKey+'-matte-lime-pores-v1';
  const ceiling=agedSurface(surface('aged-wood','#d9bd92',.82,.14,[.75,3.4],true),.55,1.75,.02);
  ceiling.roughnessMap=null;ceiling.roughness=.94;ceiling.envMapIntensity=.07;
  const beam=agedSurface(surface('aged-wood','#b39773',1,.17,[.65,3.0],true),.55,1.65,.03);
  beam.roughnessMap=null;beam.envMapIntensity=.04;
  // Use the scan's real worn edges, grout and relief rather than a flat grid.
  const floor=agedSurface(surface('aged-masonry','#d2c6b4',.50,.12,[4.2,4.2]),.28,2.6,.025,null,.8);
  floor.envMapIntensity=.48;
  const stone=agedSurface(surface('aged-plaster','#e1ccaa',.85,.10,[2.1,2.1]),.25,2.4,.10,null,.8);
  const tile=new THREE.MeshStandardMaterial({
    map:texture('./assets/materials/gallery-finish/floor-inlay.png',true),color:'#eee0c4',
    normalMap:map('aged-plaster','normal'),normalScale:new THREE.Vector2(.055,.055),
    roughness:.65,envMapIntensity:.4});
  tile.userData.surface={meters:[.75,.75]};
  const paintedBeam=new THREE.MeshStandardMaterial({
    map:texture('./assets/materials/gallery-finish/painted-frieze.png',true),color:'#f4e5c8',
    normalMap:map('aged-wood','normal'),normalScale:new THREE.Vector2(.07,.07),
    roughness:.57,envMapIntensity:.5});
  paintedBeam.userData.surface={meters:[.9,.3]};
  const jade=agedSurface(surface('aged-wood','#f1dfbd',.62,.13,[.65,2.4],true),.6,2.1,0,'#355f57');
  const brass=new THREE.MeshStandardMaterial({color:'#917044',metalness:.72,roughness:.42,envMapIntensity:.85});
  const glass=new THREE.MeshPhysicalMaterial({color:'#c4e1df',metalness:.15,roughness:.12,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.075,depthWrite:false,envMapIntensity:1.1,side:THREE.DoubleSide});
  const linenNormal=map('linen','normal');
  const windowMap=texture('./assets/materials/gallery-match/window-dusk.png',true);
  windowMap.wrapS=windowMap.wrapT=THREE.ClampToEdgeWrapping;
  const windowView=new THREE.MeshBasicMaterial({map:windowMap,color:'#8ca6a8'});
  const bronze=new THREE.MeshStandardMaterial({color:'#453224',roughness:.4,metalness:.78});
  const pane=document.createElement('canvas');pane.width=128;pane.height=256;
  const paint=pane.getContext('2d'),glow=paint.createRadialGradient(64,124,8,64,124,154);
  glow.addColorStop(0,'#fffbe7');glow.addColorStop(.26,'#fff0c6');glow.addColorStop(.66,'#f4c47a');glow.addColorStop(1,'#ac7139');
  paint.fillStyle=glow;paint.fillRect(0,0,128,256);
  paint.strokeStyle='#fff6d43a';paint.lineWidth=2;
  for(const x of [8,119]){paint.beginPath();paint.moveTo(x,16);paint.lineTo(x,235);paint.stroke();}
  const paneMap=new THREE.CanvasTexture(pane);paneMap.colorSpace=THREE.SRGBColorSpace;paneMap.wrapS=THREE.RepeatWrapping;paneMap.repeat.x=6;
  const lampGlass=new THREE.MeshBasicMaterial({map:paneMap,color:'#fff4df'});
  const ceramic=new THREE.MeshStandardMaterial({color:'#8caa8b',roughness:.24,metalness:.04,
    normalMap:map('aged-plaster','normal'),normalScale:new THREE.Vector2(.018,.018),envMapIntensity:1});
  const environment=interiorEnvironment(renderer,scene);
  return {wood,lacquer,wall,ceiling,beam,floor,stone,tile,paintedBeam,jade,brass,glass,linenNormal,
    windowView,bronze,lampGlass,ceramic,environment,errors,ready:Promise.all(pending)};
}
export function contactTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(15,12,8,.65)');g.addColorStop(.45,'rgba(15,12,8,.25)');g.addColorStop(1,'rgba(15,12,8,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
