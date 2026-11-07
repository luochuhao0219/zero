/** Curated reading and original digital interpretations; no external runtime requests. */
export const SOURCES = {
  regional: ['中国非遗网 · 江汉平原皮影戏', 'https://www.ihchina.cn/project_details/13398.html'],
  artist: ['中国非遗网 · 刘年华', 'https://www.ihchina.cn/ccr_detail/1787.html'],
  unesco: ['UNESCO · 中国皮影戏', 'https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421'],
};
export const ROOMS = [
  {id:'heritage',no:'01',name:'识影馆',en:'THE LIVING TRADITION',title:'一张影，藏着一方水土。',intro:'从江汉平原出发，认识幕布背后的地方记忆。',stop:'door',phase:'door',hint:'认识江汉皮影'},
  {id:'craft',no:'02',name:'影人工坊',en:'THE MAKING OF A SHADOW',title:'刻下纹样，让光穿过。',intro:'从皮料到影人，看看色彩、镂空和关节如何一起工作。',stop:'gate',phase:'gate',hint:'拆开一位影人'},
  {id:'stories',no:'03',name:'戏摊故事',en:'TONIGHT’S LITTLE PLAY',title:'看戏之前，先识戏中人。',intro:'点一盏灯，接一座桥，让两个影人在幕上相逢。',stop:'market',phase:'market',hint:'看看今晚演什么'},
  {id:'light',no:'04',name:'光影实验',en:'BEHIND THE SCREEN',title:'挪一盏灯，影子就不同。',intro:'没有目标分数，只有一盏灯、一张幕，和你的好奇心。',stop:'play',phase:'backstage',hint:'试试光与影'},
  {id:'compose',no:'05',name:'自由编戏',en:'A PLAY OF YOUR OWN',title:'这一次，戏由你来写。',intro:'选景、排人、提起手杆。把自己的这一幕收进留影册。',stop:'memories',phase:'memories',hint:'再编一出自己的戏'},
];
export const CRAFT = [
  {name:'制皮',title:'先让材料透过光。',text:'传统影人可以用兽皮或纸制作。皮料经过处理后成为透光的载体，后续的刻与彩都在它上面展开。',note:'观察：同一轮廓从素色材料变成有细节的影人。',mode:'material'},
  {name:'镂刻',title:'留住形，也留出光的路。',text:'外轮廓决定人物的形，内部镂空让服饰与纹样在幕上可辨。试着放大影人，看看衣缘和头饰。',note:'本页纹样来自本站原创影人，供观察镂空原理。',mode:'cut'},
  {name:'敷彩',title:'颜色在光里相遇。',text:'彩色影人透光时，服饰与装饰也参与讲故事。这里用本站的朱红、青绿两种配色，对照同一造型。',note:'切换配色，观察服饰与纹样；不代表传统角色分类。',mode:'color'},
  {name:'装缀',title:'让静止的身体有了动作。',text:'头、身与四肢连接后，操杆把幕后人的动作传到影人。拖动下方手杆角度，观察手臂绕肩部运动。',note:'这是简化的数字关节示意，并非完整制偶教学。',mode:'joint'},
];
export const STORY = [
  {title:'点灯 · 夜行人登场',line:'夜色深了。有人沿着街边的灯，走向一座尚未接起的桥。',task:'移动光源，调整影人与幕的距离，让归人的身影落在亮处。',detail:'第一幕认识光与投影。灯位改变影子的位置，影人离幕的距离影响影子大小。',actor:0,pose:22,scene:'moon'},
  {title:'搭桥 · 隔岸的人',line:'桥那边有人等候。把缺开的桥接上，让两个人的路连起来。',task:'移动桥面，再调整角度，让断开的桥影衔接。',detail:'第二幕认识景片。桥、树、桌椅也能成为幕上的角色，帮助观众理解故事发生在哪里。',actor:1,pose:48,scene:'bridge'},
  {title:'对戏 · 相逢一礼',line:'过了桥，灯下相见。两位影人面对彼此，以一礼结束今夜的小戏。',task:'调整两人的间距，提起手杆，让动作彼此呼应。',detail:'第三幕认识操演。人物的位置与手势组合起来，静止的造型便有了关系和情绪。',actor:0,pose:75,scene:'garden'},
];
export const COMPOSITION_KEY='borrow-light-compositions-v1';
export const DRAFT_KEY='borrow-light-draft-v1';
export function defaultDraft(){return {title:'灯下相逢',scene:'bridge',count:2,selected:0,actors:[{x:36,y:74,size:1,pose:40,variant:0,flip:false},{x:66,y:74,size:1,pose:65,variant:1,flip:true}]};}
/** Accept only our bounded form state, never arbitrary image paths or stored markup. */
export function sanitizeDraft(value){
  const d=defaultDraft(),clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
  if(!value||typeof value!=='object')return d;
  d.title=typeof value.title==='string'?value.title.slice(0,18):d.title;
  d.scene=['moon','bridge','garden'].includes(value.scene)?value.scene:d.scene;
  d.count=value.count===1?1:2;d.selected=value.selected===1&&d.count===2?1:0;
  d.actors=d.actors.map((a,i)=>{const b=value.actors?.[i]||{};return {x:clamp(b.x,16,84,a.x),y:clamp(b.y,45,86,a.y),size:clamp(b.size,.65,1.35,a.size),pose:clamp(b.pose,-30,120,a.pose),variant:b.variant===1?1:0,flip:typeof b.flip==='boolean'?b.flip:a.flip};});
  return d;
}
export function readJSON(storage,key,fallback){try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}}
export function readCompositions(storage){const value=readJSON(storage,COMPOSITION_KEY,[]);return Array.isArray(value)?value.filter(w=>w&&typeof w.image==='string'&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(w.image)&&w.image.length<600000&&typeof w.title==='string').slice(0,6).map(w=>({image:w.image,title:w.title.slice(0,18),date:typeof w.date==='string'?w.date:''})):[];}
