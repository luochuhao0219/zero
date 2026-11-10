import {createWorkActions,deleteSavedWork} from './collection-actions.js';
import {puppetRigAssets,drawPaper,gateCanvas,branchCanvas,bridgeCanvas} from './art.js';
import {COMPOSITION_KEY,DRAFT_KEY,FRAME_NAMES,sanitizeDraft,selectFrame,readJSON,readCompositions} from './explore-data.js';
import {STORY_STARTERS,POSES,PLAY_DURATION,starterDraft,samplePlay,copySavedDraft} from './studio-story.js';
import {drawProp,drawDialogue,propPosition,StudioSound} from './studio-effects.js';
const $=id=>document.getElementById(id);
const range=(id,label,min,max,value,unit='')=>`<label class="ex-range" for="${id}"><span>${label}<output id="${id}-value">${value}${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}"></label>`;
const scenes='<option value="bridge">小桥相逢</option><option value="moon">月下行旅</option><option value="garden">花枝入梦</option>';

// Optional editor and player stay outside the continuous museum/game route.
export class FreePlayStudio {
  constructor({toast,onPause,onResume}){
    Object.assign(this,{toast,onPause,onResume});
    this.storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
    const saved=readJSON(this.storage,DRAFT_KEY,null);this.draft=sanitizeDraft(saved);this.works=readCompositions(this.storage);
    this.editingWork=this.works.find(w=>w.id&&w.id===saved?.editingId)||null;
    this.scenery={gate:gateCanvas(),branch:branchCanvas(),bridge:bridgeCanvas()};this.rigs=[puppetRigAssets(0),puppetRigAssets(1)];this.backdrops=new Map();this.sound=new StudioSound();
    const dialog=document.createElement('dialog');dialog.id='studio-dialog';dialog.className='sheet studio-sheet';dialog.setAttribute('aria-labelledby','studio-title');
    dialog.innerHTML=`<header class="studio-header"><div><span class="sheet-label">YOUR OWN LITTLE PLAY</span><h2 id="studio-title">自由编戏</h2><p>选一个故事，排三段身影。今夜，借你的手开场。</p></div><button id="studio-close" aria-label="关闭自由编戏，返回留影册">返回留影册 ↶</button></header>${this.composeMarkup()}`;
    document.body.append(dialog);this.dialog=dialog;
    const collection=document.createElement('section');collection.className='ex-collection';
    collection.innerHTML='<div class="ex-collection-heading"><h3>我的自由小戏</h3><button id="collection-compose">继续编一出 ↗</button></div><p id="ex-collection-empty">还没有自己的小戏。选一个故事，排出你的第一场相逢。</p><div id="composition-works" class="works-grid"></div>';
    $('collection-dialog').append(collection);
    this.mountPlayer();
    $('collection-compose').addEventListener('click',()=>this.open());$('studio-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{this.stopPlayback();this.cancelDrag?.();if(this.returnToCollection&&!$('collection-dialog').open)$('collection-dialog').showModal();this.onResume?.();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopPlayback();});
    this.bind();this.syncComposer();this.renderWorks();document.fonts.ready.then(()=>this.syncComposer());
  }
  open(){
    if(this.dialog.open)return true;if(this.onPause?.()===false)return false;
    this.returnToCollection=$('collection-dialog').open;this.dialog.showModal();if(this.returnToCollection)$('collection-dialog').close();return true;
  }
  composeMarkup(){return `<section class="ex-room" id="ex-compose" aria-label="自由编戏">
    <div class="studio-starters"><div class="studio-section-label"><span>01 / 选一出戏</span><button id="compose-restore" disabled>恢复上次草稿 ↶</button></div><div class="studio-starter-grid">${STORY_STARTERS.map(s=>`<button data-starter="${s.id}"><strong>${s.title}</strong><span>${s.prompt}</span></button>`).join('')}<button data-starter="blank"><strong>从空白开始 ＋</strong><span>让灯亮起，故事由你来写。</span></button></div></div>
    <div class="ex-composer"><div class="ex-composer-stage"><div class="studio-section-label"><span>02 / 排三段身影</span><span id="compose-frame-label">正在排 · 起场</span></div>
      <canvas id="compose-canvas" width="1200" height="840" tabindex="0" role="img" aria-label="自由编戏画布。拖动影人或独立道具；方向键微调，Shift 加速。"></canvas>
      <div class="studio-playback"><button id="compose-play" class="ex-primary">开演这出戏 ▶</button><progress id="compose-progress" max="1" value="0" aria-label="演出进度"></progress><span>12 秒 / 三段</span></div>
      <fieldset id="compose-frame-controls" class="studio-fieldset"><legend class="studio-sr-only">分段编排</legend><div class="studio-frames" aria-label="选择编排片段">${FRAME_NAMES.map((name,i)=>`<button data-frame="${i}" aria-pressed="${i===0}"><small>0${i+1}</small>${name}</button>`).join('')}</div>
      <p class="ex-canvas-caption">每段分别排人物、道具与台词。开演后，身影会沿着你的站位走动。</p>
      <button id="compose-copy-frame" class="ex-text-button">沿用上一段的排布</button>
      <label class="ex-field studio-dialogue" for="compose-line">这一段，他们想说<input id="compose-line" maxlength="36" placeholder="写一句台词，或从下方借一句"></label>
      <div class="studio-line-suggestions">${['今夜，借一束光。','原来你也在这里。','山水有相逢，珍重。'].map(line=>`<button data-line="${line}">${line}</button>`).join('')}</div></fieldset>
      <span id="compose-status" class="ex-save-status" role="status">草稿自动保存在当前浏览器</span></div>
    <fieldset id="compose-edit-controls" class="ex-compose-controls studio-fieldset"><legend class="studio-sr-only">人物与舞台设置</legend>
      <label class="ex-field" for="compose-title">给这出戏起个名字<input id="compose-title" maxlength="18" placeholder="最多18个字"></label>
      <label class="ex-field studio-synopsis" for="compose-synopsis">一句话说说这出戏<input id="compose-synopsis" maxlength="60" placeholder="谁在这里相遇，又为什么离开？"></label>
      <div class="ex-form-row"><label class="ex-field" for="compose-scene">布景<select id="compose-scene">${scenes}</select></label><label class="ex-field" for="compose-count">影人<select id="compose-count"><option value="2">两位相逢</option><option value="1">一人独行</option></select></label></div>
      <div class="ex-form-row"><label class="ex-field" for="compose-light">灯色<select id="compose-light"><option value="warm">一盏暖灯</option><option value="moon">月夜清光</option><option value="rain">雨幕微光</option></select></label><label class="ex-field" for="compose-sound">开演声音<select id="compose-sound"><option value="none">静静看戏</option><option value="rain">细雨声</option><option value="gong">开场锣点</option></select></label></div>
      <div class="ex-actor-select" aria-label="选择影人"><button data-actor="0" aria-pressed="true">朱红影人</button><button data-actor="1" aria-pressed="false">青绿影人</button></div>
      <div class="studio-poses" aria-label="动作预设">${POSES.map((p,i)=>`<button data-pose="${i}">${p.name}</button>`).join('')}</div>
      <label class="ex-check"><input id="compose-flip" type="checkbox">转身，朝向另一侧</label>
      <details class="studio-fine-tune"><summary>细调站位与手杆</summary>${range('compose-x','左右位置',16,84,36,'%')}${range('compose-y','上下位置',45,86,74,'%')}${range('compose-size','影人大小',65,135,100,'%')}${range('compose-pose','手杆角度',-30,120,40,'°')}</details>
      <div class="studio-props"><label class="ex-field" for="compose-prop">这一段的道具<select id="compose-prop"><option value="none">空手入戏</option><option value="lantern">灯笼</option><option value="umbrella">纸伞</option><option value="book">书卷</option></select></label><label class="ex-field" for="compose-holder">道具放在哪里<select id="compose-holder"><option value="-1">独立摆放 · 可拖动</option><option value="0">朱红影人手中</option><option value="1">青绿影人手中</option></select></label><div id="compose-prop-position">${range('compose-prop-x','道具左右',16,84,50,'%')}${range('compose-prop-y','道具上下',25,85,65,'%')}</div></div>
      <div class="ex-compose-actions"><button class="ex-primary" id="compose-save">收进留影册 ＋</button><button class="ex-secondary" id="compose-download">下载封面 ↗</button></div><button class="ex-text-button" id="compose-reset">重新排一出</button>
    </fieldset></div>
    <div class="ex-personal-heading"><h3>你留下的小戏</h3><span>保存在此浏览器 · 最近六出</span></div><p id="compose-empty" class="ex-muted">还没有留影。排好人物，收下今夜的第一张戏票。</p><div id="compose-gallery" class="ex-personal-grid"></div><p class="ex-note">每出小戏保存三段编排，可播放、继续编辑或复制新结局。下载的是当前片段封面；旧版戏票保留图片。人物、道具与声音均为本站原创数字设计。</p></section>`;}
  replaceDraft(draft,editingWork=null){
    this.stopPlayback();this.cancelDrag?.();this.previous={draft:sanitizeDraft(this.draft),editingWork:this.editingWork};
    this.draft=sanitizeDraft(draft);this.editingWork=editingWork;this.propSelected=false;this.syncComposer();this.updateComposer();
  }
  bind(){
    this.dialog.querySelectorAll('[data-starter]').forEach(b=>b.addEventListener('click',()=>this.replaceDraft(starterDraft(b.dataset.starter))));
    $('compose-restore').addEventListener('click',()=>{if(!this.previous)return;const previous=this.previous;this.previous=null;this.draft=previous.draft;this.editingWork=previous.editingWork;this.propSelected=false;this.syncComposer();this.updateComposer();});
    for(const key of ['title','synopsis','scene','light','sound'])$('compose-'+key).addEventListener(['title','synopsis'].includes(key)?'input':'change',()=>{this.draft[key]=$('compose-'+key).value;this.updateComposer();});
    $('compose-count').addEventListener('change',()=>{this.draft.count=Number($('compose-count').value);if(this.draft.count===1){this.draft.selected=0;this.draft.frames.forEach(f=>{if(f.prop.holder===1)f.prop.holder=-1;});}this.syncComposer();this.updateComposer();});
    this.dialog.querySelectorAll('[data-frame]').forEach(b=>b.addEventListener('click',()=>{this.cancelDrag?.();selectFrame(this.draft,Number(b.dataset.frame));this.propSelected=false;this.syncComposer();this.updateComposer();}));
    $('compose-copy-frame').addEventListener('click',()=>{const i=this.draft.frame;if(!i)return;this.draft.frames[i]=structuredClone(this.draft.frames[i-1]);selectFrame(this.draft,i);this.syncComposer();this.updateComposer();});
    $('compose-line').addEventListener('input',()=>{this.currentFrame().line=$('compose-line').value.slice(0,36);this.updateComposer();});
    this.dialog.querySelectorAll('[data-line]').forEach(b=>b.addEventListener('click',()=>{this.currentFrame().line=b.dataset.line;this.syncComposer();this.updateComposer();}));
    this.dialog.querySelectorAll('[data-actor]').forEach(b=>b.addEventListener('click',()=>{this.draft.selected=Number(b.dataset.actor);this.propSelected=false;this.syncComposer();}));
    this.dialog.querySelectorAll('[data-pose]').forEach(b=>b.addEventListener('click',()=>{const p=POSES[Number(b.dataset.pose)],a=this.draft.actors[this.draft.selected];a.pose=p.pose;if(p.turn)a.flip=!a.flip;this.syncComposer();this.updateComposer();}));
    for(const [id,key,scale] of [['compose-x','x',1],['compose-y','y',1],['compose-size','size',.01],['compose-pose','pose',1]])$(id).addEventListener('input',()=>{this.draft.actors[this.draft.selected][key]=Number($(id).value)*scale;this.updateComposer();});
    $('compose-flip').addEventListener('change',()=>{this.draft.actors[this.draft.selected].flip=$('compose-flip').checked;this.updateComposer();});
    $('compose-prop').addEventListener('change',()=>{this.currentFrame().prop.kind=$('compose-prop').value;this.propSelected=false;this.syncComposer();this.updateComposer();});
    $('compose-holder').addEventListener('change',()=>{this.currentFrame().prop.holder=Number($('compose-holder').value);this.propSelected=false;this.syncComposer();this.updateComposer();});
    for(const axis of ['x','y'])$('compose-prop-'+axis).addEventListener('input',()=>{this.currentFrame().prop[axis]=Number($('compose-prop-'+axis).value);this.updateComposer();});
    $('compose-reset').addEventListener('click',()=>this.replaceDraft(starterDraft('blank')));
    $('compose-save').addEventListener('click',()=>this.saveComposition());$('compose-download').addEventListener('click',()=>this.download(this.poster(),'借光-'+(this.draft.title||'无题小戏')));
    $('compose-play').addEventListener('click',()=>{if(this.playback)this.stopPlayback();else this.startPlayback(this.draft,'compose');});this.bindCanvas();
  }
  currentFrame(){return this.draft.frames[this.draft.frame];}
  bindCanvas(){
    const canvas=$('compose-canvas');let drag=null;this.cancelDrag=()=>{drag=null;};
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||drag||this.playback)return;const p=this.canvasPoint(canvas,e),prop=this.currentFrame().prop;let hit=-1;
      const pp=propPosition(this.currentFrame(),this.draft.count);
      this.propSelected=prop.kind!=='none'&&prop.holder===-1&&Math.abs(p.x-pp.x*12)<70&&Math.abs(p.y-pp.y*8.4)<100;
      if(!this.propSelected){const hits=this.actorBounds();for(let i=hits.length-1;i>=0;i--){const b=hits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){hit=i;break;}}if(hit<0)return;this.draft.selected=hit;}
      e.preventDefault();const a=this.propSelected?prop:this.draft.actors[hit];drag={pointer:e.pointerId,x:p.x,y:p.y,startX:a.x,startY:a.y,prop:this.propSelected};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});this.syncComposer();
    });
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId||this.playback)return;const p=this.canvasPoint(canvas,e),a=drag.prop?this.currentFrame().prop:this.draft.actors[this.draft.selected];a.x=Math.max(16,Math.min(84,drag.startX+(p.x-drag.x)/12));a.y=Math.max(drag.prop?25:45,Math.min(drag.prop?85:86,drag.startY+(p.y-drag.y)/8.4));this.syncComposer();this.updateComposer(false);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag&&drag.pointer===e.pointerId){drag=null;this.updateComposer();}});
    canvas.addEventListener('keydown',e=>{if(this.playback)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();const a=this.propSelected?this.currentFrame().prop:this.draft.actors[this.draft.selected],step=e.shiftKey?4:1;a.x=Math.max(16,Math.min(84,a.x+delta[0]*step));a.y=Math.max(this.propSelected?25:45,Math.min(this.propSelected?85:86,a.y+delta[1]*step));this.syncComposer();this.updateComposer();});
  }
  canvasPoint(canvas,e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  actorBounds(){return this.draft.actors.slice(0,this.draft.count).map(a=>{const h=840*.52*a.size,w=h*480/820;return {x:1200*a.x/100-w/2,y:840*a.y/100-h*.915,w,h};});}
  outputs(){this.dialog.querySelectorAll('input[type=range]').forEach(input=>{const out=$(input.id+'-value');if(out)out.textContent=Math.round(Number(input.value))+(input.dataset.unit||'');});}
  drawBackdrop(ctx,w,h,scene,light){
    const key=`${w}-${h}-${scene}-${light}`;if(this.backdrops.has(key)){ctx.drawImage(this.backdrops.get(key),0,0);return;}
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
    drawPaper(c,w,h);c.save();c.globalAlpha=.14;c.fillStyle='#687453';c.beginPath();c.moveTo(0,h*.83);c.bezierCurveTo(w*.2,h*.4,w*.37,h*.95,w*.56,h*.69);c.bezierCurveTo(w*.75,h*.48,w*.9,h*.65,w,h*.55);c.lineTo(w,h);c.lineTo(0,h);c.fill();c.restore();
    if(scene==='moon'){c.fillStyle='#f8edc2';c.beginPath();c.arc(w*.75,h*.23,h*.12,0,Math.PI*2);c.fill();c.save();c.globalAlpha=.32;c.drawImage(this.scenery.gate,w*.61,h*.35,w*.32,h*.45);c.restore();}
    if(scene==='bridge'){c.save();c.globalAlpha=.42;c.drawImage(this.scenery.bridge,w*.12,h*.72,w*.76,h*.18);c.restore();c.strokeStyle='#84927666';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*.12,h*(.93+i*.016));c.bezierCurveTo(w*.4,h*(.9+i*.016),w*.65,h*(.95+i*.016),w*.88,h*(.92+i*.016));c.stroke();}}
    if(scene==='garden'){c.save();c.globalAlpha=.55;c.drawImage(this.scenery.branch,w*.63,-h*.03,w*.4,h*.8);c.restore();}
    c.fillStyle=light==='moon'?'#7d9cab38':light==='rain'?'#425f613d':'#e5b65718';c.fillRect(0,0,w,h);
    if(light==='rain'){c.strokeStyle='#e8ecd04d';c.lineWidth=1.5;for(let i=0;i<55;i++){const x=(i*137)%w,y=(i*229)%h;c.beginPath();c.moveTo(x,y);c.lineTo(x-12,y+35);c.stroke();}}
    if(this.backdrops.size>=9)this.backdrops.delete(this.backdrops.keys().next().value);this.backdrops.set(key,canvas);ctx.drawImage(canvas,0,0);
  }
  drawActor(ctx,a,w,h){
    const height=h*.52*a.size,width=height*480/820,rig=this.rigs[a.variant];ctx.save();ctx.translate(w*a.x/100,h*a.y/100+height*.085);if(a.flip)ctx.scale(-1,1);ctx.translate(-width/2,-height);ctx.scale(width/480,height/820);
    const arm=(image,x,y,angle)=>{ctx.save();ctx.translate(x,y);ctx.rotate(-angle*Math.PI/180);ctx.drawImage(image,-x,-y,480,820);ctx.restore();};
    arm(rig.back,214,285,10);ctx.drawImage(rig.body,0,0,480,820);arm(rig.front,304,285,a.pose);ctx.restore();
  }
  drawComposition(ctx,w,h,selection=false,draft=this.draft,frame=draft.frames[draft.frame]){
    this.drawBackdrop(ctx,w,h,draft.scene,draft.light);frame.actors.slice(0,draft.count).forEach(a=>this.drawActor(ctx,a,w,h));drawProp(ctx,w,h,frame,draft.count);drawDialogue(ctx,w,h,frame.line);
    if(selection){const a=this.propSelected?propPosition(frame,draft.count):frame.actors[draft.selected];ctx.save();ctx.strokeStyle='#884c31';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.ellipse(w*a.x/100,h*a.y/100-8,50*(a.size||1),12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#56412c';ctx.font=`${Math.round(w*.02)}px sans-serif`;ctx.fillText('借光 · 珞珈夜戏',w*.055,h*.09);ctx.textAlign='right';ctx.fillStyle='#7e4530';ctx.font=`${Math.round(w*.035)}px "Zhi Mang Xing",serif`;ctx.fillText(draft.title||'无题小戏',w*.94,h*.1);ctx.textAlign='left';ctx.fillStyle='#766447';ctx.font=`${Math.round(w*.012)}px sans-serif`;ctx.fillText('原创数字小戏 / 江汉皮影主题体验',w*.055,h*.96);
  }
  syncComposer(){
    const d=this.draft,a=d.actors[d.selected],f=this.currentFrame();for(const key of ['title','synopsis','scene','count','light','sound'])$('compose-'+key).value=d[key];
    for(const [id,value] of [['compose-x',a.x],['compose-y',a.y],['compose-size',a.size*100],['compose-pose',a.pose],['compose-prop-x',f.prop.x],['compose-prop-y',f.prop.y]])$(id).value=value;
    $('compose-flip').checked=a.flip;$('compose-line').value=f.line;$('compose-prop').value=f.prop.kind;$('compose-holder').value=f.prop.holder;
    $('compose-holder').disabled=f.prop.kind==='none';$('compose-holder').querySelector('option[value="1"]').disabled=d.count===1;$('compose-prop-position').hidden=f.prop.kind==='none'||f.prop.holder!==-1;
    this.dialog.querySelectorAll('[data-actor]').forEach(b=>{b.disabled=Number(b.dataset.actor)>=d.count;b.setAttribute('aria-pressed',String(Number(b.dataset.actor)===d.selected));});
    this.dialog.querySelectorAll('[data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.frame)===d.frame)));
    this.dialog.querySelectorAll('[data-starter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.starter===d.template)));
    $('compose-copy-frame').disabled=d.frame===0;$('compose-restore').disabled=!this.previous;$('compose-save').textContent=this.editingWork?'保存修改 ✓':'收进留影册 ＋';$('compose-frame-label').textContent='正在排 · '+FRAME_NAMES[d.frame];
    if(!this.playback)this.drawComposition($('compose-canvas').getContext('2d'),1200,840);this.outputs();
  }
  updateComposer(persist=true){
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840);this.outputs();if(!persist)return;
    try{this.persistDraft();$('compose-status').textContent='草稿已保存 · 三段都可以接着排';}catch{$('compose-status').textContent='草稿暂存于本页，请下载封面保存';}
  }
  persistDraft(){this.storage.setItem(DRAFT_KEY,JSON.stringify({...this.draft,editingId:this.editingWork?.id||null}));}
  poster(){const c=document.createElement('canvas');c.width=1200;c.height=840;this.drawComposition(c.getContext('2d'),1200,840);return c.toDataURL('image/webp',.86);}
  saveComposition(){
    const index=this.works.findIndex(w=>w===this.editingWork||w.id&&w.id===this.editingWork?.id);
    const work={id:this.editingWork?.id||globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,image:this.poster(),title:this.draft.title.trim()||'无题小戏',date:new Date().toISOString(),draft:sanitizeDraft(this.draft)};
    const next=index>=0?this.works.map((w,i)=>i===index?work:w):[work,...this.works].slice(0,6);
    try{this.storage.setItem(COMPOSITION_KEY,JSON.stringify(next));this.works=next;this.editingWork=work;try{this.persistDraft();}catch{/* The saved work remains available even if the draft write fails. */}$('compose-status').textContent='已保存三段小戏 · 可在留影册播放或继续编辑';this.renderWorks();this.syncComposer();this.toast('小戏已收进留影册');}
    catch{$('compose-status').textContent='留影未能保存，请先下载封面，再重试。';this.toast('保存空间不足或不可用，请下载封面。');}
  }
  editWork(work,duplicate=false){const draft=copySavedDraft(work,duplicate);if(!draft||!this.open())return;this.replaceDraft(draft,duplicate?null:work);this.dialog.scrollTop=0;}
  renderWorks(){
    const populate=(root,compact)=>{root.replaceChildren();for(const work of this.works){
      const figure=document.createElement('figure');figure.className=(compact?'work-item':'ex-personal-work')+' studio-saved-work';
      const img=document.createElement('img');img.src=work.image;img.alt=work.title+'的自由编戏留影';img.loading='lazy';
      const caption=document.createElement('figcaption'),name=document.createElement('span'),note=document.createElement('small');name.textContent=work.title;note.textContent=work.draft?(work.draft.synopsis||'三段小戏 · 12 秒'):'旧版留影 · 图片收藏';name.append(note);
      const extraActions=work.draft?[{label:'播放',onClick:()=>this.playWork(work)},{label:'继续编辑',onClick:()=>this.editWork(work)},{label:'复制一出',onClick:()=>this.editWork(work,true)}]:[];
      const actions=createWorkActions({title:work.title,extraActions,onDownload:()=>this.download(work.image,'借光-'+work.title),onDelete:()=>{
        try{this.works=deleteSavedWork(this.storage,COMPOSITION_KEY,this.works,work);if(this.editingWork===work)this.editingWork=null;this.renderWorks();this.syncComposer();$('compose-status').textContent='留影已删除，当前编戏草稿保留';this.toast('留影已删除');return true;}
        catch{this.toast('删除未能保存，请重试。');return false;}
      }});caption.append(name,actions);figure.append(img,caption);root.append(figure);
    }};
    populate($('compose-gallery'),false);populate($('composition-works'),true);$('compose-empty').hidden=!!this.works.length;$('ex-collection-empty').hidden=!!this.works.length;
    const count=$('works-grid').children.length+this.works.length;$('collection-count').textContent=count;$('works-count').textContent=String(count).padStart(2,'0');
  }
  mountPlayer(){
    const player=document.createElement('dialog');player.id='studio-player';player.className='sheet';player.setAttribute('aria-labelledby','player-title');
    player.innerHTML='<header class="studio-header"><div><span class="sheet-label">LET THE SHADOWS PLAY</span><h2 id="player-title"></h2><p id="player-synopsis"></p></div><button id="player-close" class="ex-secondary">返回 ↶</button></header><canvas id="player-canvas" width="1200" height="840" role="img" aria-label="收藏的小戏演出"></canvas><div class="studio-playback"><button id="player-play" class="ex-primary">重新开演 ▶</button><progress id="player-progress" max="1" value="0" aria-label="收藏小戏演出进度"></progress><span id="player-frame-label" role="status"></span></div><p class="ex-muted">演出使用作品保存时的声音设置，默认静音的小戏不会发声。</p>';
    document.body.append(player);this.player=player;$('player-close').addEventListener('click',()=>player.close());
    player.addEventListener('close',()=>{this.stopPlayback();this.onResume?.();this.playerReturn?.focus({preventScroll:true});});
    $('player-play').addEventListener('click',()=>{if(this.playback)this.stopPlayback();else if(this.playerDraft)this.startPlayback(this.playerDraft,'player');});
  }
  playWork(work){
    if(!work.draft||this.onPause?.()===false)return;this.stopPlayback();this.playerDraft=sanitizeDraft(work.draft);this.playerReturn=document.activeElement;
    $('player-title').textContent=work.title;$('player-synopsis').textContent=work.draft.synopsis||'三段身影，演一场相逢。';this.player.showModal();this.startPlayback(this.playerDraft,'player');
  }
  startPlayback(draft,target){
    this.stopPlayback();this.cancelDrag?.();const snapshot=sanitizeDraft(draft),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.playback={draft:snapshot,target,start:null};this.sound.start(snapshot.sound);
    if(target==='compose'){$('compose-edit-controls').disabled=true;$('compose-frame-controls').disabled=true;this.dialog.querySelectorAll('[data-starter]').forEach(b=>b.disabled=true);$('compose-restore').disabled=true;}
    $(target+'-play').textContent='停止演出 ■';
    const tick=now=>{
      const playback=this.playback;if(!playback)return;if(playback.start===null)playback.start=now;
      const elapsed=now-playback.start,frame=samplePlay(snapshot,elapsed,reduced),canvas=$(target+'-canvas');this.drawComposition(canvas.getContext('2d'),1200,840,false,snapshot,frame);
      $(target+'-progress').value=frame.progress;$(target+'-frame-label').textContent='演出中 · '+FRAME_NAMES[frame.index];
      if(elapsed>=PLAY_DURATION){this.stopPlayback(true);return;}this.playRaf=requestAnimationFrame(tick);
    };this.playRaf=requestAnimationFrame(tick);
  }
  stopPlayback(finished=false){
    if(this.playRaf)cancelAnimationFrame(this.playRaf);this.playRaf=null;this.sound?.stop();const playback=this.playback;this.playback=null;if(!playback)return;
    const target=playback.target;$(target+'-play').textContent=target==='compose'?'开演这出戏 ▶':'重新开演 ▶';$(target+'-frame-label').textContent=finished?'这一出，落幕了。':'已停止';
    if(target==='compose'){$('compose-edit-controls').disabled=false;$('compose-frame-controls').disabled=false;this.dialog.querySelectorAll('[data-starter]').forEach(b=>b.disabled=false);this.syncComposer();}
  }
  download(image,name){const a=document.createElement('a');a.href=image;a.download=name+'.webp';a.click();}
}
