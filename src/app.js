import {ShadowStage} from './scene.js';
import {Journey} from './continuous-journey.js';
import {Exploration} from './explore.js';
import {TravelSound} from './travel-sound.js';
import {DirectControls} from './direct-controls.js';
import {LEVELS,WIN_SCORE,initialState,scoreState,readProgress} from './game.js';

const $=id=>document.getElementById(id);
let state=initialState(0),playing=false,completing=false,completedCurrent=false;
let progress=readProgress(localStorage),undoStack=[],grabSnapshot=null,autoTimer,completionTimer,toastTimer,layoutAnimation;
let audio=null,travelSound=null,soundEnabled=false,lastSound=0;const audioGains=[];
const stage=new ShadowStage($('stage'));
const direct=new DirectControls(stage,{onGrab:beginGrab,onChange:applyChange,onRelease:endGrab,onCancel:()=>{grabSnapshot=null;},onHover:updateHint});
const journey=new Journey({stage,onEnter:index=>enterGame(index ?? nextIncomplete()),onLeave:exitGame,onCollection:()=>openSheet('collection-dialog'),onProgress:(p)=>travelSound?.set(p,soundEnabled,playing)});
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const instructions=[
  [['拖住灯','上下左右移动，观察影子往哪边走。'],['推拉影人','抓住影人的身体，沿幕布前后移动。离幕越远，影子越大。']],
  [['拖住右侧桥面','左右移动、前后推拉，让它与幕上的桥影接起来。'],['转动桥端','抓住桥端的圆点画一个弧，把桥面转平。滚轮也能旋转。']],
  [['拉近影人','拖动身体，调整两个人之间的距离。'],['提起手杆','抓住手旁的圆点，绕肩膀画弧，做出轮廓里的姿态。']]
];
const defaultHints=[['抓住灯，试着移动','再推拉影人，调整影子的大小'],['抓住右侧桥面','拖动桥端的小圆点可以旋转'],['抓住影人的手杆','拖动身体可调整两人的距离']];

