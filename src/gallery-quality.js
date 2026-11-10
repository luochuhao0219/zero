/** Preserve native-looking edges even when the gallery needs a lighter frame. */
export function galleryRenderSettings(width,height,density,tier,maxSamples=4){
  const area=Math.max(1,width*height);
  const base=Math.min(density,2,Math.sqrt(6400000/area));
  const floor=Math.min(base,density>1?1.25:1);
  const scale=[1,1,.92,.82,.72][Math.max(0,Math.min(4,tier))];
  const pixelRatio=Math.min(base,Math.max(floor,base*scale));
  const pixels=area*pixelRatio*pixelRatio;
  // At lower pixel densities, retain edge coverage instead of disabling AA.
  const samples=Math.min(maxSamples,tier<2&&pixelRatio<=1.5&&pixels<2600000?4:2);
  return {base,pixelRatio,samples};
}
