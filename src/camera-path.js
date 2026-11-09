export const MUSEUM_CAMERA = [
  [0, [0, 3.1, 12], [0, 3, 0]],
  [.025, [-2.6, 3.1, 9], [-4.4, 3.1, -4]],
  [.045, [-4.4, 3.1, 5], [-4.4, 3.1, -7]],
  [.065, [-4.4, 3.1, .8], [-6.8, 3.1, -10]],
  [.085, [-6.7, 3.15, -3.2], [-9, 3.1, -14]],
  [.10, [-9, 3.2, -5], [-9, 3.1, -14]],
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

// Non-uniform monotone cubic interpolation: continuous velocity, with no
// overshoot through door jambs. Repeated points remain intentional rest stops.
export function sampleCameraPath(keys, progress) {
  const p = Math.max(keys[0][0], Math.min(keys.at(-1)[0], progress));
  let right = keys.findIndex(key => key[0] >= p);
  if (right <= 0) return {position: [...keys[0][1]], look: [...keys[0][2]]};
  const left = right - 1, h = keys[right][0] - keys[left][0], t = (p - keys[left][0]) / h;
  const slope = (index, field, axis) => {
    if (index === 0 || index === keys.length - 1) return 0;
    const before = keys[index][0] - keys[index - 1][0], after = keys[index + 1][0] - keys[index][0];
    const a = (keys[index][field][axis] - keys[index - 1][field][axis]) / before;
    const b = (keys[index + 1][field][axis] - keys[index][field][axis]) / after;
    if (a * b <= 0) return 0;
    const w1 = 2 * after + before, w2 = after + 2 * before;
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const sample = field => [0, 1, 2].map(axis => {
    const a = keys[left][field][axis], b = keys[right][field][axis];
    return (2 * t ** 3 - 3 * t ** 2 + 1) * a + (t ** 3 - 2 * t ** 2 + t) * h * slope(left, field, axis)
      + (-2 * t ** 3 + 3 * t ** 2) * b + (t ** 3 - t ** 2) * h * slope(right, field, axis);
  });
  return {position: sample(1), look: sample(2)};
}
