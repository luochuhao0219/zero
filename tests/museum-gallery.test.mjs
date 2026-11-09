import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryJourney,CABINET_VIEWS,CABINET_POINTS} from '../src/museum-gallery.js';
import {MUSEUM_ENTRY,MUSEUM_STOPS} from '../src/route-state.js';
import {MuseumBackdrop} from '../src/museum-backdrop.js';
import {photoPoint} from '../src/interior-framing.js';

test('the left doorway arrives at the corridor, before the first cabinet',()=>{
  const view=galleryJourney(MUSEUM_ENTRY);
  assert.equal(view.from,'corridor');assert.equal(view.blend,0);
  assert.equal(view.overview,1);assert.equal(view.reading,0);
  assert.ok(MUSEUM_ENTRY<MUSEUM_STOPS[0].at);
});

test('each reading stop rests at its own cabinet position',()=>{
  for(const stop of MUSEUM_STOPS){
    const view=galleryJourney(stop.at);
    assert.equal(view.blend===1?view.to:view.from,stop.id);
    assert.equal(view.reading,1);assert.equal(view.overview,0);
    assert.ok(CABINET_VIEWS[stop.id].focus);
    assert.equal(galleryJourney(stop.at+.025).reading,1);
  }
  assert.equal(galleryJourney(1).reading,1);
});

test('cabinet walking is reversible, bounded and keeps labels out of the crossing',()=>{
  for(let p=0;p<=1;p+=.001){
    const view=galleryJourney(p);
    assert.ok(CABINET_VIEWS[view.from]&&CABINET_VIEWS[view.to]);
    for(const key of ['blend','reading','overview'])assert.ok(view[key]>=0&&view[key]<=1);
  }
  for(let i=0;i<MUSEUM_STOPS.length-1;i++){
    const p=(MUSEUM_STOPS[i].at+MUSEUM_STOPS[i+1].at)/2;
    const view=galleryJourney(p);
    assert.equal(view.reading,0);assert.ok(Math.abs(view.blend-.5)<1e-10);
    assert.ok(Math.abs(galleryJourney(p+.00001).blend-view.blend)<.001);
  }
});

test('the selected cabinet stays in view and its marker follows the photographic crop',()=>{
  const backdrop=Object.create(MuseumBackdrop.prototype);
  backdrop.plates={corridor:{aspect:1672/941}};
  for(const aspect of [.46,.69,1,16/9,2.4]){
    backdrop.aspect=aspect;
    for(const [i,stop] of MUSEUM_STOPS.entries()){
      const frame=backdrop.galleryFrame(stop.at),point=photoPoint(CABINET_POINTS[i],frame);
      assert.ok(point[0]>.045&&point[0]<.955);
      assert.ok(point[1]>.1&&point[1]<.85);
      assert.ok(Math.abs(frame.x+point[0]*frame.width-CABINET_POINTS[i][0])<1e-10);
    }
    for(let p=0;p<=1;p+=.01){
      const frame=backdrop.galleryFrame(p);
      assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.width<=1+1e-10&&frame.y+frame.height<=1+1e-10);
      assert.ok(Math.abs(frame.width*(1672/941)/frame.height-aspect)<1e-10);
    }
  }
});
