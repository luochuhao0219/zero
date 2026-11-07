import * as THREE from '../vendor/three.module.js';
import {puppetCanvas, bridgeCanvas, drawPaper} from './art.js';
import {clamp, smooth} from './route-state.js';

const mix = THREE.MathUtils.lerp;
const gold = '#caa568';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const material = color => new THREE.MeshLambertMaterial({color});

function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function panel(map, width, height, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map, side: THREE.DoubleSide, transparent: true, alphaTest: .01, ...options,
  }));
  mesh.position.set(x, y, z);
  return mesh;
}
function box(parent, width, height, depth, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function sign(parent, title, subtitle, width, x, y, z) {
  const map = texture(768, 240, (ctx, w, h) => {
    ctx.fillStyle = '#202c29'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = gold; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.textAlign = 'center'; ctx.fillStyle = '#eddbb3'; ctx.font = '52px serif';
    ctx.fillText(title, w / 2, 105); ctx.fillStyle = gold; ctx.font = '22px sans-serif';
    ctx.fillText(subtitle, w / 2, 172);
  });
  const mesh = panel(map, width, width * 240 / 768, x, y, z);
  parent.add(mesh); return mesh;
}
function line(parent, points, color = gold, opacity = .5) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({color, transparent: true, opacity}));
  parent.add(mesh); return mesh;
}

// Every pose is in the same hall / gallery coordinate system, in metres.
// Reversible, scroll-driven keyframes; repeated positions provide reading intervals.
export const MUSEUM_CAMERA = [
  [0, [0, 3.1, 12], [0, 3, 0]],
  [.045, [-4, 3.1, 7], [-4, 3, -5]],
  [.10, [-9, 3.2, -2], [-9, 3.1, -14]],
  [.135, [-10, 3.4, -5], [-12.2, 3.8, -13.5]],
  [.17, [-8, 3.2, -7], [-5.5, 3.5, -15]],
  [.19, [-9, 3.2, -8], [-9, 3.1, -17]],
  [.22, [-9, 3.2, -9], [-9, 3, -18]],
  [.28, [-9, 3.2, -20], [-9, 3, -28]],
  [.37, [-9, 3.2, -21], [-9, 3, -28]],
  [.43, [-9, 3.1, -32], [-9, 3, -47]],
  [.48, [-9, 3.1, -36], [-9, 3, -47]],
  [.60, [-9, 3.1, -36], [-9, 3, -47]],
  [.65, [-2, 3.6, -45], [-9, 3, -47]],
  [.71, [-3.5, 5.5, -63], [-9, 3, -49]],
  [.78, [-3.5, 5.5, -63], [-9, 3, -49]],
  [.84, [-9, 3.2, -61], [-9, 3.1, -80]],
  [.90, [-9, 3.2, -69], [-9, 3.1, -80]],
  [1, [-9, 3.2, -69], [-9, 3.1, -80]],
];
export function sampleCamera(keys, progress) {
  let index = keys.findIndex(key => key[0] >= progress);
  if (index <= 0) index = progress <= keys[0][0] ? 0 : keys.length - 1;
  const a = keys[Math.max(0, index - 1)], b = keys[index];
  const t = a === b ? 1 : smooth(a[0], b[0], progress);
  return {position: V(...a[1]).lerp(V(...b[1]), t), look: V(...a[2]).lerp(V(...b[2]), t)};
}

