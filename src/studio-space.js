export const SCREEN={width:10.25,height:5.55,y:3.25};
export const BOUNDS={x:[16,84],y:[45,86],size:[.65,1.35],pose:[-30,120]};
export const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
export function screenPoint(x,y){return {x:(x/100-.5)*SCREEN.width,y:SCREEN.y+(.5-y/100)*SCREEN.height,z:.08};}
export function paperPoint(x,y){return {x:bound((x/SCREEN.width+.5)*100,16,84),y:bound((.5-(y-SCREEN.y)/SCREEN.height)*100,25,85)};}
/** Stored paper poses use the same coordinates in the editor, 3D cloth and cover. */
export function actorInWorld(actor,light={x:-.8,y:4.6}){
  if(actor.present===false)return undefined;
  const center=screenPoint(actor.x,actor.y-52*.415*actor.size),z=-.4,scale=4.8/(4.8+z);
  return {...actor,x:(center.x-light.x*(1-scale))/scale,y:(center.y-light.y*(1-scale))/scale,z,size:SCREEN.height*.52/3.075*actor.size/scale};
}
export function actorPaperCenter(actor){return screenPoint(actor.x,actor.y-52*.415*actor.size);}
export function snapPose(pose){const stops=[10,25,45,68,85,100,110],nearest=stops.reduce((a,b)=>Math.abs(b-pose)<Math.abs(a-pose)?b:a);return Math.abs(nearest-pose)<3?nearest:pose;}
export function canFreePlay(completed){return [0,1,2].every(level=>completed.includes(level));}
export function sceneryDefault(scene){return scene==='garden'?{x:78,y:48}:scene==='moon'?{x:76,y:65}:{x:50,y:81};}
export function movePaperItem(item,dx,dy,kind='actor'){return {...item,x:bound(item.x+dx,16,84),y:bound(item.y+dy,kind==='actor'?45:25,kind==='actor'?86:85)};}
