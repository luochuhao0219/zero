import {clamp} from './route-state.js';

// Image coordinates use a top-left origin. The same crop positions the photo,
// the live exhibits and their DOM handles, at every viewport aspect ratio.
export function photoFrame(imageAspect, viewportAspect, zoom = 1, focus = [.5, .5]) {
  const width = Math.min(1, viewportAspect / imageAspect) / zoom;
  const height = Math.min(1, imageAspect / viewportAspect) / zoom;
  return {
    x: clamp(focus[0] - width / 2, 0, 1 - width),
    y: clamp(focus[1] - height / 2, 0, 1 - height), width, height,
  };
}

export function photoPoint(point, frame) {
  return [(point[0] - frame.x) / frame.width, (point[1] - frame.y) / frame.height];
}

export function photoRect(rect, frame) {
  const [x, y] = photoPoint(rect, frame);
  return {x, y, width: rect[2] / frame.width, height: rect[3] / frame.height};
}
