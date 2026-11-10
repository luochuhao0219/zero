import * as THREE from '../vendor/three.module.js';

// Keep the photographed pores, scratches and mineral variation. Adjust the
// stone's albedo towards the entrance's grey limestone, not its light response.
export function agedSurface(material, saturation = 1, gain = 1, footWear = 0, pigment = null, contrast = 1) {
  const paint = pigment ? new THREE.Color(pigment) : null;
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 agedPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', 'agedPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
    shader.fragmentShader = 'varying vec3 agedPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `vec3 surfaceTint = diffuseColor.rgb;
      #include <map_fragment>
      sampledDiffuseColor.rgb = mix(vec3(.075), sampledDiffuseColor.rgb, ${contrast.toFixed(3)});
      float mineralLuma = dot(sampledDiffuseColor.rgb, vec3(.2126,.7152,.0722));
      diffuseColor.rgb = surfaceTint * mix(vec3(mineralLuma), sampledDiffuseColor.rgb, ${saturation.toFixed(3)}) * ${gain.toFixed(3)};
      ${paint ? `vec3 oldPigment = vec3(${paint.r.toFixed(5)},${paint.g.toFixed(5)},${paint.b.toFixed(5)});
      float paintCoverage = .64 + .2 * smoothstep(.025,.16,mineralLuma);
      diffuseColor.rgb = mix(diffuseColor.rgb, oldPigment * (.65 + mineralLuma * 4.0), paintCoverage);` : ''}
      float baseAge = (1.0 - smoothstep(.08, 1.3, agedPosition.y)) * ${footWear.toFixed(3)};
      diffuseColor.rgb *= 1.0 - baseAge;
    `);
  };
  material.customProgramCacheKey = () => `aged-${saturation}-${gain}-${footWear}-${pigment}-${contrast}`;
  return material;
}

// A restrained indoor environment: cool window light and small warm practicals.
// It contributes highlights to wood, stone and metal without a bloom/blur pass.
export function interiorEnvironment(renderer, scene) {
  const room = new THREE.Scene(); room.background = new THREE.Color('#24383d');
  const panel = (color, intensity, x, y, z, w, h) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide}));
    mesh.position.set(x, y, z); mesh.lookAt(0, 0, 0); room.add(mesh);
  };
  panel('#83baca', 2.8, -7, 4, 1, 4, 5);
  panel('#b1c6d3', 1.7, 7, 4, -3, 3, 5);
  panel('#ffc375', 3.4, 0, 6, 0, 1.4, 1.4);
  panel('#e8a45e', 2.1, 0, 3, -8, 2, 4);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0, .1, 30);
  scene.environment = target.texture; scene.environmentIntensity = .64;
  pmrem.dispose();
  room.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
  return target;
}