export class MuseumWorld {
  constructor() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#152322');
    this.scene.fog = new THREE.Fog('#152322', 24, 70);
    this.scene.add(new THREE.AmbientLight('#efdab0', 2.1));
    const light = new THREE.DirectionalLight('#ffe4b4', 2.4); light.position.set(4, 14, 10); this.scene.add(light);
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.lampX = -1.2; this.depth = 2; this.colored = false; this.hover = 0; this.craftVariant = 0; this.arm = 38;
    this.makeHall(); this.makeGallery(); this.makePuppet(); this.makeTheater();
    this.currentPose = this.hallPose(1); this.prepared = true;
  }
  makeHall() {
    const scene = this.scene;
    box(scene, 23, .25, 52, 0, -.2, 8, '#656557');
    box(scene, .5, 9, 30, -11, 4.3, 15, '#77776a');
    box(scene, .5, 9, 30, 11, 4.3, 15, '#77776a');
    box(scene, 23, .35, 42, 0, 8.7, 9, '#303c35');
    // Solid wall pieces surround actual openings, never a flat illustration.
    for (const [x, width] of [[-9.1, 3.8], [0, 3.2], [9.1, 3.8]]) box(scene, width, 8.5, .6, x, 4.1, 0, '#8b8877');
    box(scene, 23, 1.9, .6, 0, 7.6, 0, '#8b8877');
    this.doors = [];
    for (const [x, title, sub, color] of [
      [-4.4, '历史馆', '循着光，认识一出戏的来处', '#a97b4c'],
      [4.4, '皮影戏台', '接过手杆，亲手开演', '#527965'],
    ]) {
      for (const side of [-1, 1]) box(scene, .25, 6.4, 1.2, x + side * 2.5, 3.1, 0, '#4c3b2e');
      box(scene, 5.2, .26, 1.2, x, 6.3, 0, '#493a2b');
      const trim = box(scene, 4.8, .065, .12, x, 6.07, .64, gold);
      sign(scene, title, sub, 4.6, x, 7.05, .36);
      box(scene, .25, 7, 4, x - 2.6, 3.3, -2, '#394b43');
      box(scene, .25, 7, 4, x + 2.6, 3.3, -2, '#394b43');
      box(scene, 4.9, .08, 13, x, .01, -6, color);
      const glow = new THREE.PointLight(color, 16, 12, 2); glow.position.set(x, 4, -2); scene.add(glow);
      this.doors.push({x, trim, glow});
      for (let i = 0; i < 4; i++) box(scene, .06, 5.3, .06, x - 1.8 + i * 1.2, 2.7, -8, gold);
    }
    // Stone joints, wall sconces and overhead beams supply depth when turning.
    for (let z = -5; z <= 27; z += 4) {
      box(scene, 22, .015, .025, 0, -.06, z, '#858573');
      box(scene, 22, .27, .3, 0, 8.4, z, '#454e40');
      for (const x of [-10.7, 10.7]) {
        box(scene, .12, 1.1, .35, x, 4.2, z, '#d7b67a');
        box(scene, .24, 2.7, .4, x, 3.2, z, '#4f5a4e');
      }
    }
    sign(scene, '珞珈 · 夜戏', '借一束光，走进一出戏', 3.1, 0, 4, .4);
    // A preview is visible through each opening before the choice is made.
    const preview = panel(new THREE.CanvasTexture(puppetCanvas(38, 0)), 1.8, 3.1, -4.4, 3.3, -3);
    preview.material.map.colorSpace = THREE.SRGBColorSpace; scene.add(preview); this.hallPreview = preview;
    const previewMap = texture(512, 384, (ctx, w, h) => {
      drawPaper(ctx, w, h); ctx.fillStyle = '#584932'; ctx.font = '44px serif'; ctx.textAlign = 'center';
      ctx.fillText('一盏灯 · 一张幕', w / 2, h / 2);
      ctx.strokeStyle = '#b78e52'; ctx.strokeRect(22, 22, w - 44, h - 44);
    });
    scene.add(panel(previewMap, 4.3, 3.3, 4.4, 3.2, -5));
    this.connector = new THREE.Group(); this.connector.position.set(-9, 0, -94); scene.add(this.connector);
    for (const x of [-3, 3]) box(this.connector, .3, 7, 1, x, 3.3, 0, '#493b2d');
    box(this.connector, 6.3, .4, 1, 0, 6.6, 0, '#493b2d');
    sign(this.connector, '循光入戏', '前方 · 灯市与皮影戏台', 5.3, 0, 5.7, .6);
  }
  makeGallery() {
    const scene = this.scene;
    box(scene, 15, .25, 98, -9, -.2, -49, '#514e3f');
    for (const x of [-16.4, -1.6]) box(scene, .3, 8.4, 98, x, 4, -49, '#34453c');
    for (let z = -7; z > -97; z -= 8) {
      box(scene, 15, .25, .28, -9, 7.7, z, '#605941');
      for (const x of [-15.8, -2.2]) {
        box(scene, .3, 7.7, .4, x, 3.8, z, '#62573d');
        box(scene, .08, 1.6, .12, x + (x < -9 ? .3 : -.3), 4.8, z, '#d7b477');
      }
      box(scene, 14.5, .015, .045, -9, -.055, z, '#a08b5f');
    }
    const region = texture(900, 600, (ctx, w, h) => {
      ctx.fillStyle = '#243d34'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#b4c0a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(60, 350); ctx.bezierCurveTo(240, 100, 420, 520, 840, 220); ctx.stroke();
      const locations = [[260, 260, '潜江'], [470, 350, '天门'], [620, 270, '沔阳']];
      ctx.font = '24px serif';
      for (const [x, y, label] of locations) {
        ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillText(label, x + 18, y - 12);
      }
      ctx.fillStyle = '#eedab1'; ctx.font = '38px serif'; ctx.fillText('江汉平原 · 一方水土', 60, 90);
      ctx.fillStyle = gold; ctx.font = '21px sans-serif'; ctx.fillText('地域关系示意，非精确地理地图', 60, 535);
    });
    const map = panel(region, 5.4, 3.6, -12.8, 3.8, -13.5); map.rotation.y = .22; scene.add(map);
    sign(scene, '江汉平原皮影戏', '国家级非遗 · 2006 年列入首批名录', 5.3, -9, 6.5, -14);
    sign(scene, '传承在人的手上', '刘年华 · 代表性传承人 / 唱、奏、操演', 4.4, -4.9, 3.5, -14.8);
    sign(scene, '2006 · 国家级名录', '江汉平原皮影戏 / 历史线索', 4.4, -12.8, 1.1, -13.3);
    sign(scene, '材料 → 镂刻 → 敷彩 → 装缀', '工艺认知示意 · 非真实制作教学', 7, -9, 6.5, -28);
    sign(scene, '借光过桥', '本站原创短剧 · 非传统剧目', 6.8, -9, 6.7, -47);
    sign(scene, '光从哪里来', '点光源 × 影人 × 影幕', 5, -14.2, 5.2, -51);
    sign(scene, '把今夜，排成自己的戏', '草稿与最近六张戏票 · 仅存于当前浏览器', 8, -9, 6.7, -80);
    // Paired display cases remain in the hall as the camera passes them.
    for (const [x, variant, z] of [[-14, 1, -19], [-4, 0, -21]]) {
      box(scene, 1.8, 1.15, 1.4, x, .55, z, '#8c7855');
      const map = new THREE.CanvasTexture(puppetCanvas(55, variant)); map.colorSpace = THREE.SRGBColorSpace;
      scene.add(panel(map, 1.7, 2.9, x, 2.7, z));
      sign(scene, '影人藏品', '本站原创数字影人', 2.5, x, 4.7, z);
    }
  }
  makePuppet() {
    const map = new THREE.CanvasTexture(puppetCanvas(this.arm, this.craftVariant)); map.colorSpace = THREE.SRGBColorSpace;
    this.hero = panel(map, 2.9, 4.95, -9, 3.1, -14); this.scene.add(this.hero);
    this.craftUniforms = {reveal: {value: 1}, colorAmount: {value: 1}};
    this.hero.material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.craftUniforms);
      shader.fragmentShader = 'uniform float reveal; uniform float colorAmount;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        float grey = dot(diffuseColor.rgb, vec3(.299,.587,.114));
        diffuseColor.rgb = mix(vec3(grey * 1.1, grey * .83, grey * .52), diffuseColor.rgb, colorAmount);
        float carved = smoothstep(vMapUv.y - .03, vMapUv.y + .03, reveal);
        diffuseColor.a = mix(max(diffuseColor.a, step(.23,vMapUv.x)*step(vMapUv.x,.76)*step(.16,vMapUv.y)*step(vMapUv.y,.94)*.86), diffuseColor.a, carved);
      `);
    };
    this.joints = new THREE.Group(); this.hero.add(this.joints);
    for (const [x, y] of [[.37, .78], [.1, -.45], [-.2, -1.2]]) {
      const circle = new THREE.Mesh(new THREE.RingGeometry(.09, .115, 24), new THREE.MeshBasicMaterial({color: gold, side: THREE.DoubleSide}));
      circle.position.set(x, y, .035); this.joints.add(circle);
      line(this.joints, [V(x, y, .03), V(x + .8, y - 1.7, .03)], '#bd9f69', .8);
    }
  }
  makeTheater() {
    this.theater = new THREE.Group(); this.theater.position.set(-9, 0, -47); this.scene.add(this.theater);
    const paper = texture(1000, 700, (ctx, w, h) => drawPaper(ctx, w, h));
    this.screen = panel(paper, 10, 6.1, 0, 3.2, 0); this.theater.add(this.screen);
    this.screen.material.opacity = 1; this.screen.material.depthWrite = false;
    for (const x of [-5.25, 5.25]) box(this.theater, .3, 7.1, .4, x, 3.4, 0, '#583e29');
    for (const y of [.1, 6.5]) box(this.theater, 10.8, .25, .4, 0, y, 0, '#805c37');
    const bridge = new THREE.CanvasTexture(bridgeCanvas()); bridge.colorSpace = THREE.SRGBColorSpace;
    this.bridge = panel(bridge, 8.4, 1.35, 0, 1.15, .08, {color: '#645b38'}); this.theater.add(this.bridge);
    const other = new THREE.CanvasTexture(puppetCanvas(65, 1)); other.colorSpace = THREE.SRGBColorSpace;
    this.other = panel(other, 2.3, 3.9, 2.7, 3, .16); this.other.scale.x = -1; this.theater.add(this.other);
    this.projection = panel(this.hero.material.map, 2.3, 3.9, 0, 3, .11, {color: '#403825', opacity: .78}); this.theater.add(this.projection);
    this.lamp = new THREE.Group(); this.lamp.position.set(-1.2, 3, -7); this.theater.add(this.lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), new THREE.MeshBasicMaterial({color: '#ffe4a5'})); this.lamp.add(bulb); this.bulb = bulb;
    box(this.lamp, .12, 2.6, .12, 0, -1.5, 0, '#ab874d'); box(this.lamp, 1.1, .12, .7, 0, -2.83, 0, '#8e7448');
    this.rays = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: '#efcc85', transparent: true, opacity: .45})); this.theater.add(this.rays);
    sign(this.theater, '幕', '影子落在这里', 1.6, 5.1, 5.7, -.1);
    this.hits = [this.hero, this.bulb, this.screen];
  }
  setCraft(arm, variant, zoom) {
    if (this.arm !== Math.round(arm) || this.craftVariant !== variant) {
      this.arm = Math.round(arm); this.craftVariant = variant;
      const old = this.hero.material.map, map = new THREE.CanvasTexture(puppetCanvas(this.arm, variant)); map.colorSpace = THREE.SRGBColorSpace;
      this.hero.material.map = map; this.projection.material.map = map; old.dispose();
    }
    this.zoom = zoom;
  }
  setExperiment(lampX, depth, colored) { this.lampX = lampX; this.depth = depth; this.colored = colored; }
  setComposition(canvas) {
    if (!this.compositionMap) {
      this.compositionMap = new THREE.CanvasTexture(canvas); this.compositionMap.colorSpace = THREE.SRGBColorSpace;
    }
    this.compositionMap.needsUpdate = true;
  }
  hallPose(progress) {
    const z = mix(28, 12, smooth(.6, 1, progress)) + (this.hallDistanceOffset || 0);
    return {position: V(0, 3.1, z), look: V(0, 3, -3)};
  }
  gamePose(progress, origin) {
    const museum = origin === 'museum';
    return sampleCamera(museum ? [
      [0, [-9, 3.2, -69], [-9, 3.1, -80]],
      [.18, [-9, 3.2, -83], [-9, 3.1, -94]],
      [1, [-9, 3.1, -93.6], [-9, 3, -100]],
    ] : [
      [0, [0, 3.1, 12], [0, 3, -3]],
      [.34, [4.4, 3.1, 7], [4.4, 3, -5]],
      [1, [4.4, 3.1, -4.7], [4.4, 3, -10]],
    ], clamp(progress));
  }
  update(route, progress, time, reduced, transition) {
    let pose = route === 'museum' ? sampleCamera(MUSEUM_CAMERA, progress) : this.hallPose(progress);
    if (route === 'museum') pose.position.z += (this.hallDistanceOffset || 0) * (1 - smooth(0, .10, progress));
    if (route === 'game') {
      pose = this.gamePose(progress, this.gameOrigin);
      if (this.gameOrigin !== 'museum') pose.position.z += (this.hallDistanceOffset || 0) * (1 - smooth(0, .95, progress));
    }
    if (transition && this.transitionPose) {
      const f = smooth(0, 1, transition.fraction);
      pose.position.lerpVectors(this.transitionPose.position, pose.position, f);
      pose.look.lerpVectors(this.transitionPose.look, pose.look, f);
    }
    this.currentPose = pose;
    this.hallPreview.visible = route !== 'museum' || progress < .055;
    for (let i = 0; i < this.doors.length; i++) {
      const selected = this.hover === (i ? 1 : -1);
      this.doors[i].glow.intensity = selected ? 35 : 16;
      this.doors[i].trim.material.color.set(selected ? '#ffe1a0' : gold);
    }
    if (route !== 'museum') return pose;
    const p = progress;
    // The exact same mesh leaves its case, is worked on, then walks onto the screen.
    const intoWorkshop = smooth(.17, .28, p), intoStory = smooth(.38, .47, p);
    this.hero.position.set(-9, 3.1, mix(mix(-14, -28, intoWorkshop), -46.74, intoStory));
    this.hero.scale.setScalar(mix(1, .78, intoStory) * (this.zoom && p >= .22 && p < .43 ? 1.2 : 1));
    this.hero.position.x = -9 + mix(-3, -.8, smooth(.45, .60, p)) * intoStory;
    this.hero.visible = p > .065 && p < .65;
    const craft = clamp((p - .22) / .18);
    this.craftUniforms.reveal.value = p < .22 ? 1 : smooth(.10, .53, craft);
    this.craftUniforms.colorAmount.value = p < .22 ? 1 : smooth(.48, .78, craft);
    this.joints.visible = craft > .76 && p < .44;
    this.joints.scale.setScalar(smooth(.76, 1, craft));
    this.hero.rotation.z = p > .40 && p < .48 ? Math.sin(smooth(.40, .48, p) * Math.PI) * .08 : 0;
    this.bridge.scale.x = smooth(.475, .54, p);
    this.other.position.x = mix(5.4, 1.8, smooth(.53, .60, p));
    this.other.visible = p >= .52 && p < .635;
    const movingScreen = smooth(.785, .86, p);
    this.theater.position.z = mix(-47, -80, movingScreen);
    const composing = p >= .84 && !!this.compositionMap;
    if (composing !== this.composing) {
      this.composing = composing;
      this.paperMap ||= this.screen.material.map;
      this.screen.material.map = composing ? this.compositionMap : this.paperMap;
      this.screen.material.needsUpdate = true;
    }
    this.bridge.visible = !composing;
    if (composing) this.other.visible = false;
    const experiment = p >= .63 && p < .84;
    this.lamp.visible = experiment; this.rays.visible = experiment;
    this.projection.visible = experiment;
    const shadowScale = 7 / (7 - this.depth);
    this.lamp.position.x = this.lampX;
    this.projection.scale.setScalar(shadowScale);
    this.projection.position.x = -this.lampX * (shadowScale - 1);
    this.projection.material.color.set(this.colored ? '#ffffff' : '#403825');
    this.projection.material.opacity = this.colored ? .87 : .72;
    // A physical puppet, lamp, and mathematical screen projection remain aligned.
    if (experiment) {
      this.hero.visible = true;
      this.hero.position.set(-9, 3, this.theater.position.z - this.depth);
      this.hero.scale.setScalar(.78); this.hero.rotation.z = 0;
      if (this.rayKey !== `${this.lampX}/${this.depth}`) {
      this.rayKey = `${this.lampX}/${this.depth}`;
      const points = [];
      for (const y of [-1.95, 1.95]) for (const x of [-1.15, 1.15]) {
        points.push(V(this.lampX, 3, -7), V(x * shadowScale + this.projection.position.x, y * shadowScale + 3, -.03));
      }
      this.rays.geometry.dispose(); this.rays.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
    }
    if (reduced) this.bulb.scale.setScalar(1);
    else this.bulb.scale.setScalar(1 + Math.sin(time * 1.2) * .025);
    return pose;
  }
  startTransition() {
    this.transitionPose = {position: this.currentPose.position.clone(), look: this.currentPose.look.clone()};
  }
  pick(clientX, clientY, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, camera);
    const objects = [this.hero, this.bulb, this.screen].filter(mesh => mesh.visible && mesh.parent.visible);
    return this.raycaster.intersectObjects(objects, false)[0];
  }
}
