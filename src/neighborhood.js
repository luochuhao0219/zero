import * as THREE from '../vendor/three.module.js';

// A lightweight 2.5D neighborhood: photographic scenery on a curved backdrop,
// separate stall cutouts, and GPU animated steam. Nothing here handles game input.
const TAU = Math.PI * 2;
const ASSET_ROOT = './assets/atmosphere/';

function paintedTexture(stage, width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  return stage.texture(canvas);
}

function lanternTexture(stage) {
  return paintedTexture(stage, 128, 208, (ctx) => {
    ctx.strokeStyle = '#4a2b1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(64, 29); ctx.stroke();
    const light = ctx.createRadialGradient(57, 86, 4, 64, 92, 61);
    light.addColorStop(0, '#fff0a7'); light.addColorStop(.35, '#ffb751');
    light.addColorStop(.72, '#c34a26'); light.addColorStop(1, '#56251c');
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(64, 94, 43, 64, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip();
    for (let y = 36; y < 156; y += 8) {
      ctx.strokeStyle = 'rgba(74,29,12,.32)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(64, y, 43, 7, 0, 0, TAU); ctx.stroke();
    }
    for (const dx of [-27, -14, 0, 14, 27]) {
      ctx.strokeStyle = 'rgba(255,221,137,.16)'; ctx.beginPath();
      ctx.moveTo(64 + dx * .4, 28); ctx.bezierCurveTo(64 + dx * 1.4, 60, 64 + dx * 1.4, 125, 64 + dx * .4, 158); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#713f22'; ctx.fillRect(47, 27, 34, 6); ctx.fillRect(48, 155, 32, 6);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = i % 2 ? '#d38a48' : '#8f3b25'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(60 + i, 160); ctx.lineTo(55 + i * 3, 192 + Math.sin(i) * 5); ctx.stroke();
    }
  });
}

export function createNeighborhood(stage) {
  const group = new THREE.Group(); group.name = 'Luojia neighborhood'; stage.scene.add(group);
  const promises = [], loader = new THREE.TextureLoader();
  const load = name => {
    let settle; promises.push(new Promise(resolve => { settle = resolve; }));
    const texture = loader.load(ASSET_ROOT + name, () => settle(true), undefined, () => settle(false));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
    return texture;
  };

  const panorama = load('night-market-panorama.png');
  panorama.wrapS = THREE.RepeatWrapping; panorama.repeat.x = 4;
  const backdropMaterial = new THREE.MeshBasicMaterial({
    map: panorama, color: 0xe1d9cd, side: THREE.BackSide,
    transparent: true, depthWrite: false, fog: false, toneMapped: false
  });
  backdropMaterial.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      // The photograph's paving joins the actual ground without a rectangular edge.
      diffuseColor.a *= smoothstep(.09, .205, vMapUv.y);
      diffuseColor.a *= 1.0 - smoothstep(.87, 1.0, vMapUv.y);
    `);
  };
  const backdrop = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 24, 128, 1, true), backdropMaterial);
  backdrop.position.y = 7.1; backdrop.rotation.y = .34; backdrop.renderOrder = -2; group.add(backdrop);

  // The two halves of one alpha atlas remain separate planes, so their depth
  // changes independently from the distant shopfronts as the camera moves.
  const atlas = load('stall-neighbors-atlas.png');
  const standees = [], steamSources = [];
  const places = [
    {x: -11.9, z: -7.5, half: 0, height: 4.2},
    {x: 11.2, z: -8.5, half: 1, height: 3.2},
    {x: 12.8, z: 10.6, half: 0, height: 4.0},
    {x: -12.6, z: 12.8, half: 1, height: 3.25}
  ];
  for (const place of places) {
    const geometry = new THREE.PlaneGeometry(place.height * .75, place.height);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + place.half) * .5);
    const material = new THREE.MeshBasicMaterial({map: atlas, color: 0xc4b8a7, transparent: true,
      alphaTest: .13, depthWrite: true, side: THREE.DoubleSide, forceSinglePass: true, fog: false, toneMapped: false});
    const mesh = new THREE.Mesh(geometry, material);
    // The atlas includes a small clear lower margin; sink that margin below the paving.
    mesh.position.set(place.x, -.48 + place.height * .46, place.z);
    group.add(mesh); standees.push(mesh);
    if (!place.half) steamSources.push(new THREE.Vector3(place.x - .4, 1.35, place.z + .08));
  }

  const crowdAtlas = load('spectators-atlas.png'), crowdTime = {value: 0}, crowdMotion = {value: 1};
  const audiencePlaces = [
    [-4.5, 5.7, 0], [-6.0, 5.3, 1], [4.7, 5.5, 2],
    [3.5, 5.1, 3], [6.1, 6.2, 0], [-3.2, 6.3, 3]
  ];
  // Atlas columns have intentionally unequal clear margins. The measured crop
  // windows keep every spectator's hands, shoes and stool inside their own quad.
  const regions = [[0,432],[432,336],[768,384],[1152,384]];
  const audienceGeometry = new THREE.PlaneGeometry(1, 1, 1, 8), rectangles = [], phases = [];
  for (const [, , variant] of audiencePlaces) {
    rectangles.push(regions[variant][0] / 1536, regions[variant][1] / 1536);
    phases.push(phases.length * 1.79);
  }
  audienceGeometry.setAttribute('atlasRect', new THREE.InstancedBufferAttribute(new Float32Array(rectangles), 2));
  audienceGeometry.setAttribute('idlePhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  const audienceMaterial = new THREE.MeshBasicMaterial({map: crowdAtlas, color: 0xaba296,
    alphaTest: .17, transparent: true, fog: false, toneMapped: false});
  audienceMaterial.onBeforeCompile = shader => {
    shader.uniforms.marketTime = crowdTime; shader.uniforms.marketMotion = crowdMotion;
    shader.vertexShader = 'attribute vec2 atlasRect; attribute float idlePhase; uniform float marketTime, marketMotion;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
      #include <uv_vertex>
      vMapUv.x = atlasRect.x + vMapUv.x * atlasRect.y;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      transformed.x += sin(marketTime * .85 + idlePhase) * .008 * smoothstep(.28,.9,uv.y) * marketMotion;
    `);
  };
  const audience = new THREE.InstancedMesh(audienceGeometry, audienceMaterial, audiencePlaces.length);
  audience.instanceMatrix.setUsage(THREE.DynamicDrawUsage); audience.frustumCulled = false;
  const arrangement = new THREE.Object3D();
  audiencePlaces.forEach(([x, z, variant], i) => {
    const height = 2.14 + (i % 2) * .09;
    arrangement.position.set(x, -.48 + height * .47, z);
    arrangement.rotation.set(0, 0, 0);
    arrangement.scale.set(height * regions[variant][1] / 1024, height, 1);
    arrangement.updateMatrix(); audience.setMatrixAt(i, arrangement.matrix);
  });
  group.add(audience);

  const glowMap = paintedTexture(stage, 128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,195,112,.5)');
    gradient.addColorStop(.2, 'rgba(255,154,62,.22)');
    gradient.addColorStop(1, 'rgba(255,126,32,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  });
  for (const place of places) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({
      map: glowMap, transparent: true, opacity: .32, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, fog: false
    }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(place.x, -.452, place.z + .7); group.add(pool);
  }
  const contacts = [...places.map(p => [p.x, p.z, p.height * .66, 1.4]),
    ...audiencePlaces.map(([x,z]) => [x,z,.85,.5])];
  const contactShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map: glowMap, color: 0x060504, transparent: true, opacity: .9,
      depthWrite: false, toneMapped: false}), contacts.length);
  contacts.forEach(([x,z,w,h],i) => {
    arrangement.position.set(x, -.448, z); arrangement.rotation.set(-Math.PI/2,0,0);
    arrangement.scale.set(w,h,1); arrangement.updateMatrix(); contactShadows.setMatrixAt(i, arrangement.matrix);
  });
  group.add(contactShadows);

  // Four strings surround the courtyard. A single instanced quad batch supplies
  // the paper lanterns; only their transforms change, never their textures.
  const strings = [
    [[-25, 12, -18], [25, 12.8, -18]],
    [[-25, 12.8, 27], [25, 12, 27]],
    [[-19, 12, -20], [-19, 12.8, 27]],
    [[20, 12.8, -20], [20, 12, 27]]
  ];
  const lanternPositions = [], wirePoints = [];
  for (const [start, end] of strings) {
    const at = t => new THREE.Vector3(
      THREE.MathUtils.lerp(start[0], end[0], t),
      THREE.MathUtils.lerp(start[1], end[1], t) - Math.sin(t * Math.PI) * 2.1,
      THREE.MathUtils.lerp(start[2], end[2], t)
    );
    for (let i = 0; i < 40; i++) wirePoints.push(at(i / 40), at((i + 1) / 40));
    for (let i = 0; i < 8; i++) {
      const point = at((i + .5) / 8); point.y -= .64; lanternPositions.push(point);
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePoints),
    new THREE.LineBasicMaterial({color: 0x44372c, transparent: true, opacity: .85})));
  const lanterns = new THREE.InstancedMesh(new THREE.PlaneGeometry(.94, 1.53),
    new THREE.MeshBasicMaterial({map: lanternTexture(stage), transparent: true, alphaTest: .025,
      side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false, fog: false}), lanternPositions.length);
  const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 3.4),
    new THREE.MeshBasicMaterial({map: glowMap, transparent: true, opacity: .32,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false}), lanternPositions.length);
  lanterns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lanterns.frustumCulled = halos.frustumCulled = false; group.add(lanterns, halos);

  const steamMap = paintedTexture(stage, 128, 128, (ctx) => {
    for (let i = 0; i < 13; i++) {
      const x = 42 + Math.sin(i * 2.4) * 21, y = 60 + Math.cos(i * 1.3) * 25, r = 20 + i % 5 * 3;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(239,221,191,.14)'); gradient.addColorStop(1, 'rgba(239,221,191,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  const puffCount = steamSources.length * 14, origins = [], seeds = [];
  for (let i = 0; i < puffCount; i++) {
    const source = steamSources[Math.floor(i / 14)]; origins.push(...source.toArray()); seeds.push((i % 14) / 14, i * 1.71);
  }
  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(origins, 3));
  steamGeometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 2));
  const steamMaterial = new THREE.ShaderMaterial({
    uniforms: {map: {value: steamMap}, time: {value: 0}, scale: {value: 800}},
    vertexShader: `
      uniform float time, scale; attribute vec2 aSeed; varying float density;
      void main(){
        float age = fract(aSeed.x + time * .105);
        vec3 p = position;
        p.y += age * 3.25;
        p.x += sin(age * 4.0 + aSeed.y) * (.1 + age * .32) + age * .38;
        p.z += cos(age * 3.0 + aSeed.y) * age * .22;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(140.0, (.38 + age * 1.5) * scale / max(1.0,-mv.z));
        density = sin(age * 3.14159265) * .5;
      }`,
    fragmentShader: `
      uniform sampler2D map; varying float density;
      void main(){
        vec4 cloud = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vec3(.72,.63,.51), cloud.a * density);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false
  });
  const steam = new THREE.Points(steamGeometry, steamMaterial); steam.frustumCulled = false; group.add(steam);

  const dummy = new THREE.Object3D(), facing = new THREE.Vector3();
  const result = {
    group, assetsLoaded: 0, standees: standees.length, spectators: audiencePlaces.length, lanterns: lanternPositions.length,
    steamPuffs: puffCount, phase: 0,
    ready: Promise.all(promises).then(results => { result.assetsLoaded = results.filter(Boolean).length; }),
    update(time, reduced) {
      const t = reduced ? 0 : time; result.phase = t;
      crowdTime.value = t; crowdMotion.value = reduced ? 0 : 1;
      // Rear-view audience cutouts face the viewing camera while it is in front
      // of the stage; gently fade them on the trip backstage instead of exposing
      // a paper-thin edge or an incorrect reverse view of the same photograph.
      audienceMaterial.opacity = THREE.MathUtils.smoothstep(Math.cos(stage.angle), 0, .45);
      audience.visible = audienceMaterial.opacity > .001;
      if (audience.visible) {
        audiencePlaces.forEach(([x,z,variant],i) => {
          const height = 2.14 + (i % 2) * .09;
          arrangement.position.set(x, -.48 + height * .47, z);
          arrangement.rotation.set(0, Math.atan2(stage.camera.position.x-x, stage.camera.position.z-z), 0);
          arrangement.scale.set(height * regions[variant][1] / 1024, height, 1);
          arrangement.updateMatrix(); audience.setMatrixAt(i, arrangement.matrix);
        });
        audience.instanceMatrix.needsUpdate = true;
      }
      for (const mesh of standees) {
        facing.set(stage.camera.position.x, mesh.position.y, stage.camera.position.z);
        mesh.lookAt(facing);
      }
      for (let i = 0; i < lanternPositions.length; i++) {
        dummy.position.copy(lanternPositions[i]);
        facing.set(stage.camera.position.x, dummy.position.y, stage.camera.position.z); dummy.lookAt(facing);
        dummy.rotateZ(Math.sin(t * .75 + i * 1.8) * (reduced ? 0 : .035));
        // Portrait framing moves the camera outside the nearest string. Fade those
        // very close lanterns so a giant cutout cannot cover the title or controls.
        const proximity = THREE.MathUtils.smoothstep(dummy.position.distanceTo(stage.camera.position), 18, 26);
        dummy.scale.setScalar((.86 + (i % 3) * .1) * proximity); dummy.updateMatrix(); lanterns.setMatrixAt(i, dummy.matrix);
        dummy.rotation.z = 0; dummy.scale.setScalar((.92 + Math.sin(t * 2.5 + i) * (reduced ? 0 : .035)) * proximity);
        dummy.updateMatrix(); halos.setMatrixAt(i, dummy.matrix);
      }
      lanterns.instanceMatrix.needsUpdate = halos.instanceMatrix.needsUpdate = true;
      steamMaterial.uniforms.time.value = t;
      steamMaterial.uniforms.scale.value = stage.canvas.height / (2 * Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)));
    }
  };
  return result;
}
