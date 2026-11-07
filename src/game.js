export const WIN_SCORE = 94;
export const LIGHT_Z = -4.8;
export const LEVELS = [
  { name:'点灯', numeral:'第一幕', description:'移动灯，推拉影人。让影子落进幕上的轮廓。', tip:'灯往右，影子往左。影人离幕越远，影子越大。', scoreLabel:'影子就位', end:'灯点好了。', target:{ lightX:-2.2, lightY:4.6, depth:1.05 }, initial:{ lightX:1.8, lightY:2.8, depth:1.8 }, controls:[
    {key:'lightX',label:'灯的位置',min:-3.5,max:3.5,step:.02,unit:'',left:'左移',right:'右移'},
    {key:'lightY',label:'灯的高度',min:2,max:5.6,step:.02,unit:'',left:'低处',right:'高处'},
    {key:'depth',label:'影人距幕',min:.5,max:2.3,step:.01,unit:'',left:'贴近幕布',right:'远离幕布'}
  ]},
  { name:'搭桥', numeral:'第二幕', description:'抓住右侧桥面移动，拉动桥端的圆点把它转平。', tip:'前后推拉景片，也会改变影桥的大小。', scoreLabel:'桥面就位', end:'桥接上了。', target:{ bridgeX:1.05, bridgeDepth:.85, bridgeAngle:0 }, initial:{ bridgeX:2.25, bridgeDepth:1.8, bridgeAngle:-23 }, controls:[
    {key:'bridgeX',label:'景片横移',min:-.2,max:2.8,step:.02,unit:'',left:'向左',right:'向右'},
    {key:'bridgeDepth',label:'景片距幕',min:.35,max:2.1,step:.01,unit:'',left:'贴近幕布',right:'远离幕布'},
    {key:'bridgeAngle',label:'景片倾角',min:-30,max:30,step:.5,unit:'°',left:'逆时针',right:'顺时针'}
  ]},
  { name:'对戏', numeral:'第三幕', description:'把两位影人拉近，再抓住手杆抬手，让他们对上一礼。', tip:'拖身体调整距离，拖手杆调整姿态。', scoreLabel:'动作就位', end:'这出戏，成了。', target:{ poseLeft:68, poseRight:82, spacing:2.15 }, initial:{ poseLeft:15, poseRight:24, spacing:3.5 }, controls:[
    {key:'poseLeft',label:'左影 · 提手',min:0,max:120,step:1,unit:'°',left:'垂手',right:'扬手'},
    {key:'poseRight',label:'右影 · 应礼',min:0,max:120,step:1,unit:'°',left:'垂手',right:'扬手'},
    {key:'spacing',label:'二人间距',min:1.4,max:4,step:.01,unit:'',left:'相近',right:'相远'}
  ]}
];
export function projectPoint(x,y,z,lightX,lightY,lightZ=LIGHT_Z){
  const scale=(0-lightZ)/(z-lightZ);
  return {x:lightX+(x-lightX)*scale,y:lightY+(y-lightY)*scale,scale};
}
export function initialState(level){return {level,...LEVELS[level].initial};}
export function scoreState(level,state){
  const target=LEVELS[level].target;let penalty;
  if(level===0){const a=projectPoint(-.8,2.9,-state.depth,state.lightX,state.lightY);const b=projectPoint(-.8,2.9,-target.depth,target.lightX,target.lightY);penalty=Math.abs(a.x-b.x)*22+Math.abs(a.y-b.y)*23+Math.abs(a.scale-b.scale)*63;}
  else if(level===1){const a=projectPoint(state.bridgeX,1.75,-state.bridgeDepth,-.8,4.6);const b=projectPoint(target.bridgeX,1.75,-target.bridgeDepth,-.8,4.6);penalty=Math.abs(a.x-b.x)*25+Math.abs(a.y-b.y)*20+Math.abs(a.scale-b.scale)*40+Math.abs(state.bridgeAngle-target.bridgeAngle)*1.3;}
  else {penalty=Math.abs(state.poseLeft-target.poseLeft)*.48+Math.abs(state.poseRight-target.poseRight)*.48+Math.abs(state.spacing-target.spacing)*28;}
  return Math.round(Math.max(0,Math.min(100,100-penalty)));
}
export function hintFor(level,state,score){
  if(score>=WIN_SCORE)return '就位了，松手开演';
  if(score>=85)return '很接近了，再轻轻调整一点。';
  if(level===0){if(Math.abs(state.depth-1.05)>.25)return state.depth>1.05?'影子有些大，试着让影人贴近幕布。':'影子有些小，试着让影人远离幕布。';return '观察影子与轮廓的位置，再移动灯光。';}
  if(level===1){if(Math.abs(state.bridgeAngle)>5)return '桥面还倾斜着，试着调整景片倾角。';return '留意桥的长短与位置，让两侧接起来。';}
  if(Math.abs(state.spacing-2.15)>.2)return '两位影人的距离，还可以再调整。';return '轻提手杆，让两人的手势与轮廓相合。';
}
export function readProgress(storage){
  try{const data=JSON.parse(storage.getItem('borrow-light-v1')||'{}');return {completed:Array.isArray(data.completed)?[...new Set(data.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[],works:Array.isArray(data.works)?data.works.filter(w=>typeof w.image==='string'&&w.image.startsWith('data:image/')&&Number.isInteger(w.level)&&w.level>=0&&w.level<3).slice(0,6):[]};}catch{return {completed:[],works:[]};}
}