function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function openSheet(id){clearTimeout(autoTimer);direct.cancel();$(id).showModal();direct.enabled=false;}
function anySheetOpen(){return !!document.querySelector('dialog[open]');}
function moveStage(change){
 const el=$('stage-container'),before=el.getBoundingClientRect(),fromVisible=before.bottom>0&&before.top<innerHeight;layoutAnimation?.cancel();change();stage.resize();const after=el.getBoundingClientRect();if(reduced())return;
 const keyframes=fromVisible?[{transformOrigin:'0 0',transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`},{transformOrigin:'0 0',transform:'none'}]:[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}];
 layoutAnimation=el.animate(keyframes,{duration:fromVisible?850:600,easing:'cubic-bezier(.22,1,.36,1)'});layoutAnimation.finished.then(()=>stage.resize()).catch(()=>{});
}
function setView(back){direct.cancel();stage.setView(back);$('front-view').classList.toggle('active',!back);$('back-view').classList.toggle('active',back);$('front-view').setAttribute('aria-pressed',String(!back));$('back-view').setAttribute('aria-pressed',String(back));$('hero-view-toggle').innerHTML=back?'回到幕前 <span>↗</span>':'绕到幕后 <span>↗</span>';updateHint(null);}
function updateHint(target){const fallback=defaultHints[state.level];$('interaction-title').textContent=target?.label||fallback[0];$('interaction-detail').textContent=target?.hint||fallback[1];}
function sync(){const score=scoreState(state.level,state);$('match-score').textContent=score;$('match-fill').style.width=`${score}%`;$('alignment').classList.toggle('ready',score>=WIN_SCORE);$('match-hint').textContent=score>=WIN_SCORE?'就位了，松手开演':score>80?'再靠近一点':'让影子贴合轮廓';stage.setState(state,playing);$('undo-action').disabled=!undoStack.length;}
function renderChapters(){document.querySelectorAll('[data-level]').forEach(button=>{const i=Number(button.dataset.level);button.classList.toggle('active',playing&&state.level===i);button.classList.toggle('done',progress.completed.includes(i));button.querySelector('small').textContent=progress.completed.includes(i)?'✓':String(i+1).padStart(2,'0');});}
function renderHelp(){$('help-instructions').replaceChildren();instructions[state.level].forEach(([title,description],i)=>{const row=document.createElement('div');row.className='help-step';const number=document.createElement('span');number.textContent=String(i+1);const text=document.createElement('div'),heading=document.createElement('strong'),p=document.createElement('p');heading.textContent=title;p.textContent=description;text.append(heading,p);row.append(number,text);$('help-instructions').append(row);});}
function cancelPerformance(){clearTimeout(autoTimer);clearTimeout(completionTimer);completing=false;document.body.classList.remove('is-performing');stage.celebration=-1;direct.enabled=!anySheetOpen();direct.reset();grabSnapshot=null;}
function loadLevel(index){cancelPerformance();state=initialState(index);completedCurrent=false;undoStack=[];stage.transitionStart=stage.time;$('level-number').textContent=`${String(index+1).padStart(2,'0')} / 03`;$('level-title').textContent=LEVELS[index].name;$('level-description').textContent=LEVELS[index].description;sync();renderChapters();renderHelp();setView(index<2);if(!reduced())document.querySelector('.game-heading').animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:500,easing:'ease-out'});}
function enterGame(index=0){if(playing||completing)return;if(!journey.canPlay()){journey.requestPlay(index);return;}if(stage.fallback){toast('当前设备不能运行三维操作，请在新版 Chrome 或 Safari 中打开。');return;}journey.setGameActive(true);moveStage(()=>{playing=true;document.body.classList.add('is-playing');travelSound?.set(1,soundEnabled,true);$('game-interface').hidden=false;stage.setPlaying(true);loadLevel(index);});$('stage').focus({preventScroll:true});}
function exitGame({memories=false}={}){cancelPerformance();$('complete-dialog').close();moveStage(()=>{playing=false;document.body.classList.remove('is-playing');$('game-interface').hidden=true;stage.setPlaying(false);stage.setState(state,false);setView(false);if(memories){journey.setGameActive(false);journey.goTo('memories');}else journey.returnToPlay();travelSound?.set(1,soundEnabled,false);});renderChapters();}
function nextIncomplete(){const i=LEVELS.findIndex((_,n)=>!progress.completed.includes(n));return i<0?0:i;}

function beginGrab(){if(!playing||completing)return;clearTimeout(autoTimer);if(!grabSnapshot)grabSnapshot={...state};}
function applyChange(patch){if(!playing||completing)return;state={...state,...patch};sync();tickSound();}
function endGrab(){if(grabSnapshot&&JSON.stringify(grabSnapshot)!==JSON.stringify(state)){undoStack.push(grabSnapshot);if(undoStack.length>30)undoStack.shift();}grabSnapshot=null;sync();considerCompletion();}
function considerCompletion(){clearTimeout(autoTimer);if(document.hidden||!playing||completing||completedCurrent||anySheetOpen()||scoreState(state.level,state)<WIN_SCORE)return;autoTimer=setTimeout(()=>{if(document.hidden||!playing||completing||direct.drag||scoreState(state.level,state)<WIN_SCORE)return;state={...state,...LEVELS[state.level].target};sync();completeLevel();},500);}
function undo(){if(!undoStack.length||completing)return;clearTimeout(autoTimer);state=undoStack.pop();grabSnapshot=null;direct.reset();sync();toast('已撤销这一步');}
function saveProgress(){try{localStorage.setItem('borrow-light-v1',JSON.stringify(progress));}catch{toast('本次留影暂存在页面中，可先下载。');}}
function renderWorks(){const root=$('works-grid');root.replaceChildren();$('empty-collection').hidden=!!progress.works.length;const workCount=progress.works.length+document.querySelectorAll('#composition-works figure').length;$('collection-count').textContent=workCount;$('works-count').textContent=String(workCount).padStart(2,'0');for(const work of progress.works){const figure=document.createElement('figure');figure.className='work-item';const image=document.createElement('img');image.src=work.image;image.alt=`${LEVELS[work.level].name}留影`;const caption=document.createElement('figcaption'),name=document.createElement('span'),date=document.createElement('small'),download=document.createElement('button');name.textContent=LEVELS[work.level].name;date.textContent=new Date(work.date||Date.now()).toLocaleDateString('zh-CN');name.append(date);download.textContent='下载 ↗';download.setAttribute('aria-label',`下载${LEVELS[work.level].name}留影`);download.addEventListener('click',()=>{const link=document.createElement('a');link.href=work.image;link.download=`借光-${LEVELS[work.level].name}.webp`;link.click();});caption.append(name,download);figure.append(image,caption);root.append(figure);}}
function completeLevel(){
  if(completing||completedCurrent||!playing)return;completing=true;completedCurrent=true;direct.enabled=false;direct.cancel();setView(false);document.body.classList.add('is-performing');
  const image=stage.capturePoster(state.level);progress.completed=[...new Set([...progress.completed,state.level])];progress.works=[{id:Date.now(),date:new Date().toISOString(),level:state.level,image},...progress.works.filter(w=>w.level!==state.level)];saveProgress();renderWorks();renderChapters();
  $('performance-line').textContent=['灯点好了，影人登场。','桥接上了，过桥。','两人对上一礼。'][state.level];const duration=stage.celebrate();
  $('complete-ending').hidden=state.level!==2;
  $('complete-eyebrow').textContent=`${String(state.level+1).padStart(2,'0')} / 完成`;$('complete-title').textContent=LEVELS[state.level].end;$('next-level').innerHTML=state.level<2?`下一幕，${LEVELS[state.level+1].name} <span>→</span>`:'再玩一次 <span>↗</span>';
  completionTimer=setTimeout(()=>{if(!playing)return;completing=false;document.body.classList.remove('is-performing');$('complete-dialog').showModal();},duration);
}

function tickSound(){if(!soundEnabled||!audio||audio.currentTime-lastSound<.16)return;lastSound=audio.currentTime;const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=350+scoreState(state.level,state)*3;gain.gain.setValueAtTime(.012,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.12);}
async function toggleSound(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();for(const frequency of [146.83,220]){const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=frequency;gain.gain.value=0;osc.connect(gain).connect(audio.destination);osc.start();audioGains.push(gain);}travelSound=new TravelSound(audio);}await audio.resume();soundEnabled=!soundEnabled;travelSound.set(journey.intro.progress,soundEnabled,playing);audioGains.forEach((gain,i)=>gain.gain.setTargetAtTime(soundEnabled?(i?.0015:.002):0,audio.currentTime,.3));$('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));$('sound-toggle').setAttribute('aria-label',soundEnabled?'关闭声音':'开启声音');}catch{toast('声音暂时无法开启。');}}

$('start-game').addEventListener('click',()=>enterGame(nextIncomplete()));$('exit-game').addEventListener('click',exitGame);$('home-link').addEventListener('click',e=>{e.preventDefault();if(playing){exitGame();journey.afterTransition=0;}else journey.goTo('home');});
$('about-open').addEventListener('click',()=>openSheet('about-dialog'));$('collection-open').addEventListener('click',()=>openSheet('collection-dialog'));$('help-toggle').addEventListener('click',()=>openSheet('help-dialog'));
$('sound-toggle').addEventListener('click',toggleSound);$('hero-view-toggle').addEventListener('click',()=>setView(!stage.backstage));$('replay-intro').addEventListener('click',()=>{setView(false);stage.replayIntro();});$('front-view').addEventListener('click',()=>setView(false));$('back-view').addEventListener('click',()=>setView(true));
$('undo-action').addEventListener('click',undo);$('reset-level').addEventListener('click',()=>loadLevel(state.level));
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{if(completing)return;const i=Number(button.dataset.level);if(playing)loadLevel(i);else enterGame(i);}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{direct.enabled=!completing&&!anySheetOpen();if(playing){$('stage').focus({preventScroll:true});considerCompletion();}});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
$('complete-hall').addEventListener('click',exitGame);
$('complete-ending').addEventListener('click',()=>exitGame({memories:true}));
$('collection-start').addEventListener('click',()=>{$('collection-dialog').close();enterGame(nextIncomplete());});$('close-complete').addEventListener('click',()=>$('complete-dialog').close());$('next-level').addEventListener('click',()=>{$('complete-dialog').close();loadLevel((state.level+1)%3);});$('view-collection').addEventListener('click',()=>{
  $('complete-dialog').close();
  $('collection-dialog').addEventListener('close',()=>{
    if(playing&&completedCurrent&&!completing&&!anySheetOpen())$('complete-dialog').showModal();
  },{once:true});
  openSheet('collection-dialog');
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(autoTimer);direct.cancel();}else if(playing)considerCompletion();});
document.addEventListener('keydown',e=>{if(anySheetOpen())return;if(e.code==='Space'&&playing&&!e.repeat&&!completing){e.preventDefault();setView(!stage.backstage);}if(e.key==='Escape'&&playing)exitGame();if(playing&&!completing&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}if(playing&&!completing&&e.key.toLowerCase()==='r')loadLevel(state.level);});
const exploration=new Exploration({journey,toast,onPause:()=>{if(completing){toast('这幕演完，就能继续探索。');return false;}clearTimeout(autoTimer);direct.cancel();direct.enabled=false;return true;},onResume:()=>{direct.enabled=!completing&&!anySheetOpen();if(playing)considerCompletion();},onPlay:enterGame});
renderWorks();renderChapters();renderHelp();stage.setState(state,false);if(stage.fallback)$('start-game').setAttribute('aria-disabled','true');
// Read-only state and coordinate projection support real mouse/touch QA, not test-only controls.
window.borrowLightDiagnostics=()=>({...stage.diagnostics(),journey:journey.diagnostics(),state:{...state},playing,performing:completing,score:scoreState(state.level,state),completed:[...progress.completed],works:progress.works.length,exploration:{open:!exploration.dialog.hidden,room:exploration.active,works:exploration.works.length},undoCount:undoStack.length,direct:direct.diagnostics()});
window.borrowLightProject=(x,y,z)=>direct.screen(stage.lookAt.clone().set(x,y,z));
