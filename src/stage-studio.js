import {COMPOSITION_KEY,DRAFT_KEY,sanitizeDraft,selectFrame} from './explore-data.js';
import {STORY_STARTERS,starterDraft,samplePlay,copySavedDraft,PLAY_DURATION,compilePlay,getPlayDuration} from './studio-story.js';
import {StudioPainter} from './studio-painter.js';
import {StudioWorld,propArtwork} from './studio-world.js';
import {StudioControls} from './studio-controls.js';
import {StudioSound,SOUNDTRACKS,soundtrack} from './theater-score.js';
import {paperPoint,bound,sceneryDefault} from './studio-space.js';
import {MOTIONS,motionInfo} from './motion-clips.js';
import {materializeActionKeys} from './motion-timeline.js';
import {puppetCanvas} from './art.js';
import {restoreStudio,saveStudioWork} from './studio-storage.js';
import {createWorkActions,deleteSavedWork} from './collection-actions.js';
const $=id=>document.getElementById(id);
const labels=['起场','发展','落幕'];
const props={lantern:'灯笼',umbrella:'纸伞',book:'书卷'};
const scenes={bridge:'小桥',garden:'花枝',moon:'月门'};

/** Direct staging on the original game canvas, unlocked after the three lessons. */
export class StageStudio {
  constructor({stage,toast,onExit,onAudio=()=>{}}){
    Object.assign(this,{stage,toast,onExit,onAudio});this.active=false;this.undoStack=[];this.snapCandidate=null;
    this.storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
    Object.assign(this,restoreStudio(this.storage));
    this.painter=new StudioPainter();this.sound=new StudioSound({onStateChange:()=>this.syncAudio(),onError:()=>this.toast('配乐暂时无法播放，请再试一次。')});this.world=stage.fallback?null:new StudioWorld(stage,this.painter);this.controls=stage.fallback?null:new StudioControls(this);
    this.mount();this.mountCollection();this.mountPlayer();this.renderWorks();
    stage.onStudioTick=now=>this.tick(now);const previous=stage.onFrame;stage.onFrame=()=>{previous?.();if(this.active)this.positionControls();};
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.musicPreview=false;this.sound.stop();this.stopPerformance();this.stopPlayer();this.controls?.cancel(true);}});
    document.fonts.ready.then(()=>{if(this.active){this.world.backgroundKey=null;this.changed(false);}this.renderFrames();});
  }
  frame(){return this.draft.frames[this.draft.frame];}
  actors(){return this.keyEdit?this.frame().actions[this.keyEdit.actionIndex].keys[this.keyEdit.keyIndex].actors:this.draft.actors;}
  displayFrame(){return {...this.frame(),actors:this.actors()};}
  paperPosition(point){return paperPoint(point.x,point.y);}
  mount(){
    const root=document.createElement('section');root.id='stage-studio';root.className='stage-studio';root.hidden=true;root.setAttribute('aria-label','自由开演，直接拖动影人、手杆与道具');
    root.innerHTML=`<header class="staging-header"><div><button id="staging-exit" class="staging-return">← 返回内厅</button><p class="staging-eyebrow">三幕之后 · 自由开演</p><button id="staging-title" class="staging-title" title="给小戏起名"></button><input id="staging-title-input" maxlength="18" aria-label="小戏名字" hidden></div><div class="staging-tools"><button id="staging-undo" aria-label="撤销上一步">↶</button><button id="staging-old">旧戏票</button><button id="staging-download" aria-label="下载当前封面" title="下载当前封面">↓</button><button id="staging-help" aria-expanded="false">玩法</button><button id="staging-sound">静静看戏</button></div></header>
    <nav class="staging-stories" aria-label="抽一张故事签">${STORY_STARTERS.map(s=>`<button data-story="${s.id}" title="${s.prompt}">${s.title}</button>`).join('')}<button data-story="blank">自编一出 ＋</button></nav>
    <div id="staging-hint" class="staging-hint" role="status">拖手屈肘，拖脚弯膝；点影人，试试低头与下蹲。</div>
    <aside class="staging-rack staging-actors" aria-label="影人挂架"><span>取影</span>${[0,1].map(i=>`<button data-take-actor="${i}" aria-label="取出${i?'青绿':'朱红'}影人"><img alt=""><small>${i?'青绿':'朱红'}</small></button>`).join('')}</aside>
    <div class="staging-right-tools"><aside class="staging-rack staging-props" aria-label="道具箱"><span>拾物</span>${Object.entries(props).map(([kind,name])=>`<button data-take-prop="${kind}" aria-label="取出${name}"><img alt=""><small>${name}</small></button>`).join('')}</aside>
    <div class="staging-scenery" aria-label="景片架"><span>换一片景</span>${Object.entries(scenes).map(([scene,name])=>`<button data-take-scene="${scene}">${name}</button>`).join('')}</div></div>
    <button id="staging-light" class="staging-light" title="点击灯笼，更换灯色">一盏暖灯 ◌</button>
    <div id="staging-context" class="staging-context" hidden><button id="staging-flip">转身 ↔</button><button id="staging-give-left">交给朱红</button><button id="staging-give-right">交给青绿</button><button id="staging-remove">收起</button></div>
    <span id="staging-snap" class="staging-snap" hidden aria-hidden="true"><i></i><small>松手，交给他</small></span><button id="staging-line" class="staging-line" title="点击写一句台词"></button><input id="staging-line-input" class="staging-line-input" maxlength="36" aria-label="这一幕的台词" hidden>
    <footer class="staging-bottom"><div class="staging-motion-bar"><button id="staging-add-motion" aria-expanded="false">排一个动作 ＋</button><div id="staging-motion-list" aria-label="这一幕的动作顺序"></div></div><div id="staging-key-strip" class="staging-key-strip" hidden></div><div class="staging-frames" aria-label="三张小戏票">${labels.map((name,i)=>`<button data-staging-frame="${i}" aria-pressed="${i===0}"><canvas width="180" height="104" aria-hidden="true"></canvas><span>${['一','二','三'][i]} · ${name}</span></button>`).join('')}</div><div class="staging-actions"><button id="staging-next">记下这一幕 →</button><button id="staging-play">开演 ▶</button><button id="staging-save">收进留影册</button></div><p id="staging-status" role="status">三张戏票，记下你的起承转合。</p></footer>
    <aside id="staging-sound-menu" class="staging-sound-menu" hidden aria-label="选择戏台配乐"><div class="staging-sound-heading"><span>给这一出配乐</span><button id="staging-sound-close" aria-label="收起配乐选择">×</button></div>${SOUNDTRACKS.map(s=>`<button data-sound="${s.id}" aria-pressed="false"><strong>${s.name}</strong><small>${s.detail}</small></button>`).join('')}<label for="staging-volume">音量 <output id="staging-volume-value"></output></label><input type="range" id="staging-volume" min="0" max="100" step="5" aria-label="配乐音量"><button id="staging-listen">试听配乐 ▶</button><p>选一支曲子就能试听，开演和收藏回放会沿用。</p></aside>
    <aside id="staging-motion-menu" class="staging-motion-menu" hidden aria-label="选一个动作"><div class="staging-motion-heading"><span>谁来演</span><button data-motion-actor="0" aria-pressed="true">朱红</button><button data-motion-actor="1" aria-pressed="false">青绿</button><button data-motion-actor="-1" aria-pressed="false">两位</button><button id="staging-motion-close" aria-label="收起动作签">×</button></div><div class="staging-motion-choices">${MOTIONS.map(m=>`<button data-motion="${m.id}">${m.name}</button>`).join('')}</div><p>每幕最多三个动作；左右拖动动作签下沿，安排快慢。</p></aside>
    <div id="staging-old-works" class="staging-old-works" hidden><button id="staging-old-close">收起旧戏票 ×</button><div id="staging-old-grid"></div></div>
    <div id="staging-help-copy" class="staging-help-copy" hidden><strong>用手排一出戏</strong><p>拖身体换站位，拖前后手让肘部屈伸，拖脚让膝盖弯曲。点影人，再拖头部低头、拖腰部下蹲。小圆点可以单独调肘、腕、膝。道具拖到手边，亮起后松手。</p><p>滚轮或双指缩放影人；点影人后可转身、收起。键盘 1/2 选影人，方向键移动，Q/E 转动所选关节，F 转身，Ctrl/⌘ Z 撤销。</p><p>每幕可排三个动作。动作签下沿拖动调快慢，左右箭头调整顺序，点「调姿」改动作中间的姿势。点开演，三幕就连成一出戏。</p></div>`;
    $('stage-container').append(root);this.root=root;
    this.handles=Array.from({length:16},()=>{const button=document.createElement('button');button.className='staging-hand-grab';button.hidden=true;button.innerHTML='<i></i><span></span>';button.addEventListener('pointerdown',event=>{if(button.target)this.controls.down(event,button.target);});button.addEventListener('focus',()=>{if(button.target)this.select(button.target.kind,button.target.index,button.target);});button.addEventListener('keydown',event=>this.controls.key(event));root.append(button);return button;});
    this.mountMotions();
    for(const button of root.querySelectorAll('[data-take-actor]')){button.querySelector('img').src=puppetCanvas(45,Number(button.dataset.takeActor)).toDataURL('image/webp');this.bindTake(button,'actor',Number(button.dataset.takeActor));}
    for(const button of root.querySelectorAll('[data-take-prop]')){button.querySelector('img').src=propArtwork(button.dataset.takeProp).toDataURL('image/webp');this.bindTake(button,'prop',button.dataset.takeProp);}
    for(const button of root.querySelectorAll('[data-take-scene]'))this.bindTake(button,'scenery',button.dataset.takeScene);
    root.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>{this.controls.cancel(true);this.beginChange();this.stopPerformance();this.musicPreview=false;this.sound.stop();this.keyEdit=null;this.draft=starterDraft(b.dataset.story);this.editingWork=null;if(b.dataset.story==='blank')this.draft.frames.forEach(f=>f.actors.forEach(a=>a.present=false));this.selection=null;this.changed();this.finishChange();this.hint(STORY_STARTERS.find(s=>s.id===b.dataset.story)?.prompt||'从挂架取一个影人，让自己的故事开场。');}));
    root.querySelectorAll('[data-staging-frame]').forEach(b=>b.addEventListener('click',()=>this.goFrame(Number(b.dataset.stagingFrame))));
    $('staging-next').addEventListener('click',()=>{if(this.draft.frame===2)this.startPerformance();else this.goFrame(this.draft.frame+1);});
    $('staging-play').addEventListener('click',()=>this.playback?this.stopPerformance():this.startPerformance());$('staging-save').addEventListener('click',()=>this.saveComposition());
    $('staging-download').addEventListener('click',()=>{const link=document.createElement('a');link.href=this.painter.poster(this.draft);link.download='借光-'+(this.draft.title||'无题小戏')+'.webp';link.click();});
    $('staging-exit').addEventListener('click',()=>this.onExit());$('staging-undo').addEventListener('click',()=>this.undo());
    $('staging-old').addEventListener('click',()=>{$('staging-old-works').hidden=!$('staging-old-works').hidden;});$('staging-old-close').addEventListener('click',()=>$('staging-old-works').hidden=true);
    $('staging-help').addEventListener('click',()=>{const hidden=!$('staging-help-copy').hidden;$('staging-help-copy').hidden=hidden;$('staging-help').setAttribute('aria-expanded',String(!hidden));});
    $('staging-light').addEventListener('click',()=>{this.beginChange();const values=['warm','moon','rain'];this.draft.light=values[(values.indexOf(this.draft.light)+1)%3];this.changed();this.finishChange();});
    this.mountSound();
    $('staging-flip').addEventListener('click',()=>{this.beginChange();const actor=this.actors()[this.draft.selected];actor.flip=!actor.flip;this.changed();this.finishChange();});
    for(const [id,index] of [['staging-give-left',0],['staging-give-right',1]])$(id).addEventListener('click',()=>{if(index>=this.draft.count||this.actors()[index].present===false){this.toast('先把这位影人取到幕上。');return;}this.beginChange();this.frame().prop.holder=index;this.changed();this.finishChange();});
    $('staging-remove').addEventListener('click',()=>{if(!this.selection)return;this.beginChange();if(this.selection.kind==='prop')this.frame().prop.kind='none';else if(this.selection.kind==='scenery'){this.hint('景片可以拖动，或从景片架换一片。');return;}else{if(this.frame().prop.holder===this.draft.selected){const mesh=this.world.props[this.frame().prop.kind],point=this.paperPosition(mesh.position);Object.assign(this.frame().prop,point,{holder:-1});}this.actors()[this.draft.selected].present=false;}this.selection=null;this.changed();this.finishChange();});
    for(const key of ['title','line'])this.bindWriting(key);
  }
  syncAudio(){this.onAudio(!!(this.sound?.active||this.playerSound?.active));if(this.root)this.renderSound();}
  mountSound(){
    $('staging-sound').setAttribute('aria-expanded','false');$('staging-sound').addEventListener('click',()=>{const open=$('staging-sound-menu').hidden;$('staging-sound-menu').hidden=!open;$('staging-sound').setAttribute('aria-expanded',String(open));});
    $('staging-sound-close').addEventListener('click',()=>{$('staging-sound-menu').hidden=true;$('staging-sound').setAttribute('aria-expanded','false');});
    this.root.querySelectorAll('[data-sound]').forEach(b=>b.addEventListener('click',()=>{this.beginChange();this.draft.sound=b.dataset.sound;this.musicPreview=this.draft.sound!=='none';this.sound.start(this.draft.sound,this.draft.soundVolume??.4);this.changed();this.finishChange();}));
    $('staging-listen').addEventListener('click',()=>{if(this.sound.active||this.sound.context){this.musicPreview=false;this.sound.stop();}else{if(this.draft.sound==='none'){this.beginChange();this.draft.sound='strings';this.changed();this.finishChange();}this.musicPreview=true;this.sound.start(this.draft.sound,this.draft.soundVolume??.4);}this.renderSound();});
    $('staging-volume').addEventListener('input',()=>{this.beginChange();this.draft.soundVolume=Number($('staging-volume').value)/100;this.sound.setVolume(this.draft.soundVolume);$('staging-volume-value').textContent=$('staging-volume').value+'%';});
    $('staging-volume').addEventListener('change',()=>{this.changed();this.finishChange();});
  }
  renderSound(){
    $('staging-sound').textContent=soundtrack(this.draft.sound).name+(this.sound?.active?' ♫':'');this.root.querySelectorAll('[data-sound]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sound===soundtrack(this.draft.sound).id)));$('staging-volume').value=Math.round((this.draft.soundVolume??.4)*100);$('staging-volume-value').textContent=$('staging-volume').value+'%';$('staging-listen').textContent=this.sound?.active?'暂停试听 ■':'试听配乐 ▶';
  }
  mountMotions(){
    this.motionActor=0;$('staging-add-motion').addEventListener('click',()=>{const open=$('staging-motion-menu').hidden;$('staging-motion-menu').hidden=!open;$('staging-add-motion').setAttribute('aria-expanded',String(open));});
    $('staging-motion-close').addEventListener('click',()=>this.closeMotionMenu());
    this.root.querySelectorAll('[data-motion-actor]').forEach(b=>b.addEventListener('click',()=>{this.motionActor=Number(b.dataset.motionActor);this.root.querySelectorAll('[data-motion-actor]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));}));
    this.root.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>{
      const actions=this.frame().actions||[];if(actions.length>=3){this.toast('这一幕已经有三个动作，可以先收起一个。');return;}
      const actor=this.motionActor,actors=this.draft.actors;if((actor===-1?actors.slice(0,this.draft.count):[actors[actor]]).some(a=>a?.present===false)||actor>=this.draft.count){this.toast('先从挂架把影人取到幕上。');return;}
      const type=b.dataset.motion;if(type==='offer'&&(this.draft.count<2||actors.some(a=>a.present===false)||Math.abs(actors[0].x-actors[1].x)>=27||Math.abs(actors[0].y-actors[1].y)>=10)){this.toast('先让两位影人站近些，伸手就能够到对方。');return;}
      this.beginChange();this.keyEdit=null;this.frame().actions=actions;actions.push({type,actor,duration:motionInfo(type).duration});this.selection=null;this.changed();this.finishChange();this.closeMotionMenu();this.hint('动作已排好。点「调姿」改中间姿势，点 ▶ 试演这一段。');
    }));
  }
  closeMotionMenu(){$('staging-motion-menu').hidden=true;$('staging-add-motion').setAttribute('aria-expanded','false');}
  editMotion(index){
    this.controls.cancel(true);this.stopPerformance();this.beginChange();const action=this.frame().actions[index];action.keys=materializeActionKeys(this.draft,this.draft.frame,index);this.keyEdit={actionIndex:index,keyIndex:Math.floor(action.keys.length/2)};this.draft.selected=action.actor===1?1:0;this.selection={kind:'actor',index:this.draft.selected};this.changed();this.finishChange();this.hint('现在调的是动作中的一个姿势。拖手、脚、头或腰，修改会保留在这段动作里。');
  }
  renderMotions(){
    this.root.classList.toggle('is-editing-pose',!!this.keyEdit);const list=$('staging-motion-list');if(!list)return;list.replaceChildren();const actions=this.frame().actions||[];
    actions.forEach((action,index)=>{
      const info=motionInfo(action.type),card=document.createElement('div');card.className='staging-motion-card';card.classList.toggle('is-editing',this.keyEdit?.actionIndex===index);const title=document.createElement('span');title.textContent=info.name+' · '+(action.actor===-1?'两位':action.actor===1?'青绿':'朱红');card.append(title);
      const buttons=document.createElement('div');const add=(text,label,run,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',run);buttons.append(b);};
      add('▶','试演'+info.name,()=>this.startPerformance(index));add('调姿','调整'+info.name+'的中间姿态',()=>this.editMotion(index));
      for(const direction of [-1,1])add(direction<0?'‹':'›',direction<0?'动作前移':'动作后移',()=>{this.beginChange();this.keyEdit=null;[actions[index],actions[index+direction]]=[actions[index+direction],actions[index]];this.changed();this.finishChange();},index+direction<0||index+direction>=actions.length);
      add('×','收起'+info.name,()=>{this.beginChange();this.keyEdit=null;actions.splice(index,1);this.changed();this.finishChange();});card.append(buttons);
      const duration=document.createElement('button');duration.className='staging-motion-duration';duration.setAttribute('role','slider');duration.setAttribute('aria-label',info.name+'的时长，左右拖动或方向键调整');duration.setAttribute('aria-valuemin','.7');duration.setAttribute('aria-valuemax','8');const update=()=>{duration.textContent='↔ '+action.duration.toFixed(1)+' 秒';duration.setAttribute('aria-valuenow',action.duration.toFixed(1));};update();let drag=null;
      duration.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();this.beginChange();drag={x:event.clientX,value:action.duration,id:event.pointerId};duration.setPointerCapture(event.pointerId);});
      duration.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;action.duration=Math.round(bound(drag.value+(event.clientX-drag.x)/30,.7,8)*10)/10;update();});
      duration.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;drag=null;this.changed();this.finishChange();});
      duration.addEventListener('pointercancel',()=>{if(drag){drag=null;this.cancelChange();}});
      duration.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();this.beginChange();action.duration=Math.round(bound(action.duration+(['ArrowLeft','ArrowDown'].includes(event.key)?-.2:.2),.7,8)*10)/10;this.changed();this.finishChange();$('staging-motion-list').querySelectorAll('[role=slider]')[index]?.focus();});card.append(duration);list.append(card);
    });
    if(!actions.length){const empty=document.createElement('span');empty.className='staging-motion-empty';empty.textContent='先排站位，再添动作';list.append(empty);}
    $('staging-add-motion').disabled=actions.length>=3;const strip=$('staging-key-strip');strip.replaceChildren();strip.hidden=!this.keyEdit;
    if(this.keyEdit){const {actionIndex,keyIndex}=this.keyEdit,action=actions[actionIndex],info=motionInfo(action.type);action.keys.forEach((key,i)=>{const button=document.createElement('button');button.textContent=info.poses[i]||'姿势 '+(i+1);button.setAttribute('aria-pressed',String(i===keyIndex));button.addEventListener('click',()=>{this.controls.cancel(true);this.keyEdit={actionIndex,keyIndex:i};this.selection={kind:'actor',index:this.draft.selected};this.changed(false);this.renderMotions();});strip.append(button);});const exit=document.createElement('button');exit.textContent='回到这一幕 ↶';exit.addEventListener('click',()=>{this.keyEdit=null;this.changed(false);this.renderMotions();});strip.append(exit);}
  }
  bindWriting(key){
    const button=$('staging-'+key),input=$('staging-'+key+'-input');button.addEventListener('click',()=>{input.value=key==='title'?this.draft.title:this.frame().line;input.hidden=false;button.hidden=true;input.focus();input.select();});
    const commit=()=>{if(input.hidden)return;this.beginChange();if(key==='title')this.draft.title=input.value.slice(0,18);else this.frame().line=input.value.slice(0,36);input.hidden=true;button.hidden=false;this.changed();this.finishChange();};
    input.addEventListener('blur',commit);input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();commit();this.stage.canvas.focus();}else if(event.key==='Escape'){input.hidden=true;button.hidden=false;this.stage.canvas.focus();}});
  }
  bindTake(button,kind,value){
    let press=null;
    button.addEventListener('pointerdown',event=>{if(event.button!==0||this.playback)return;event.preventDefault();press={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};button.setPointerCapture(event.pointerId);});
    button.addEventListener('pointermove',event=>{if(!press||event.pointerId!==press.id)return;if(!press.moved&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8){press.moved=true;this.take(kind,value);const target={kind,index:kind==='actor'?value:undefined,spawn:true};this.controls.down({button:0,pointerId:event.pointerId,pointerType:event.pointerType,clientX:event.clientX,clientY:event.clientY,preventDefault:()=>event.preventDefault()},target);}if(press.moved)this.controls.move(event);});
    button.addEventListener('pointerup',event=>{if(!press||event.pointerId!==press.id)return;const moved=press.moved;press=null;if(moved)this.controls.up(event);else this.take(kind,value);});
    button.addEventListener('pointercancel',event=>{if(press?.id!==event.pointerId)return;press=null;this.controls.cancel(true);});
    button.addEventListener('click',event=>{if(event.detail===0)this.take(kind,value);});
  }
  take(kind,value){
    if(this.playback)return;this.beginChange();if(kind==='actor'){this.draft.count=Math.max(this.draft.count,value+1);this.draft.selected=value;this.actors()[value].present=true;this.select('actor',value);}
    else if(kind==='prop'){this.frame().prop={kind:value,x:50,y:65,holder:-1};this.select('prop');}
    else{this.draft.scene=value;this.frame().scenery=sceneryDefault(value);this.select('scenery');}
    this.changed();this.finishChange();this.hint(kind==='actor'?'影人登场了。拖身体换站位，抓手杆做动作。':kind==='prop'?'把道具拖到手边，亮起后松手。':'景片已入幕，直接拖动它调整位置。');
  }
  open(){
    if(!this.world)return;this.fontsReady||=Promise.all(['Studio Song','Studio WenKai'].map(font=>document.fonts.load(`16px "${font}"`))).then(()=>{this.world.backgroundKey=null;if(this.active&&!this.playback)this.world.set(this.draft,this.displayFrame());this.renderFrames();this.stage.signPainters.forEach(paint=>paint());}).catch(()=>{});this.active=true;this.root.hidden=false;this.selection=null;this.stage.celebration=-1;this.stage.setView(false);this.stage.dragOffset=0;this.stage.studioCamera=true;this.world.set(this.draft,this.displayFrame());this.changed(false);this.renderMotions();this.renderFrames();this.stage.canvas.setAttribute('aria-label','自由开演戏台。拖影人、拉手杆，拖道具到手边吸附。方向键移动，Q/E 转动所选关节，F 转身。');
  }
  close(){this.musicPreview=false;this.sound.stop();this.controls?.cancel(true);this.stopPerformance();this.keyEdit=null;this.active=false;this.root.hidden=true;this.stage.studioCamera=false;this.world?.clear();}
  select(kind,index,detail={}){if(index!==undefined)this.draft.selected=index;this.selection={kind,index,side:detail.side,joint:detail.joint,part:detail.part};this.root.classList.remove('has-snap');this.positionControls();}
  beginChange(){if(!this.beforeChange)this.beforeChange={draft:sanitizeDraft(this.draft),editingWork:this.editingWork};}
  finishChange(){if(!this.beforeChange)return;if(JSON.stringify(this.beforeChange.draft)!==JSON.stringify(this.draft)){this.undoStack.push(this.beforeChange);if(this.undoStack.length>24)this.undoStack.shift();}this.beforeChange=null;}
  cancelChange(){if(!this.beforeChange)return;this.keyEdit=null;this.draft=this.beforeChange.draft;this.editingWork=this.beforeChange.editingWork;this.beforeChange=null;this.changed();}
  undo(){this.controls.cancel();this.stopPerformance();const previous=this.undoStack.pop();if(!previous)return;this.keyEdit=null;this.draft=previous.draft;this.editingWork=previous.editingWork;if(this.musicPreview){this.musicPreview=this.draft.sound!=='none';this.sound.start(this.draft.sound,this.draft.soundVolume??.4);}this.selection=null;this.changed();this.hint('已撤销这一步。');}
  goFrame(index){this.controls.cancel(true);this.stopPerformance();this.keyEdit=null;this.closeMotionMenu();selectFrame(this.draft,index);this.selection=null;this.changed();}
  persistDraft(){this.storage.setItem(DRAFT_KEY,JSON.stringify({...this.draft,editingId:this.editingWork?.id||null}));}
  changed(persist=true){
    if(this.active)this.world.set(this.draft,this.displayFrame());this.root.classList.toggle('has-snap',this.snapCandidate!==null);
    if(persist){try{this.persistDraft();$('staging-status').textContent='草稿已记下，下次可从戏台接着排。';}catch{$('staging-status').textContent='草稿暂存在本页，可先保存封面。';}this.renderFrames();}
    $('staging-title').textContent=this.draft.title||'给这出戏起名';$('staging-line').textContent=this.frame().line||'点这里，借一句台词';
    $('staging-light').textContent={warm:'一盏暖灯 ◌',moon:'月夜清光 ◌',rain:'雨幕微光 ◌'}[this.draft.light];this.renderSound();
    $('staging-next').textContent=this.draft.frame===2?'三幕排好了，开演 →':'记下这一幕 →';$('staging-save').textContent=this.editingWork?'保存这出戏':'收进留影册';
    this.root.querySelectorAll('[data-staging-frame]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stagingFrame)===this.draft.frame)));
    this.root.querySelectorAll('[data-story]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.story===this.draft.template)));
    if(persist)this.renderMotions();this.stage.dirty=true;
  }
  renderFrames(){if(!this.root)return;this.root.querySelectorAll('[data-staging-frame] canvas').forEach((canvas,index)=>this.painter.drawComposition(canvas.getContext('2d'),180,104,false,this.draft,this.draft.frames[index]));}
  positionControls(){
    if(!this.active)return;const rect=this.stage.canvas.getBoundingClientRect(),context=$('staging-context'),selection=this.selection,targets=this.controls.targets();
    const joints=targets.filter(t=>['hand','foot','neck','hips','joint'].includes(t.kind));
    this.handles.forEach((button,index)=>{const target=joints[index];button.target=target;button.hidden=!target||!!this.playback;if(target){button.setAttribute('aria-label',target.label);button.querySelector('span').textContent=target.label;button.classList.toggle('is-hinge',target.kind==='joint');button.style.left=target.screen.x-rect.left+'px';button.style.top=target.screen.y-rect.top+'px';}});
    context.hidden=!selection||this.playback||selection.kind==='scenery';
    if(selection&&!context.hidden){const target=this.controls.targets().find(t=>selection.kind==='prop'?t.kind==='prop':t.kind==='actor'&&t.index===this.draft.selected);if(target){context.style.left=bound(target.screen.x-rect.left,65,rect.width-65)+'px';const head=targets.find(t=>t.kind==='neck'&&t.index===this.draft.selected);context.style.top=bound((selection.kind==='prop'?target.screen.y+66:(head?.screen.y||target.screen.y)-44)-rect.top,160,rect.height-270)+'px';}else context.hidden=true;}
    $('staging-flip').hidden=selection?.kind==='prop';for(const id of ['staging-give-left','staging-give-right'])$(id).hidden=selection?.kind!=='prop';const snap=$('staging-snap');snap.hidden=this.snapCandidate===null;if(!snap.hidden){const hand=this.controls.targets().find(t=>t.kind==='hand'&&t.side==='Front'&&t.index===this.snapCandidate);if(hand){snap.style.left=hand.screen.x-rect.left+'px';snap.style.top=hand.screen.y-rect.top+'px';}else snap.hidden=true;}
    const p=this.controls.screen({x:0,y:5.25,z:.1}),line=$('staging-line'),input=$('staging-line-input');for(const el of [line,input]){el.style.left=bound(p.x-rect.left,100,rect.width-100)+'px';el.style.top=bound(p.y-rect.top,120,rect.height-290)+'px';}
  }
  hint(text){$('staging-hint').textContent=text;}
  startPerformance(actionIndex=null){
    this.controls.cancel(true);this.keyEdit=null;this.closeMotionMenu();$('staging-sound-menu').hidden=true;$('staging-sound').setAttribute('aria-expanded','false');const draft=sanitizeDraft(this.draft),timeline=compilePlay(draft);let offset=0,duration=timeline?.duration||PLAY_DURATION;
    if(actionIndex!==null){const segment=timeline?.segments.find(s=>s.kind==='action'&&s.index===draft.frame&&s.actionIndex===actionIndex);if(segment){offset=segment.start;duration=segment.duration;}}
    this.playback={draft,timeline,offset,duration,start:performance.now()};this.sound.start(this.draft.sound,this.draft.soundVolume??.4);this.root.classList.add('is-staging-performance');this.performanceInputs(true);$('staging-play').textContent='停止 ■';this.hint(actionIndex===null?'开演了。让身影把故事慢慢讲完。':'先试演这一段动作。');this.renderMotions();
  }
  tick(now){if(!this.active||!this.playback)return;const p=this.playback,elapsed=performance.now()-p.start,frame=samplePlay(p.draft,elapsed+p.offset,this.stage.reduced,p.timeline);this.world.set(p.draft,frame,true);if(elapsed>=p.duration){this.stopPerformance();this.hint('这一出，落幕了。还可以回到动作中间，亲手调一调姿态。');}}
  performanceInputs(disabled){this.root.querySelectorAll('.staging-rack,.staging-stories,.staging-scenery,.staging-context,.staging-line,.staging-light,.staging-tools,.staging-sound-menu,.staging-frames,.staging-motion-bar,.staging-motion-menu,.staging-key-strip,#staging-next,#staging-save,#staging-title').forEach(node=>node.inert=disabled);}
  stopPerformance(){if(!this.musicPreview)this.sound.stop();if(!this.playback)return;this.playback=null;this.renderMotions();this.root.classList.remove('is-staging-performance');this.performanceInputs(false);$('staging-play').textContent='开演 ▶';if(this.active)this.world.set(this.draft,this.displayFrame());}
  saveComposition(){
    this.controls.cancel(true);this.stopPerformance();
    try{const saved=saveStudioWork(this.storage,this.works,this.editingWork,this.draft,this.painter.poster(this.draft));this.works=saved.works;this.editingWork=saved.work;try{this.persistDraft();}catch{}this.renderWorks();this.changed(false);$('staging-status').textContent='戏票已收好，可在留影册回看演出。';this.toast('这出小戏，已收进留影册。');this.root.classList.remove('ticket-saved');void this.root.offsetWidth;this.root.classList.add('ticket-saved');}
    catch{this.toast('保存空间不足或不可用，请先下载封面。');}
  }
  mountCollection(){const section=document.createElement('section');section.className='ex-collection';section.innerHTML='<div class="ex-collection-heading"><h3>自己的小戏</h3><span>从戏台带回来的故事</span></div><p id="staging-collection-empty">排完一出小戏，戏票就会留在这里。</p><div id="composition-works" class="works-grid"></div>';$('collection-dialog').append(section);}
  renderWorks(){
    const root=$('composition-works');root.replaceChildren();$('staging-collection-empty').hidden=!!this.works.length;const old=$('staging-old-grid');old.replaceChildren();
    for(const work of this.works){
      const figure=document.createElement('figure');figure.className='work-item studio-saved-work';const image=document.createElement('img');image.src=work.image;image.alt=work.title+'的小戏留影';image.loading='lazy';const caption=document.createElement('figcaption'),name=document.createElement('span'),note=document.createElement('small');name.textContent=work.title;note.textContent=work.draft?'三幕小戏 · '+Math.round(getPlayDuration(work.draft)/100)/10+' 秒':'旧版留影 · 图片收藏';name.append(note);
      caption.append(name,createWorkActions({title:work.title,extraActions:work.draft?[{label:'播放',onClick:()=>this.playWork(work)}]:[],onDownload:()=>{const link=document.createElement('a');link.href=work.image;link.download='借光-'+work.title+'.webp';link.click();},onDelete:()=>{try{this.works=deleteSavedWork(this.storage,COMPOSITION_KEY,this.works,work);if(this.editingWork===work)this.editingWork=null;this.renderWorks();this.toast('留影已删除，当前草稿保留。');return true;}catch{this.toast('删除未能保存，请重试。');return false;}}}));figure.append(image,caption);root.append(figure);
      if(work.draft){const card=document.createElement('article'),img=image.cloneNode(),title=document.createElement('span');title.textContent=work.title;card.append(img,title);for(const duplicate of [false,true]){const b=document.createElement('button');b.textContent=duplicate?'另排一个结局':'接着排';b.addEventListener('click',()=>{this.beginChange();this.musicPreview=false;this.sound.stop();this.keyEdit=null;this.draft=copySavedDraft(work,duplicate);this.editingWork=duplicate?null:work;this.selection=null;this.changed();this.finishChange();$('staging-old-works').hidden=true;});card.append(b);}old.append(card);}
    }
    if(!old.children.length){const p=document.createElement('p');p.textContent='还没有旧戏票。先排一出自己的戏吧。';old.append(p);}
    const count=$('works-grid').children.length+this.works.length;$('collection-count').textContent=count;$('works-count').textContent=String(count).padStart(2,'0');
  }
  mountPlayer(){const player=document.createElement('dialog');player.id='studio-player';player.className='sheet';player.setAttribute('aria-labelledby','player-title');player.innerHTML='<header class="studio-header"><div><span class="sheet-label">一出小戏 · 再看一回</span><h2 id="player-title"></h2></div><button id="player-close" class="ex-secondary">返回 ↶</button></header><canvas id="player-canvas" width="1200" height="650" role="img" aria-label="收藏的小戏演出"></canvas><div class="studio-playback"><button id="player-play" class="ex-primary">重新开演 ▶</button><progress id="player-progress" max="1" value="0" aria-label="演出进度"></progress><span id="player-frame-label" role="status"></span></div>';document.body.append(player);this.player=player;$('player-close').addEventListener('click',()=>player.close());player.addEventListener('close',()=>{this.stopPlayer();if(this.active&&this.musicPreview)this.sound.start(this.draft.sound,this.draft.soundVolume??.4);this.playerReturn?.focus({preventScroll:true});});$('player-play').addEventListener('click',()=>this.playerRaf?this.stopPlayer():this.animatePlayer());}
  playWork(work){this.stopPerformance();this.sound.stop();this.controls?.cancel(true);this.playerDraft=sanitizeDraft(work.draft);this.playerReturn=document.activeElement;$('player-title').textContent=work.title;this.player.showModal();this.stage.setPaused('collection-player',true);this.animatePlayer();}
  animatePlayer(){this.stopPlayer();this.stage.setPaused('collection-player',true);this.playerSound=new StudioSound({onStateChange:()=>this.syncAudio(),onError:()=>this.toast('配乐暂时无法播放，请再试一次。')});this.playerSound.start(this.playerDraft.sound,this.playerDraft.soundVolume??.4);$('player-play').textContent='停止演出 ■';const timeline=compilePlay(this.playerDraft),duration=timeline?.duration||PLAY_DURATION;let start=null;const tick=now=>{if(start===null)start=now;const frame=samplePlay(this.playerDraft,now-start,this.stage.reduced,timeline);this.painter.drawComposition($('player-canvas').getContext('2d'),1200,650,false,this.playerDraft,frame);$('player-progress').value=frame.progress;$('player-frame-label').textContent=labels[frame.index];if(now-start>=duration){this.stopPlayer();$('player-frame-label').textContent='落幕了';return;}this.playerRaf=requestAnimationFrame(tick);};this.playerRaf=requestAnimationFrame(tick);}
  stopPlayer(){if(this.playerRaf)cancelAnimationFrame(this.playerRaf);this.playerRaf=null;this.playerSound?.stop();this.stage.setPaused('collection-player',this.player?.open||false);if($('player-play'))$('player-play').textContent='重新开演 ▶';}
}
