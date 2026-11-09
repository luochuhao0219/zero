import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {agedSurface, interiorEnvironment} from './museum-finishes.js';

const rng = (seed = 23) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
function painted(size, paint) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

// The same weathered stone, dark timber and warm lamps as the campus entrance.
// Architectural detail is merged by material and by room, not drawn per brick.
export class MuseumArchitecture {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer; this.pending = []; this.errors = [];
    this.zones = []; this.lamps = []; this.staticGroups = []; this.doors = [];
    const loader = new THREE.TextureLoader(), cache = new Map();
    const load = (name, kind, extension = 'jpg') => {
      const key = name + '/' + kind;
      if (cache.has(key)) return cache.get(key);
      let done; this.pending.push(new Promise(resolve => { done = resolve; }));
      const url = './assets/materials/' + key + '.' + extension;
      const map = loader.load(url, () => done(), undefined, () => { this.errors.push(url); done(); });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.colorSpace = kind.startsWith('color') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy()); cache.set(key, map); return map;
    };
    const scanned = (name, normalScale, detail = '') => ({map: load(name, 'color'+detail), normalMap: load(name, 'normal'+detail), roughnessMap: load(name, 'roughness'), aoMap: load(name, 'ao'), aoMapIntensity: .55, normalScale: new THREE.Vector2(normalScale, normalScale)});
    const plaster = scanned('aged-plaster', .58, '-4k'), masonry = scanned('aged-masonry', .7, '-4k'), wood = scanned('aged-wood', .55);
    let courtyardReady; this.pending.push(new Promise(resolve => { courtyardReady = resolve; }));
    const courtyard = loader.load('./assets/passage/campus-entrance.png', () => courtyardReady(), undefined, () => { this.errors.push('campus window texture'); courtyardReady(); });
    courtyard.colorSpace = THREE.SRGBColorSpace; courtyard.wrapS = courtyard.wrapT = THREE.RepeatWrapping;
    const stone = {map: load('stone', 'color'), normalMap: load('stone', 'normal'), roughnessMap: load('stone', 'roughness'), normalScale: new THREE.Vector2(.38, .38)};
    const paper = painted(512, (ctx, size) => {
      const light = ctx.createRadialGradient(size / 2, size * .47, 10, size / 2, size * .5, size * .7);
      light.addColorStop(0, '#ffedc8'); light.addColorStop(.45, '#d6b17a'); light.addColorStop(1, '#695139');
      ctx.fillStyle = light; ctx.fillRect(0, 0, size, size);
      const random = rng(71);
      for (let i = 0; i < 7000; i++) { ctx.fillStyle = i % 2 ? '#80572b0c' : '#fff9dc12'; ctx.fillRect(random() * size, random() * size, 1, 3); }
      ctx.strokeStyle = '#92522518'; for (let x = 0; x < size; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
    });
    this.m = {
      wall: agedSurface(new THREE.MeshStandardMaterial({...plaster, roughness: 1, color: '#c4d8d4'}), .3, 2.8, .18),
      masonry: agedSurface(new THREE.MeshStandardMaterial({...masonry, displacementMap: load('aged-masonry', 'height'), displacementScale: .045, displacementBias: -.0225, roughness: .96, color: '#cedfe0'}), .32, 3.7, .2),
      stone: agedSurface(new THREE.MeshStandardMaterial({...stone, color: '#d9e0cb', roughness: .95}), .45, 1.4, .12),
      floor: agedSurface(new THREE.MeshPhysicalMaterial({...masonry, normalScale: new THREE.Vector2(.48,.48), color: '#bfd7d9', roughness: .83, clearcoat: .15, clearcoatRoughness: .56}), .12, 2.8),
      cutStone: agedSurface(new THREE.MeshStandardMaterial({...plaster, color: '#dfd9c8', roughness: .94}), .24, 2.3, .15),
      wood: agedSurface(new THREE.MeshPhysicalMaterial({...wood, color: '#f6d9b5', roughness: .83, clearcoat: .1, clearcoatRoughness: .58}), 1, 2.5, .1),
      darkWood: agedSurface(new THREE.MeshPhysicalMaterial({...wood, color: '#dfbf9a', roughness: .9, clearcoat: .06, clearcoatRoughness: .65}), .95, 2.1, .15),
      redWood: agedSurface(new THREE.MeshPhysicalMaterial({...wood, roughness: .86, clearcoat: .1, clearcoatRoughness: .58}), 1, 2, .16, '#743628'),
      jadeWood: agedSurface(new THREE.MeshPhysicalMaterial({...wood, roughness: .9, clearcoat: .06, clearcoatRoughness: .65}), .8, 1.8, .16, '#2c5755'),
      brass: new THREE.MeshStandardMaterial({color: '#b99a56', roughness: .53, metalness: .75}),
      iron: new THREE.MeshPhysicalMaterial({color: '#11130f', roughness: .96, metalness: .05, specularIntensity: .1}),
      ceiling: agedSurface(new THREE.MeshStandardMaterial({...wood, color: '#cfb69b', roughness: 1}), .85, 1.5),
      cloth: new THREE.MeshStandardMaterial({color: '#843e2d', normalMap: load('linen','normal'), roughnessMap: load('linen','roughness'), normalScale: new THREE.Vector2(.22,.22), roughness: .98, side: THREE.DoubleSide}),
      paper: new THREE.MeshStandardMaterial({map: paper, color: '#fff0d1', emissive: '#ffdcaa', emissiveMap: paper, emissiveIntensity: .85, roughness: .92}),
      glass: new THREE.MeshBasicMaterial({color: '#405965', transparent: true, opacity: .17, depthWrite: false}),
      doorGlass: new THREE.MeshPhysicalMaterial({color: '#a8b4b1', roughness: .36, metalness: 0, clearcoat: .1, clearcoatRoughness: .5, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide}),
      window: new THREE.MeshBasicMaterial({map: courtyard, color: '#8aafba'}),
    };
    this.contactMap = painted(64, (ctx, size) => {
      const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
      g.addColorStop(0, '#000000b8'); g.addColorStop(.45, '#00000070'); g.addColorStop(1, '#00000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    });
    // Fine mortar joints already outline the curved trim; avoid self-shadow
    // aliasing on these thin edges in the cached architectural shadow map.
    this.m.cutStone.userData.noShadow = true;
    this.m.archWood = agedSurface(this.m.redWood.clone(), 1, 2, .16, '#743628');
    this.m.archWood.userData.noShadow = true;
    for (const name of ['wood','darkWood','redWood','jadeWood','archWood','ceiling']) this.m[name].userData.timber = true;
    this.glowMap = painted(64, (ctx, size) => {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, '#ffc66d22'); g.addColorStop(.16, '#ffbf6510'); g.addColorStop(1, '#ffab4300');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    });
    this.ready = Promise.all(this.pending);
    this.light(scene);
    this.environmentTarget = interiorEnvironment(renderer, scene);
  }
  light(scene) {
    scene.background = new THREE.Color('#122930'); scene.fog = new THREE.Fog('#1e3436', 48, 115);
    scene.add(new THREE.HemisphereLight('#91b4c3', '#5e5848', 1.55));
    const fill = new THREE.DirectionalLight('#9bb8c1', .36); fill.position.set(-8, 4, 12); scene.add(fill);
    this.key = new THREE.DirectionalLight('#a4c8db', .92);
    this.key.position.set(8, 7.5, 18); this.key.target.position.set(-5, 1, -3);
    this.key.castShadow = true; this.key.shadow.mapSize.set(4096, 4096);
    Object.assign(this.key.shadow.camera, {left: -18, right: 18, top: 16, bottom: -15, near: .5, far: 65});
    this.key.shadow.normalBias = .025; this.key.shadow.bias = -.00015;
    scene.add(this.key, this.key.target);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.localLights = Array.from({length: 4}, () => { const light = new THREE.PointLight('#ffc078', 42, 18, 2); scene.add(light); return light; });
    // Window-shaped light falls across the real stone normals. These two fixed
    // sources retain their position throughout the camera move; no light jumps
    // between windows, and no extra shadow-map or blur pass is needed.
    const panes = painted(512,(ctx,size) => {
      ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);
      const edge=ctx.createRadialGradient(size*.5,size*.5,50,size*.5,size*.5,size*.48);
      edge.addColorStop(0,'#fff');edge.addColorStop(.65,'#bfc6c9');edge.addColorStop(1,'#000');ctx.fillStyle=edge;
      for(let col=0;col<3;col++) for(let row=0;row<4;row++) ctx.fillRect(96+col*108,48+row*106,94,94);
    });
    panes.colorSpace=THREE.NoColorSpace;panes.wrapS=panes.wrapT=THREE.ClampToEdgeWrapping;
    for (const [x,z,targetX,targetZ,power] of [[-10.7,4,-2.5,.5,260],[-16.05,-14,-8.4,-17.5,200]]) {
      const light=new THREE.SpotLight('#9bc5d2',power,28,.55,.42,2);
      light.position.set(x,5.5,z);light.target.position.set(targetX,0,targetZ);light.map=panes;
      scene.add(light,light.target);
    }
  }
  zone(z, depth = 22) {
    const group = new THREE.Group(); this.scene.add(group);
    const zone = {group, z, depth, meshes: []}; this.zones.push(zone); this.active = zone; return group;
  }
  add(geometry, material, x, y, z, rotation = [0, 0, 0], parent = this.active.group) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = !material.transparent && material !== this.m.paper;
    parent.add(mesh);
    if (parent === this.active.group && !material.transparent) this.active.meshes.push(mesh);
    return mesh;
  }
  box(w, h, d, x, y, z, material = this.m.wood, radius = .025, parent) {
    const geo = new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 4, h / 4, d / 4));
    // Preserve metre-scale texture grain on beams, plaster and stone.
    const uv = geo.attributes.uv, position = geo.attributes.position, normal = geo.attributes.normal;
    const isWood = material.userData.timber;
    const repeat = material === this.m.floor ? 4.2 : isWood ? .7 : 2.5;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i));
      let u = nx > .7 ? position.getZ(i) : position.getX(i), v = ny > .7 ? position.getZ(i) : position.getY(i);
      if (isWood && w > h && w > d) [u,v] = [v,u];
      if (isWood && d > w && d > h) [u,v] = [position.getY(i),position.getZ(i)];
      uv.setXY(i, (u + (material === this.m.floor ? x : x * .37)) / repeat, (v + (material === this.m.floor ? z : y * .71)) / repeat);
    }
    return this.add(geo, material, x, y, z, [0, 0, 0], parent);
  }
  arch(x, z, radius, spring, material = this.m.stone, depth = .6) {
    if (material === this.m.stone || material === this.m.cutStone) {
      const r = radius + .42, top = Math.max(8.8 - spring, r + .12), cap = new THREE.Shape();
      cap.moveTo(-r, top); cap.lineTo(r, top); cap.lineTo(r, 0);
      cap.absarc(0, 0, r, 0, Math.PI, false); cap.closePath();
      this.add(new THREE.ExtrudeGeometry(cap, {depth: depth * .8, bevelEnabled: false, curveSegments: 24}), this.m.wall, x, spring, z - depth * .4);
    }
    for (const side of [-1, 1]) {
      this.box(.42, spring, depth, x + side * (radius + .21), spring / 2, z, material, .035);
      this.box(.68, .23, depth + .25, x + side * (radius + .21), .14, z, this.m.stone, .045);
      this.box(.58, .18, depth + .12, x + side * (radius + .21), spring - .09, z, material);
    }
    for (let i = 0; i < 15; i++) {
      const a = i * Math.PI / 15 + .0015, b = (i + 1) * Math.PI / 15 - .0015;
      const shape = new THREE.Shape();
      // Explicit ring points avoid tiny duplicate edges at arc/line joins.
      for (let step = 0; step <= 5; step++) {
        const angle = a + (b - a) * step / 5;
        shape[step === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * (radius + .42), Math.sin(angle) * (radius + .42));
      }
      for (let step = 5; step >= 0; step--) {
        const angle = a + (b - a) * step / 5;
        shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false, steps: 1, curveSegments: 3});
      const uv = geo.attributes.uv;
      const scale = material === this.m.archWood ? .7 : 2.5;
      for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) / scale, uv.getY(v) / scale);
      this.add(geo, material, x, spring, z - depth / 2);
    }
    if (material === this.m.cutStone) {
      this.add(new THREE.TorusGeometry(radius + .43, .032, 6, 64, Math.PI), material, x, spring, z + depth / 2 + .025);
      this.box(.48, .57, depth + .12, x, spring + radius + .23, z + .04, material, .035);
      for (const side of [-1,1]) for (let y = .65; y < spring - .2; y += .68) this.box(.43, .018, depth + .012, x + side * (radius + .21), y, z, this.m.wall, .004);
    }
  }
  masonryFace(x, y, z, width, height) {
    const geometry = new THREE.PlaneGeometry(width, height, Math.ceil(width / .12), Math.ceil(height / .12));
    const p = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (p.getX(i) + x) / 4.2, (p.getY(i) + y) / 4.2);
    }
    this.add(geometry, this.m.masonry, x, y, z);
  }
  lantern(x, y, z, size = 1) {
    this.lamps.push(new THREE.Vector3(x, y, z));
    this.box(.025, Math.max(.2, 8.35 - y), .025, x, (8.35 + y) / 2, z, this.m.iron, .005);
    // Individual frosted panes, each lit from its centre. Their tapered iron
    // ribs follow the glass edges rather than floating around a luminous tube.
    for (let face = 0; face < 6; face++) {
      const a = face * Math.PI / 3, b = (face + 1) * Math.PI / 3;
      const vertices = [Math.sin(a)*.28,-.35,Math.cos(a)*.28, Math.sin(b)*.28,-.35,Math.cos(b)*.28,
        Math.sin(b)*.35,.35,Math.cos(b)*.35, Math.sin(a)*.35,.35,Math.cos(a)*.35].map(v => v * size);
      const pane = new THREE.BufferGeometry(); pane.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      pane.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2)); pane.setIndex([0,1,2,0,2,3]); pane.computeVertexNormals();
      this.add(pane,this.m.paper,x,y,z);
      const start = new THREE.Vector3(Math.sin(a)*.28*size,-.39*size,Math.cos(a)*.28*size);
      const end = new THREE.Vector3(Math.sin(a)*.35*size,.39*size,Math.cos(a)*.35*size), delta = end.clone().sub(start);
      const middle = start.clone().add(end).multiplyScalar(.5);
      const rib = this.add(new THREE.CylinderGeometry(.014*size,.014*size,delta.length(),5),this.m.iron,x+middle.x,y+middle.y,z+middle.z);
      rib.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    }
    for (const side of [-1, 1]) this.add(new THREE.CylinderGeometry(.4 * size, .4 * size, .09 * size, 6), this.m.iron, x, y + side * .39 * size, z);
    this.add(new THREE.CylinderGeometry(.1 * size, .44 * size, .23 * size, 6), this.m.iron, x, y + .53 * size, z);
    this.add(new THREE.CylinderGeometry(.28 * size, .09 * size, .18 * size, 6), this.m.iron, x, y - .51 * size, z);
    this.add(new THREE.TorusGeometry(.085 * size, .018 * size, 5, 12), this.m.brass, x, y + .71 * size, z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({map: this.glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    glow.position.set(x, y, z); glow.scale.setScalar(1.8 * size); this.active.group.add(glow);
  }
  shadow(x, z, width, depth, opacity = .65, y = .018) {
    const mat = new THREE.MeshBasicMaterial({map: this.contactMap, transparent: true, depthWrite: false, opacity});
    this.add(new THREE.PlaneGeometry(width, depth), mat, x, y, z, [-Math.PI / 2, 0, 0]);
  }
  window(x, z, side, width = 3, height = 4.8) {
    const y = 3.8;
    this.box(.12, height + .4, width + .4, x, y, z, this.m.stone);
    this.box(.15, height, width, x - side * .1, y, z, this.m.window, .01);
    for (const dz of [-width / 2, width / 2]) this.box(.24, height + .3, .15, x - side * .19, y, z + dz, this.m.redWood);
    for (const dy of [-height / 2, 0, height / 2]) this.box(.24, .12, width, x - side * .19, y + dy, z, this.m.redWood);
    for (const dz of [-width / 4, 0, width / 4]) this.box(.23, height, .055, x - side * .19, y, z + dz, this.m.wood, .01);
    for (const dy of [height / 2 - .5, height / 2 - 1.0]) this.box(.24, .055, width, x - side * .19, y + dy, z, this.m.wood, .01);
    this.box(.5, .18, width + .6, x - side * .15, y - height / 2, z, this.m.stone, .04);
  }
  bench(x, z, side) {
    this.box(.85, .14, 3.6, x, .95, z, this.m.wood, .035);
    for (const dz of [-1.4, 1.4]) { this.box(.13, .92, .15, x - .27, .46, z + dz, this.m.darkWood); this.box(.13, .92, .15, x + .27, .46, z + dz, this.m.darkWood); }
    this.box(.1, .12, 3, x, .43, z, this.m.wood);
    this.shadow(x, z, 1.7, 4.2);
  }
  timberDoor(x, side) {
    const m = this.m, leaf = new THREE.Group(), cx = -side * .95;
    leaf.position.set(x + side * 2.4, 0, -.35); leaf.rotation.y = -side * .92;
    this.active.group.add(leaf); this.staticGroups.push(leaf);
    // Mortise-and-tenon frame: the boards sit behind the rails, with actual
    // shadowed rebates. The upper glazing has no opaque backing plane.
    for (const dx of [-.85,.85]) this.box(.2,4.2,.23,cx+dx,2.15,0,m.redWood,.013,leaf);
    for (const [y,h] of [[.17,.24],[1.4,.18],[2.5,.2],[4.12,.26]]) this.box(1.54,h,.24,cx,y,0,m.redWood,.014,leaf);
    for (const [y,h] of [[.78,1.0],[1.95,.88]]) {
      for (let board = 0; board < 3; board++) {
        const px = cx + (board - 1) * .48;
        this.box(.476,h,.09,px,y,-.055,m.wood,.008,leaf);
        // A slight bow in each old board changes the grazing light while the
        // shared material and batch keep the doorway cheap to render.
        const geometry = new THREE.PlaneGeometry(.476,h,5,10), p = geometry.attributes.position, uv = geometry.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) / .476 + .5, v = p.getY(i) / h + .5;
          p.setZ(i, Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (.008 + board * .003));
          uv.setXY(i, (p.getX(i) + px * .61) / .7, (p.getY(i) + y * .71) / .7);
        }
        geometry.computeVertexNormals(); this.add(geometry,m.wood,px,y,-.008,[0,0,0],leaf);
      }
      // Three shallow moulding steps, instead of a raised flat panel.
      for (const [inset,thickness,depth] of [[0,.065,.14],[.047,.027,.085]]) {
        for (const dx of [-1,1]) this.box(thickness,h+.065-inset*2,depth,cx+dx*(.755-inset),y,.025,m.darkWood,.008,leaf);
        for (const dy of [-1,1]) this.box(1.51-inset*2,thickness,depth,cx,y+dy*(h/2+.015-inset),.025,m.darkWood,.008,leaf);
      }
    }
    for (const dx of [-.385,.385]) for (let row = 0; row < 3; row++) {
      this.add(new THREE.PlaneGeometry(.73,.46),m.doorGlass,cx+dx,2.85+row*.49,-.015,[0,0,0],leaf);
    }
    this.box(.055,1.49,.17,cx,3.31,.01,m.jadeWood,.009,leaf);
    for (const y of [2.605,3.095,3.585,4.04]) this.box(1.53,.045,.17,cx,y,.01,m.jadeWood,.008,leaf);
    for (const y of [.52,2.1,3.76]) {
      this.box(.15,.32,.045,-side*.12,y,.13,m.iron,.015,leaf);
      for (const dy of [-.10,.10]) this.add(new THREE.SphereGeometry(.023,8,6),m.iron,-side*.12,y+dy,.16,[0,0,0],leaf);
    }
    this.box(.16,.3,.035,cx-side*.69,1.9,.14,m.brass,.015,leaf);
    this.add(new THREE.TorusGeometry(.115,.021,6,18),m.brass,cx-side*.69,1.86,.2,[0,0,0],leaf);
  }
  transom(x) {
    const r = 2.43, spring = 4.16;
    this.box(r*2,.12,.21,x,spring,-.22,this.m.redWood,.012);
    for (const dx of [-1.8,-1.2,-.6,0,.6,1.2,1.8]) {
      const height = Math.sqrt(r*r-dx*dx);
      this.box(.048,height,.12,x+dx,spring+height/2,-.22,this.m.jadeWood,.008);
    }
    for (const dy of [.62,1.24,1.86]) {
      const width = 2*Math.sqrt(r*r-dy*dy);
      this.box(width,.045,.12,x,spring+dy,-.22,this.m.jadeWood,.008);
    }
  }
  frieze(x,y,z,width) {
    const m = this.m;
    this.box(width,.27,.18,x,y,z,m.jadeWood,.012);
    for (const side of [-1,1]) {
      this.box(width+.08,.055,.22,x,y+side*.175,z,m.redWood,.008);
      this.box(width-.12,.012,.012,x,y+side*.1,z+.098,m.brass,.002);
    }
    for (let dx = -width/2+.4; dx < width/2-.2; dx += .72) {
      this.add(new THREE.RingGeometry(.053,.067,4),m.brass,x+dx,y,z+.1,[0,0,Math.PI/4]);
    }
  }
  anteroom() {
    const m = this.m;
    this.box(10,.2,13,4.4,-.13,-7,m.floor);
    this.box(10,.2,13,4.4,8.15,-7,m.ceiling);
    this.box(10,8.2,.3,4.4,4,-13.5,m.wall);
    for (const x of [-.6,9.4]) {
      this.box(.3,8.2,13,x,4,-7,m.wall);
      this.box(.34,1.25,13,x, .625,-7,m.jadeWood);
      this.box(.39,.1,13,x,1.3,-7,m.redWood);
    }
    for (const z of [-3,-7.8,-12.5]) {
      this.box(9.9,.33,.35,4.4,7.7,z,m.redWood);
      for (const x of [.05,8.75]) this.box(.22,7.5,.25,x,3.75,z,m.redWood);
    }
    for (const x of [.2,8.6]) {
      const geo = new THREE.PlaneGeometry(1.15,5.4,28,12), p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        p.setZ(i,Math.sin(p.getX(i)*24)*.1);
        uv.setXY(i,p.getX(i)/.4,p.getY(i)/.4);
      }
      geo.computeVertexNormals(); this.add(geo,m.cloth,x,3.6,-9.6);
      this.box(1.3,.08,.15,x,6.34,-9.6,m.brass,.012);
    }
    this.frieze(4.4,7.05,-13.28,8.9);
    this.lantern(4.4,6.6,-10.5,.85);
  }
  makeHall() {
    this.zone(14, 40); const m = this.m;
    this.box(23, .2, 54, 0, -.13, 20, m.floor);
    this.box(23, .25, 54, 0, 8.9, 20, m.ceiling);
    for (const x of [-11.3, 11.3]) {
      this.box(.6, 9, 42, x, 4.4, 14, m.wall);
      this.box(.22, 1.15, 42, x - Math.sign(x) * .32, .575, 14, m.jadeWood);
      this.box(.26, .1, 42, x - Math.sign(x) * .32, 1.2, 14, m.redWood);
      for (const z of [4, 13, 23]) { this.window(x - Math.sign(x) * .36, z, Math.sign(x), 3.5); this.bench(x - Math.sign(x) * 1.1, z, Math.sign(x)); }
    }
    for (const [x, width] of [[-9.3, 3.9], [0, 3.3], [9.3, 3.9]]) this.box(width, 8.8, .65, x, 4.4, 0, m.wall);
    for (const [x, width] of [[-9.3,3.7],[0,2.65],[9.3,3.7]]) this.masonryFace(x, 3.8, .37, width, 7.6);
    this.box(22.5, 1.65, .65, 0, 8.1, 0, m.wall);
    this.masonryFace(0, 8.17, .37, 22.5, 1.42);
    for (const y of [7.42,7.56]) this.box(22.5,.07,.28,0,y,.47,m.cutStone,.018);
    this.frieze(0,8.15,.5,22.3);
    for (const x of [-4.4, 4.4]) {
      this.arch(x, .32, 2.62, 4.18, m.cutStone, .92);
      this.arch(x, -.25, 2.45, 4.16, m.archWood, .24);
      this.box(5.1, .08, 1.2, x, .02, .1, m.stone);
      for (const side of [-1,1]) this.timberDoor(x,side);
      this.transom(x);
      const trim = this.box(3.5, .045, .05, x, 7.3, .41, m.brass);
      // Hover highlights are kept out of the static batches.
      this.active.meshes.splice(this.active.meshes.indexOf(trim), 1);
      trim.material = m.brass.clone();
      const glow = new THREE.PointLight('#ffddb8', 2, 8, 2); glow.position.set(x, 4, -1.6); this.scene.add(glow);
      this.doors.push({x, trim, glow}); this.lantern(x, 5.65, -.9, .9);
      this.shadow(x, -.3, 5.3, 2.4, .35);
    }
    for (const z of [7, 15, 24, 32]) {
      this.box(22.3, .38, .45, 0, 8.45, z, m.redWood, .04);
      for (const x of [-9.5, 9.5]) {
        this.box(.46, 8.2, .46, x, 4.1, z, m.redWood, .055);
        this.box(.78, .3, .78, x, .15, z, m.stone, .06);
        this.box(.84, .24, .72, x, 8.1, z, m.jadeWood);
      }
      for (const x of [-6, -3, 0, 3, 6]) this.box(.15, .2, 8.9, x, 8.65, z - 3.5, m.wood);
    }
    // A narrow vaulted vestibule continues the photographed entrance corridor.
    for (const x of [-4.95, 4.95]) {
      this.box(.35, 8.7, 28, x, 4.3, 33, m.wall);
      this.window(x - Math.sign(x) * .2, 25, Math.sign(x), 2.8, 4.5);
      this.window(x - Math.sign(x) * .2, 37, Math.sign(x), 2.8, 4.5);
      this.box(.45, .75, 28, x - Math.sign(x) * .05, .37, 33, m.stone);
    }
    this.arch(0, 18.7, 4.55, 3.95, m.cutStone, .8);
    this.arch(0, 29, 4.55, 3.95, m.cutStone, .55);
    this.arch(0, 39, 4.55, 3.95, m.cutStone, .55);
    this.lantern(0, 6.7, 34, 1.1);
    this.lantern(0, 6.7, 23, 1.1); this.lantern(0, 7.05, 9, 1.1);
    this.box(1.3, 8.2, .28, 0, 4.1, .38, m.cutStone, .04);
    this.box(1.7, .3, .48, 0, .15, .44, m.stone, .04);
    this.box(1.75, .25, .48, 0, 7.9, .44, m.cutStone, .035);
    this.box(3.1, .12, .24, 0, 3.1, .62, m.redWood);
    this.shadow(0, .6, 4, 2, .45);
    this.anteroom();
    return this.doors;
  }
  makeGallery() {
    const m = this.m;
    for (const center of [-14, -34, -54, -74, -94]) {
      this.zone(center, 20);
      this.box(15, .2, 20, -9, -.13, center, m.floor);
      this.box(15, .25, 20, -9, 8.2, center, m.ceiling);
      for (const x of [-16.5, -1.5]) {
        this.box(.35, 8.3, 20, x, 4.05, center, m.wall);
        this.box(.2, 1.25, 20, x + (x < -9 ? .2 : -.2), .625, center, m.jadeWood);
        this.box(.24,.09,20,x+(x<-9?.2:-.2),1.3,center,m.redWood);
        this.window(x + (x < -9 ? .21 : -.21), center, x < -9 ? -1 : 1, 3.6, 4.7);
        this.bench(x + (x < -9 ? .95 : -.95), center + 3, x < -9 ? -1 : 1);
      }
      for (const z of [center - 9, center, center + 9]) {
        this.box(14.8, .37, .4, -9, 7.7, z, m.redWood, .04);
        if (z === center) this.frieze(-9,7.38,z+.24,14.3);
        for (const x of [-15.9, -2.1]) {
          this.box(.4, 7.6, .44, x, 3.8, z, m.redWood, .045);
          this.box(.7, .25, .75, x, .12, z, m.stone, .05);
          this.box(.9, .18, .64, x, 7.45, z, m.jadeWood);
        }
      }
      for (const x of [-14.5, -12, -9, -6, -3.5]) this.box(.11, .16, 20, x, 7.95, center, m.darkWood);
      this.lantern(-9, 6.8, center + 3, 1.05);
      this.box(13.6, .025, .06, -9, .006, center + 8.8, m.brass, .005);
    }
  }
  case(x, z) {
    const m = this.m;
    this.box(2.1, .95, 1.6, x, .48, z, m.darkWood, .035);
    this.box(2.2, .1, 1.7, x, .98, z, m.wood);
    this.box(1.95, 3.3, .12, x, 2.65, z - .65, m.wood);
    for (const side of [-1, 1]) this.box(.055, 3.3, 1.3, x + side * .98, 2.65, z, m.brass, .008);
    this.box(2.0, .1, 1.4, x, 4.32, z, m.darkWood);
    this.box(1.93, 3.25, .025, x, 2.66, z + .67, m.glass, .003);
    this.shadow(x, z, 3.2, 2.6);
  }
  frame(parent, width, height, x, y, z) {
    for (const side of [-1, 1]) this.box(.075, height + .12, .12, x + side * (width / 2 + .035), y, z, this.m.wood, .015, parent);
    for (const side of [-1, 1]) this.box(width + .15, .075, .12, x, y + side * (height / 2 + .035), z, this.m.wood, .015, parent);
  }
  finish() {
    for (const zone of [...this.zones, ...this.staticGroups.map(group => ({group, meshes: [...group.children].filter(object => object.isMesh)}))]) {
      const groups = new Map();
      for (const mesh of zone.meshes) {
        mesh.updateMatrix();
        const geo = mesh.geometry.clone().applyMatrix4(mesh.matrix);
        // RoundedBox and Extrude are normalized to the same attribute layout.
        const normalized = geo.index ? geo.toNonIndexed() : geo;
        for (const key of Object.keys(normalized.attributes)) if (!['position', 'normal', 'uv'].includes(key)) normalized.deleteAttribute(key);
        if (!groups.has(mesh.material)) groups.set(mesh.material, []);
        groups.get(mesh.material).push(normalized);
        mesh.removeFromParent(); mesh.geometry.dispose(); if (geo !== normalized) geo.dispose();
      }
      for (const [mat, geometries] of groups) {
        const geo = mergeGeometries(geometries, false);
        for (const part of geometries) part.dispose();
        if (!geo) continue;
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = !mat.transparent && mat !== this.m.paper && !mat.userData.noShadow; mesh.receiveShadow = !mat.transparent && mat !== this.m.paper;
        zone.group.add(mesh);
      }
      zone.meshes.length = 0;
    }
  }
  update(position, tier = 0) {
    for (const zone of this.zones) zone.group.visible = Math.abs(position.z - zone.z) < 35 + zone.depth / 2;
    const nearest = this.lamps.map(p => ({p, distance: p.distanceToSquared(position)})).sort((a, b) => a.distance - b.distance);
    this.localLights.forEach((light, i) => { if (nearest[i]) light.position.copy(nearest[i].p); });
    if (tier >= 2 && this.key.castShadow) { this.key.castShadow = false; this.renderer.shadowMap.needsUpdate = true; }
    const focus = new THREE.Vector3(position.z < 0 ? -9 : 0, 0, Math.min(8, Math.round((position.z + 5) / 4) * 4));
    if (this.key.castShadow && (!this.shadowPosition || !this.shadowPosition.equals(focus))) {
      this.shadowPosition = focus;
      this.key.position.set(focus.x + 8, 7.5, focus.z + 10);
      this.key.target.position.set(focus.x - 5, 1, focus.z - 3); this.key.target.updateMatrixWorld();
      this.renderer.shadowMap.needsUpdate = true;
    }
  }
}
