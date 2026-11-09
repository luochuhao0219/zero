import test from 'node:test';
import assert from 'node:assert/strict';
import {photoFrame, photoPoint, photoRect} from '../src/interior-framing.js';

test('photo crops fill wide and narrow screens without sampling outside the image', () => {
  for (const imageAspect of [2 / 3, 16 / 9]) for (const viewportAspect of [.46, .89, 1.6, 2.4]) {
    for (const zoom of [1, 1.4, 2.65]) for (const focus of [[.05, .95], [.5, .5], [.7, .52]]) {
      const f = photoFrame(imageAspect, viewportAspect, zoom, focus);
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.width <= 1 + 1e-10 && f.y + f.height <= 1 + 1e-10);
      assert.ok(Math.abs(f.width * imageAspect / f.height - viewportAspect) < 1e-10);
    }
  }
});

test('live display corners and photo coordinates agree after a doorway push or resize', () => {
  const paper = [.352, .276, .292, .299];
  for (const aspect of [.5, .89, 1.6, 2.1]) {
    const f = photoFrame(16 / 9, aspect, 1.1, [.5, .54]), r = photoRect(paper, f);
    const bottomRight = photoPoint([paper[0] + paper[2], paper[1] + paper[3]], f);
    assert.ok(Math.abs(r.x + r.width - bottomRight[0]) < 1e-10);
    assert.ok(Math.abs(r.y + r.height - bottomRight[1]) < 1e-10);
  }
});

test('both portrait hall entrances stay in the narrow viewport at rest', () => {
  for (const aspect of [.46, .67, .89, 1.14]) {
    const f = photoFrame(1030 / 1526, aspect, 1.035);
    for (const door of [[.295, .65], [.695, .65]]) {
      const [x, y] = photoPoint(door, f);
      assert.ok(x > .1 && x < .9 && y > .4 && y < .9);
    }
  }
});
