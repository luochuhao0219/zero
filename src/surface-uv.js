/** Keep texture scale in room units, including long walls and slender timber. */
export function surfaceUV(geometry,dimensions,{meters=[1,1],grain=false,grainAxis}={}){
  const p=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index;
  const longAxis=grainAxis??dimensions.indexOf(Math.max(...dimensions));
  const coordinates=[i=>p.getX(i),i=>p.getY(i),i=>p.getZ(i)];
  // Box/RoundedBox face order: +/- X, +/- Y, +/- Z.
  const axes=[[2,1],[2,1],[0,2],[0,2],[0,1],[0,1]];
  for(const group of geometry.groups){
    let [u,v]=axes[group.materialIndex];
    if(grain&&u===longAxis)[u,v]=[v,u];
    const across=meters[0],along=grain&&v!==longAxis?across:meters[1];
    for(let j=group.start;j<group.start+group.count;j++){
      const i=index?index.getX(j):j;
      uv.setXY(i,(coordinates[u](i)+dimensions[u]/2)/across,(coordinates[v](i)+dimensions[v]/2)/along);
    }
  }
  uv.needsUpdate=true;
  return geometry;
}
