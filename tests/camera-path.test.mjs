import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCameraPath, MUSEUM_CAMERA} from '../src/camera-path.js';

test('camera passes through the museum doorway, not through its stone jamb', () => {
  for (let p = .045; p <= .085; p += .0002) {
    const [x, y, z] = sampleCameraPath(MUSEUM_CAMERA, p).position;
    if (Math.abs(z) < .8) { assert.ok(x > -6.7 && x < -2.1); assert.ok(y > 2 && y < 4); }
  }
});
test('camera position and velocity remain continuous at moving keyframes', () => {
  const epsilon = .000001;
  for (const key of MUSEUM_CAMERA.slice(1, -1)) {
    const before = sampleCameraPath(MUSEUM_CAMERA, key[0] - epsilon);
    const at = sampleCameraPath(MUSEUM_CAMERA, key[0]);
    const after = sampleCameraPath(MUSEUM_CAMERA, key[0] + epsilon);
    for (const field of ['position', 'look']) for (let axis = 0; axis < 3; axis++) {
      const v1 = (at[field][axis] - before[field][axis]) / epsilon;
      const v2 = (after[field][axis] - at[field][axis]) / epsilon;
      assert.ok(Math.abs(v1 - v2) < .25, 'velocity discontinuity at ' + key[0]);
    }
  }
});
test('reversible camera paths stay within each segment and preserve reading stops', () => {
  for (let i = 1; i < MUSEUM_CAMERA.length; i++) {
    const a = MUSEUM_CAMERA[i - 1], b = MUSEUM_CAMERA[i];
    for (let step = 0; step <= 20; step++) {
      const p = a[0] + (b[0] - a[0]) * step / 20, pose = sampleCameraPath(MUSEUM_CAMERA, p);
      for (const [field, index] of [['position', 1], ['look', 2]]) for (let axis = 0; axis < 3; axis++) {
        assert.ok(pose[field][axis] >= Math.min(a[index][axis], b[index][axis]) - 1e-9);
        assert.ok(pose[field][axis] <= Math.max(a[index][axis], b[index][axis]) + 1e-9);
      }
    }
  }
});
