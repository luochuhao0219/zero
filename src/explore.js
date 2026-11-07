import {puppetCanvas,drawPaper,gateCanvas,branchCanvas,bridgeCanvas} from './art.js';
import {MUSEUM_STOPS, museumStop, clamp} from './route-state.js';
import {ROOMS,CRAFT,STORY,SOURCES,COMPOSITION_KEY,DRAFT_KEY,defaultDraft,sanitizeDraft,readJSON,readCompositions} from './explore-data.js';

const $=id=>document.getElementById(id);
const sourceLink=key=>`<a href="${SOURCES[key][1]}" target="_blank" rel="noopener noreferrer">${SOURCES[key][0]} ↗</a>`;
const range=(id,label,min,max,value,unit='')=>`<label class="ex-range" for="${id}"><span>${label}<output id="${id}-value">${value}${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}"></label>`;
const sceneOptions='<option value="bridge">小桥相逢</option><option value="moon">月下行旅</option><option value="garden">花枝入梦</option>';

/** Independent, event-driven exhibits. The original scroll track and game keep ownership of their state. */
export class Exploration {
  constructor({journey,onPause,onResume,onPlay,toast}){
    Object.assign(this,{journey,onPause,onResume,onPlay,toast});
    this.active='heritage';this.visited=new Set();this.craftStep=0;this.craftVariant=0;this.storyStep=0;
    this.storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
    this.draft=sanitizeDraft(readJSON(this.storage,DRAFT_KEY,null));this.works=readCompositions(this.storage);
    this.scenery={gate:gateCanvas(),branch:branchCanvas(),bridge:bridgeCanvas()};
    this.mount();this.bind();this.drawCraft();this.drawStory();this.drawLight();this.syncComposer();this.renderWorks();
  }
  mount(){
    const button=document.createElement('button');button.id='explore-open';button.className='nav-pill';button.textContent='历史馆';
    document.querySelector('.header-actions').insertBefore(button,$('collection-open'));
    const root=document.createElement('section');root.id='museum-ui';root.className='museum-route';root.hidden=true;
    root.setAttribute('aria-label','历史馆连续参观');
    root.innerHTML=`<header class="museum-heading"><p id="ex-eyebrow"></p><h2 id="ex-title"></h2><p id="ex-intro"></p></header>
      <nav class="museum-stops" aria-label="展馆路标">${ROOMS.map(r=>`<button data-room="${r.id}" aria-pressed="false"><small>${r.no}</small><span>${r.name}</span></button>`).join('')}</nav>
      <aside class="museum-tools" aria-label="当前展区互动与说明"><div class="museum-tool-heading"><span id="ex-room-caption"></span><span id="ex-visited"></span></div>
      <section id="ex-heritage" class="ex-room"><p class="museum-evidence">史料 · 国家级非遗项目</p><h3>江汉平原，唱着一方乡音。</h3><p>沿展廊走过地域图、历史线索与影人藏品。幕布背后的唱、奏与操演，靠人的手与声音延续。</p><p>江汉平原皮影戏流传于湖北潜江、天门、沔阳等地。展廊里的两位影人为本站原创数字造型，不是历史实物复刻。</p><details><summary>停下来读 · 史料与传承</summary>${this.heritageMarkup().replace('id="ex-heritage"','id="heritage-reading"').replace(' hidden','')}</details></section>
      ${this.craftMarkup()}${this.storyMarkup()}${this.lightMarkup()}${this.composeMarkup()}
      </aside><footer class="museum-route-footer"><button id="ex-prev">← 上一展区</button><span>滚动参观 · 向上沿原路返回</span><button id="ex-next">下一展区 →</button></footer>
      <div class="museum-exit" hidden><button id="museum-to-game">沿连接通道，前往戏台 ↗</button><button id="museum-to-hall">沿原路返回内厅 ↶</button></div>`;
    document.body.append(root);this.dialog=root;
    // Canvas output is a live texture on the physical screen, not a second stage.
    for(const id of ['craft-canvas','story-canvas','light-canvas','compose-canvas'])$(id).tabIndex=-1;
    const handles=document.createElement('div');handles.id='museum-handles';handles.hidden=true;
    handles.innerHTML='<button class="scene-handle" id="handle-lamp" aria-label="拖动光源，左右移动灯；也可用方向键">灯 <span>↔</span></button><button class="scene-handle" id="handle-puppet" aria-label="拖动影人，上下调整离幕距离；也可用方向键">影人 <span>↕</span></button><button class="scene-handle" id="handle-arm" aria-label="拖动手杆，调整关节；也可用方向键">提手杆 ↗</button><button class="scene-handle actor-handle" id="handle-actor-0" aria-label="拖动朱红影人，或用方向键排布">朱红 · 移动</button><button class="scene-handle actor-handle" id="handle-actor-1" aria-label="拖动青绿影人，或用方向键排布">青绿 · 移动</button>';
    document.body.append(handles);
    const collection=document.createElement('section');collection.className='ex-collection';collection.innerHTML='<div class="ex-collection-heading"><h3>我的自由小戏</h3><button id="collection-compose">沿展廊去编一出 ↗</button></div><p id="ex-collection-empty">还没有自己的小戏。从一张幕开始吧。</p><div id="composition-works" class="works-grid"></div>';
    $('collection-dialog').append(collection);
  }
  heritageMarkup(){return `<section class="ex-room" id="ex-heritage" aria-label="识影馆">
    <div class="ex-heritage-lead"><div class="ex-seal" aria-hidden="true">江<br>汉<br>有<br>戏</div><div><h3>幕布上的地方记忆</h3><p>江汉皮影以天门、潜江、沔阳一带为核心，雕镂与唱腔各有风格。它在2006年进入第一批国家级非遗名录。</p><div class="ex-tags"><span>湖北 · 江汉平原</span><span>传统戏剧</span><span>Ⅳ-91</span></div></div></div>
    <div class="ex-fact-grid"><article><span>看形</span><h3>纹样里的功夫</h3><p>江汉皮影的“汤格”“郭格”，以精细、舒展的造型见长。</p></article><article><span>听声</span><h3>一地有一地的腔</h3><p>歌腔与渔鼓腔是这里的重要声腔。</p></article><article><span>识戏</span><h3>故事在口中生长</h3><p>艺人依据故事线索铺陈情节，口头讲述也是表演的一部分。</p></article></div>
    <div class="ex-reading"><div><p class="ex-eyebrow">THE PEOPLE BEHIND THE SCREEN</p><h3>让影子活着的人</h3></div><div><h4>刘年华 · 代表性传承人</h4><p>1961年开始随祖父学艺，既操演、演唱，也从事影人雕刻。舞台上的一场戏，往往汇集同一个人多年积累的多种本领。</p>${sourceLink('artist')}</div></div>
    <details class="ex-details"><summary>中国皮影与江汉皮影，有什么关系？</summary><p>中国皮影包含不同地区的表演传统，不能把一种地方风格当作所有皮影的统一样貌。中国皮影戏于2011年列入联合国教科文组织人类非物质文化遗产代表作名录。江汉平原皮影戏是本网站选择认识的一支地方传统。</p>${sourceLink('unesco')}</details>
    <div class="ex-sources"><span>继续阅读</span>${sourceLink('regional')}<small>本站场景为校园主题数字再创作，不是传统演出场所的历史复原。</small></div>
  </section>`;}
  craftMarkup(){return `<section class="ex-room" id="ex-craft" aria-label="影人工坊" hidden>
    <div class="ex-split"><div class="ex-object-board"><span class="ex-board-label">影人观察台 / ORIGINAL DIGITAL FIGURE</span><canvas id="craft-canvas" width="700" height="780" role="img" aria-label="原创影人的材料、镂空、配色与关节示意"></canvas><div class="ex-board-caption">原创数字影人 · 非传统实物摹本</div></div>
    <div class="ex-inspect"><div class="ex-step-nav" aria-label="制作步骤">${CRAFT.map((c,i)=>`<button data-craft="${i}" aria-pressed="${i===0}"><small>0${i+1}</small>${c.name}</button>`).join('')}</div><span class="ex-step-number" id="craft-number">01 / 04</span><h3 id="craft-title"></h3><p id="craft-text"></p><p class="ex-note" id="craft-note"></p>
    <div class="ex-craft-tools"><label class="ex-check"><input id="craft-zoom" type="checkbox">放大细节</label><button class="ex-secondary" id="craft-color">换成青绿配色</button></div><div id="craft-arm-control">${range('craft-arm','提起手杆',-30,120,35,'°')}</div><p class="ex-muted">可逐步切换，也可以回到任意一步。</p></div></div>
    <div class="ex-sources"><span>工艺资料</span>${sourceLink('regional')}<small>四步是用于理解的归纳，不代表完整制作工序。观察图为原创数字示意。</small></div>
  </section>`;}
  storyMarkup(){return `<section class="ex-room" id="ex-stories" aria-label="戏摊故事" hidden>
    <div class="ex-story-label">本站原创短剧 <strong>《借光过桥》</strong><span>数字改编 · 非传统剧目</span></div>
    <div class="ex-story-tabs" aria-label="三幕故事">${STORY.map((s,i)=>`<button data-story="${i}" aria-pressed="${i===0}"><small>0${i+1}</small>${['点灯','搭桥','对戏'][i]}</button>`).join('')}</div>
    <div class="ex-split ex-story-split"><canvas id="story-canvas" width="1000" height="700" role="img" aria-label="借光过桥的原创剧情示意"></canvas><article class="ex-story-copy"><p class="ex-eyebrow">A SCENE IN THREE ACTS</p><h3 id="story-name"></h3><p class="ex-story-line" id="story-line"></p><p id="story-detail"></p><div class="ex-task"><span>这一幕，由你来</span><p id="story-task"></p></div><button class="ex-primary" id="story-play">去玩这一幕 ↗</button></article></div>
    <div class="ex-role-grid"><article><span class="ex-role-dot red"></span><div><h3>归人 · 朱红衣</h3><p>沿光而来，借桥而过。由本站原创红衣影人出演。</p></div></article><article><span class="ex-role-dot green"></span><div><h3>候人 · 青绿衣</h3><p>在灯下等候，以一礼相迎。配色用于区分角色，不对应传统行当。</p></div></article></div>
    <p class="ex-note">读完故事后，可以自由选择一幕，从幕后亲手排演。</p>
  </section>`;}
  lightMarkup(){return `<section class="ex-room" id="ex-light" aria-label="光影实验" hidden><div class="ex-split"><div><canvas id="light-canvas" width="1000" height="760" role="img" aria-label="光源位置与影人距离变化后的投影示意"></canvas><p class="ex-canvas-caption" id="light-caption" aria-live="polite"></p></div><div class="ex-inspect"><span class="ex-step-number">自由观察 / 无需过关</span><h3>影子的变化，有迹可循。</h3><p>先把灯移到一侧，再把影人慢慢拉离幕布。观察影子的位置和大小，试着找出它们的关系。</p>${range('light-position','灯的横向位置',-80,80,-25)}${range('light-depth','影人离幕距离',10,65,30)}<label class="ex-check"><input type="checkbox" id="light-color">观察彩色透影</label><button id="light-reset" class="ex-secondary">恢复初始位置 ↺</button><div class="ex-task"><span>带着发现去操作</span><p>在原来的“点灯”关卡里，用三维灯位和影人验证你的观察。</p><button class="ex-text-button" id="light-play">去点灯 ↗</button></div></div></div><p class="ex-note">这里是点光源与平面投影的简化实验。真实皮影效果还与光源大小、材料透光率和幕布有关。</p></section>`;}
  composeMarkup(){return `<section class="ex-room" id="ex-compose" aria-label="自由编戏" hidden><div class="ex-composer"><div class="ex-composer-stage"><canvas id="compose-canvas" width="1200" height="840" tabindex="0" role="img" aria-label="自由编戏画布。拖动影人排布，也可使用右侧位置滑杆与方向键调整。"></canvas><p class="ex-canvas-caption">拖动影人排布 · 选中后用方向键微调 · 下方也可调整位置</p><span id="compose-status" class="ex-save-status" role="status">草稿自动保存在当前浏览器</span></div><div class="ex-compose-controls"><label class="ex-field" for="compose-title">给这出戏起个名字<input id="compose-title" maxlength="18" placeholder="最多18个字"></label><div class="ex-form-row"><label class="ex-field" for="compose-scene">布景<select id="compose-scene">${sceneOptions}</select></label><label class="ex-field" for="compose-count">影人<select id="compose-count"><option value="2">两位相逢</option><option value="1">一人独行</option></select></label></div><div class="ex-actor-select" aria-label="选择影人"><button data-actor="0" aria-pressed="true">朱红影人</button><button data-actor="1" aria-pressed="false">青绿影人</button></div>${range('compose-x','左右位置',16,84,36,'%')}${range('compose-y','上下位置',45,86,74,'%')}${range('compose-size','影人大小',65,135,100,'%')}${range('compose-pose','手杆角度',-30,120,40,'°')}<label class="ex-check"><input id="compose-flip" type="checkbox">转身，朝向另一侧</label><div class="ex-compose-actions"><button class="ex-primary" id="compose-save">收进留影册 ＋</button><button class="ex-secondary" id="compose-download">下载戏票 ↗</button></div><button class="ex-text-button" id="compose-reset">重新排一出</button></div></div><div class="ex-personal-heading"><h3>你留下的小戏</h3><span>仅保存在此浏览器 · 最近六出</span></div><p id="compose-empty" class="ex-muted">还没有留影。排好人物，收下今夜的第一张戏票。</p><div id="compose-gallery" class="ex-personal-grid"></div><p class="ex-note">此处使用本站原创角色与景片自由组合。可以下载保存；清理浏览器数据会移除本地草稿和留影。</p></section>`;}
  bind(){
    $('explore-open').addEventListener('click',()=>this.open('heritage'));
    this.dialog.querySelectorAll('[data-room]').forEach(button=>button.addEventListener('click',()=>this.selectRoom(button.dataset.room)));
    document.querySelectorAll('[data-explore]').forEach(button=>button.addEventListener('click',()=>this.open(button.dataset.explore)));
    $('collection-compose').addEventListener('click',()=>{$('collection-dialog').close();this.open('compose');});
    $('ex-next').addEventListener('click',()=>{const i=ROOMS.findIndex(r=>r.id===this.active);if(i===4)this.journey.choose('game');else this.selectRoom(ROOMS[i+1].id);});
    $('ex-prev').addEventListener('click',()=>{const i=ROOMS.findIndex(r=>r.id===this.active);if(i===0)this.journey.returnHall();else this.selectRoom(ROOMS[i-1].id);});
    $('museum-to-game').addEventListener('click',()=>this.journey.choose('game'));
    $('museum-to-hall').addEventListener('click',()=>this.journey.returnHall());
    this.dialog.querySelectorAll('[data-craft]').forEach(button=>button.addEventListener('click',()=>this.journey.goPosition(.23+Number(button.dataset.craft)*.052)));
    $('craft-color').addEventListener('click',()=>{this.craftVariant=1-this.craftVariant;this.drawCraft();});
    for(const id of ['craft-zoom','craft-arm'])$(id).addEventListener('input',()=>this.drawCraft());
    this.dialog.querySelectorAll('[data-story]').forEach(button=>button.addEventListener('click',()=>this.journey.goPosition(.46+Number(button.dataset.story)*.06)));
    $('story-play').addEventListener('click',()=>this.play(this.storyStep));$('light-play').addEventListener('click',()=>this.play(0));
    for(const id of ['light-position','light-depth','light-color'])$(id).addEventListener('input',()=>this.drawLight());
    $('light-reset').addEventListener('click',()=>{$('light-position').value=-25;$('light-depth').value=30;$('light-color').checked=false;this.drawLight();});
    $('compose-title').addEventListener('input',()=>{this.draft.title=$('compose-title').value.slice(0,18);this.updateComposer();});
    $('compose-scene').addEventListener('change',()=>{this.draft.scene=$('compose-scene').value;this.updateComposer();});
    $('compose-count').addEventListener('change',()=>{this.draft.count=Number($('compose-count').value);if(this.draft.count===1)this.draft.selected=0;this.syncComposer();this.updateComposer();});
    this.dialog.querySelectorAll('[data-actor]').forEach(b=>b.addEventListener('click',()=>{this.draft.selected=Number(b.dataset.actor);this.syncComposer();}));
    for(const [id,key,scale] of [['compose-x','x',1],['compose-y','y',1],['compose-size','size',.01],['compose-pose','pose',1]])$(id).addEventListener('input',()=>{this.draft.actors[this.draft.selected][key]=Number($(id).value)*scale;this.updateComposer();});
    $('compose-flip').addEventListener('change',()=>{this.draft.actors[this.draft.selected].flip=$('compose-flip').checked;this.updateComposer();});
    $('compose-reset').addEventListener('click',()=>{this.draft=defaultDraft();this.syncComposer();this.updateComposer();});
    $('compose-save').addEventListener('click',()=>this.saveComposition());$('compose-download').addEventListener('click',()=>this.download(this.poster(),'借光-'+(this.draft.title||'无题小戏')));
    const canvas=$('compose-canvas');let drag=null;
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=this.canvasPoint(canvas,e);const hits=this.actorBounds();let hit=-1;for(let i=hits.length-1;i>=0;i--){const b=hits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){hit=i;break;}}if(hit<0)return;e.preventDefault();this.draft.selected=hit;const a=this.draft.actors[hit];drag={pointer:e.pointerId,x:p.x,y:p.y,startX:a.x,startY:a.y};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});this.syncComposer();});
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=this.canvasPoint(canvas,e),a=this.draft.actors[this.draft.selected];a.x=Math.max(16,Math.min(84,drag.startX+(p.x-drag.x)/12));a.y=Math.max(45,Math.min(86,drag.startY+(p.y-drag.y)/8.4));this.syncComposer();this.updateComposer(false);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{if(drag){drag=null;this.updateComposer();}});
    canvas.addEventListener('keydown',e=>{const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=shifts[e.key];if(!delta)return;e.preventDefault();const a=this.draft.actors[this.draft.selected],step=e.shiftKey?4:1;a.x=Math.max(16,Math.min(84,a.x+delta[0]*step));a.y=Math.max(45,Math.min(86,a.y+delta[1]*step));this.syncComposer();this.updateComposer();});
    this.bindSceneHandles();
    window.addEventListener('journey:frame',event=>this.updateRoute(event.detail));
  }
  open(id){this.journey.openMuseum(id);}
  resume(){this.journey.returnHall();}
  selectRoom(id){this.journey.openMuseum(id);}
  updateDiscovery(){}
  updateRoute({route,progress,transition}){
    const visible=route==='museum'&&!this.journey.gameActive;
    this.dialog.hidden=!visible;$('museum-handles').hidden=!visible||transition;
    document.body.classList.toggle('in-museum',visible);
    if(!visible)return;
    const stop=museumStop(progress),room=ROOMS.find(r=>r.id===stop.id);
    if(this.active!==room.id||!this.visited.size){
      const focus=document.activeElement;
      if(focus?.closest('.ex-room')&&focus.closest('.ex-room').id!=='ex-'+room.id)document.activeElement.blur();
      this.active=room.id;this.visited.add(room.id);
      $('ex-title').textContent=room.title;$('ex-intro').textContent=room.intro;$('ex-eyebrow').textContent=room.en;
      $('ex-room-caption').textContent=`${room.no} / ${room.name}`;$('ex-visited').textContent=`已探访 ${this.visited.size} / 5`;
      this.dialog.querySelectorAll('[data-room]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.room===room.id)));
      ROOMS.forEach(r=>$('ex-'+r.id).hidden=r.id!==room.id);
      const index=ROOMS.indexOf(room);$('ex-next').textContent=index===4?'前往戏台 ↗':`下一站 · ${ROOMS[index+1].name} →`;
      $('ex-prev').textContent=index===0?'↶ 返回内厅':`← ${ROOMS[index-1].name}`;
      this.dialog.querySelector('.museum-tools').scrollTop=0;
    }
    const craftStep=Math.min(3,Math.floor(clamp((progress-.22)/.20)*4));
    if(room.id==='craft'&&craftStep!==this.craftStep){this.craftStep=craftStep;this.drawCraft();}
    const storyStep=progress<.515?0:progress<.565?1:2;
    if(room.id==='stories'&&storyStep!==this.storyStep){this.storyStep=storyStep;this.drawStory();}
    this.dialog.querySelector('.museum-exit').hidden=progress<.965;
    this.positionHandles(progress);
  }
  play(index){this.journey.requestPlay(index);}
  bindSceneHandles(){
    const events=[['handle-lamp','lamp'],['handle-puppet','puppet'],['handle-arm','arm'],['handle-actor-0','actor-0'],['handle-actor-1','actor-1']];
    for(const [id,kind] of events){
      const handle=$(id);let drag=null;
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0||this.journey.state.transition)return;
        event.preventDefault();handle.setPointerCapture(event.pointerId);handle.focus({preventScroll:true});
        const actor=kind.startsWith('actor-')?Number(kind.at(-1)):null;
        if(actor!==null){this.draft.selected=actor;this.syncComposer();}
        drag={id:event.pointerId,x:event.clientX,y:event.clientY,lamp:Number($('light-position').value),depth:Number($('light-depth').value),arm:Number($('craft-arm').value),actor:actor===null?null:{...this.draft.actors[actor]}};
        this.journey.state.interaction=kind;
      });
      handle.addEventListener('pointermove',event=>{
        if(!drag||drag.id!==event.pointerId)return;
        const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
        if(kind==='lamp'){$('light-position').value=clamp(drag.lamp+dx*.5,-80,80);this.drawLight();}
        else if(kind==='puppet'){$('light-depth').value=clamp(drag.depth-dy*.25,10,65);this.drawLight();}
        else if(kind==='arm'){$('craft-arm').value=clamp(drag.arm-dy*.6+dx*.3,-30,120);this.drawCraft();}
        else {const actor=this.draft.actors[this.draft.selected],bounds=this.screenBounds();actor.x=clamp(drag.actor.x+dx/bounds.width*100,16,84);actor.y=clamp(drag.actor.y+dy/bounds.height*100,45,86);this.syncComposer();this.updateComposer(false);}
      });
      const release=()=>{if(!drag)return;drag=null;this.journey.state.interaction=null;this.journey.goPosition(this.journey.progress,true);if(kind.startsWith('actor-'))this.updateComposer();};
      for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,release);
      handle.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();const delta=event.key==='ArrowRight'||event.key==='ArrowUp'?1:-1;
        if(kind==='lamp'){$('light-position').value=clamp(Number($('light-position').value)+delta*4,-80,80);this.drawLight();}
        else if(kind==='puppet'){$('light-depth').value=clamp(Number($('light-depth').value)+delta*2,10,65);this.drawLight();}
        else if(kind==='arm'){$('craft-arm').value=clamp(Number($('craft-arm').value)+delta*4,-30,120);this.drawCraft();}
        else {this.draft.selected=Number(kind.at(-1));const actor=this.draft.actors[this.draft.selected];const key=event.key==='ArrowLeft'||event.key==='ArrowRight'?'x':'y';actor[key]=clamp(actor[key]+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1),key==='x'?16:45,key==='x'?84:86);this.syncComposer();this.updateComposer();}
      });
    }
  }
  project(point){
    const canvas=this.journey.intro.canvas,rect=canvas.getBoundingClientRect();
    const p=point.clone().project(this.journey.intro.cameraG);
    return {x:rect.left+(p.x*.5+.5)*rect.width,y:rect.top+(-p.y*.5+.5)*rect.height,visible:p.z<1&&p.z>-1};
  }
  screenBounds(){
    const world=this.journey.intro.world,screen=world.screen;
    const a=this.project(screen.localToWorld(screen.position.clone().set(-5,3.05,0)));
    const b=this.project(screen.localToWorld(screen.position.clone().set(5,-3.05,0)));
    return {left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),width:Math.max(1,Math.abs(b.x-a.x)),height:Math.max(1,Math.abs(b.y-a.y))};
  }
  positionHandles(progress){
    const world=this.journey.intro.world;if(!world)return;
    const position=(id,point,show)=>{const button=$(id);button.hidden=!show;if(!show)return;const p=this.project(point);button.style.left=p.x+'px';button.style.top=p.y+'px';button.hidden=!p.visible;};
    position('handle-lamp',world.lamp.getWorldPosition(world.lamp.position.clone()),this.active==='light');
    position('handle-puppet',world.hero.position.clone(),this.active==='light');
    position('handle-arm',world.hero.position.clone().add(world.hero.position.clone().set(.6,-.8,.1)),this.active==='craft'&&this.craftStep===3);
    const bounds=this.screenBounds();
    for(let i=0;i<2;i++){
      const button=$('handle-actor-'+i),actor=this.draft.actors[i];
      button.hidden=this.active!=='compose'||i>=this.draft.count||progress<.87;
      button.style.left=(bounds.left+bounds.width*actor.x/100)+'px';button.style.top=(bounds.top+bounds.height*(actor.y/100-.20*actor.size))+'px';
    }
  }
  canvasPoint(canvas,e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  outputs(){this.dialog.querySelectorAll('input[type=range]').forEach(input=>{const out=$(input.id+'-value');if(out)out.textContent=Math.round(Number(input.value))+(input.dataset.unit||'');});}
  drawCraft(){
    const step=CRAFT[this.craftStep],canvas=$('craft-canvas'),ctx=canvas.getContext('2d');drawPaper(ctx,700,780);
    const zoom=$('craft-zoom').checked;ctx.save();if(zoom){ctx.translate(-180,-110);ctx.scale(1.65,1.65);}
    const art=puppetCanvas(Number($('craft-arm').value),this.craftVariant);ctx.save();
    if(step.mode==='material'){ctx.filter='sepia(1) saturate(.35)';ctx.globalAlpha=.72;}
    if(step.mode==='cut')ctx.filter='sepia(1) contrast(1.4)';ctx.drawImage(art,145,38,410,700);ctx.restore();
    if(step.mode==='joint'){ctx.strokeStyle='#9a4c30';ctx.lineWidth=2;for(const [x,y] of [[403,284],[394,402],[347,637]]){ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+15,y);ctx.lineTo(x+52,y);ctx.stroke();}ctx.font='14px sans-serif';ctx.fillStyle='#763e2d';ctx.fillText('关节示意',442,288);}
    ctx.restore();$('craft-number').textContent=`0${this.craftStep+1} / 04`;$('craft-title').textContent=step.title;$('craft-text').textContent=step.text;$('craft-note').textContent=step.note;
    this.dialog.querySelectorAll('[data-craft]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.craft)===this.craftStep)));
    $('craft-arm-control').hidden=step.mode!=='joint';$('craft-color').hidden=step.mode!=='color';$('craft-color').textContent=this.craftVariant?'换成朱红配色':'换成青绿配色';this.outputs();
    this.journey.intro.world?.setCraft(Number($('craft-arm').value),this.craftVariant,$('craft-zoom').checked);this.journey.intro.interactionDirty=true;
  }
  drawStory(){
    const s=STORY[this.storyStep],canvas=$('story-canvas'),ctx=canvas.getContext('2d');this.drawBackdrop(ctx,1000,700,s.scene);
    this.drawActor(ctx,{x:39,y:82,size:1,pose:s.pose,variant:s.actor,flip:false},1000,700);
    if(this.storyStep===2)this.drawActor(ctx,{x:69,y:82,size:1,pose:65,variant:1,flip:true},1000,700);
    for(const [id,key] of [['story-name','title'],['story-line','line'],['story-detail','detail'],['story-task','task']])$(id).textContent=s[key];
    this.dialog.querySelectorAll('[data-story]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.story)===this.storyStep)));
    $('story-play').textContent=`去玩第${['一','二','三'][this.storyStep]}幕 ↗`;
  }
  drawLight(){
    const canvas=$('light-canvas'),ctx=canvas.getContext('2d'),w=1000,h=760;drawPaper(ctx,w,h);
    const lamp=Number($('light-position').value)/100,depth=Number($('light-depth').value)/100,scale=7/(7-depth*5);
    const x=.5-lamp*(scale-1)*.4;ctx.save();ctx.globalAlpha=.78;ctx.filter=$('light-color').checked?'none':'brightness(.35) sepia(1)';const height=340*scale;ctx.drawImage(puppetCanvas(38,0),w*x-height*.585/2,560-height,height*.585,height);ctx.restore();
    ctx.strokeStyle='#8c7048';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(100,655);ctx.lineTo(900,655);ctx.stroke();
    const lx=500+lamp*320,px=500;ctx.strokeStyle='#a78045';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(lx,720);ctx.lineTo(px,688-depth*35);ctx.lineTo(w*x,655);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#885333';ctx.beginPath();ctx.arc(lx,720,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29483a';ctx.beginPath();ctx.arc(px,688-depth*35,7,0,Math.PI*2);ctx.fill();ctx.font='16px sans-serif';ctx.fillStyle='#4e4532';ctx.fillText('幕',70,661);ctx.fillText('灯',lx-8,750);ctx.fillText('影人',px+14,692-depth*35);
    $('light-caption').textContent=`影子约放大到 ${scale.toFixed(2)} 倍。${lamp===0?'光源居中，影子也居中。':lamp<0?'灯向左移，影子向右偏。':'灯向右移，影子向左偏。'}`;this.outputs();
    this.journey.intro.world?.setExperiment(lamp*3,depth*5,$('light-color').checked);this.journey.intro.interactionDirty=true;
  }
  drawBackdrop(ctx,w,h,scene){
    drawPaper(ctx,w,h);ctx.save();ctx.globalAlpha=.14;ctx.fillStyle='#687453';ctx.beginPath();ctx.moveTo(0,h*.83);ctx.bezierCurveTo(w*.2,h*.4,w*.37,h*.95,w*.56,h*.69);ctx.bezierCurveTo(w*.75,h*.48,w*.9,h*.65,w,h*.55);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();ctx.restore();
    if(scene==='moon'){ctx.fillStyle='#f8edc2';ctx.beginPath();ctx.arc(w*.75,h*.23,h*.12,0,Math.PI*2);ctx.fill();ctx.save();ctx.globalAlpha=.32;ctx.drawImage(this.scenery.gate,w*.61,h*.35,w*.32,h*.45);ctx.restore();}
    if(scene==='bridge'){ctx.save();ctx.globalAlpha=.42;ctx.drawImage(this.scenery.bridge,w*.12,h*.72,w*.76,h*.18);ctx.restore();ctx.strokeStyle='#84927666';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(w*.12,h*(.93+i*.016));ctx.bezierCurveTo(w*.4,h*(.9+i*.016),w*.65,h*(.95+i*.016),w*.88,h*(.92+i*.016));ctx.stroke();}}
    if(scene==='garden'){ctx.save();ctx.globalAlpha=.55;ctx.drawImage(this.scenery.branch,w*.63,-h*.03,w*.4,h*.8);ctx.restore();}
  }
  drawActor(ctx,a,w,h){
    const height=h*.52*a.size,width=height*480/820,x=w*a.x/100,y=h*a.y/100;
    ctx.save();ctx.translate(x,y+height*.085);if(a.flip)ctx.scale(-1,1);ctx.drawImage(puppetCanvas(a.pose,a.variant),-width/2,-height,width,height);ctx.restore();
  }
  actorBounds(){return this.draft.actors.slice(0,this.draft.count).map(a=>{const h=840*.52*a.size,w=h*480/820;return {x:1200*a.x/100-w/2,y:840*a.y/100-h*.915,w,h};});}
  drawComposition(ctx,w,h,selection=false){
    this.drawBackdrop(ctx,w,h,this.draft.scene);this.draft.actors.slice(0,this.draft.count).forEach(a=>this.drawActor(ctx,a,w,h));
    if(selection){const a=this.draft.actors[this.draft.selected];ctx.save();ctx.strokeStyle='#884c31';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.ellipse(w*a.x/100,h*a.y/100-8,50*a.size,12,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#56412c';ctx.font=`${Math.round(w*.02)}px sans-serif`;ctx.fillText('借光 · 珞珈夜戏',w*.055,h*.09);
    ctx.textAlign='right';ctx.fillStyle='#7e4530';ctx.font=`${Math.round(w*.035)}px "Zhi Mang Xing",serif`;ctx.fillText(this.draft.title||'无题小戏',w*.94,h*.1);ctx.textAlign='left';
    ctx.fillStyle='#766447';ctx.font=`${Math.round(w*.012)}px sans-serif`;ctx.fillText('原创数字小戏 / 江汉皮影主题体验',w*.055,h*.96);
  }
  syncComposer(){
    const d=this.draft,a=d.actors[d.selected];$('compose-title').value=d.title;$('compose-scene').value=d.scene;$('compose-count').value=d.count;
    for(const [id,value] of [['compose-x',a.x],['compose-y',a.y],['compose-size',a.size*100],['compose-pose',a.pose]])$(id).value=value;
    $('compose-flip').checked=a.flip;this.dialog.querySelectorAll('[data-actor]').forEach(b=>{b.disabled=Number(b.dataset.actor)>=d.count;b.setAttribute('aria-pressed',String(Number(b.dataset.actor)===d.selected));});
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,false);this.outputs();this.journey.intro.world?.setComposition($('compose-canvas'));this.journey.intro.interactionDirty=true;
  }
  updateComposer(persist=true){
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,false);this.outputs();this.journey.intro.world?.setComposition($('compose-canvas'));this.journey.intro.interactionDirty=true;if(!persist)return;
    try{this.storage.setItem(DRAFT_KEY,JSON.stringify(this.draft));$('compose-status').textContent='草稿已保存 · 下次回来可以接着排';}catch{$('compose-status').textContent='草稿暂存于本页，请下载戏票保存';}
  }
  poster(){const c=document.createElement('canvas');c.width=1200;c.height=840;this.drawComposition(c.getContext('2d'),1200,840);return c.toDataURL('image/webp',.86);}
  saveComposition(){
    const image=this.poster(),title=this.draft.title.trim()||'无题小戏';this.works=[{image,title,date:new Date().toISOString()},...this.works].slice(0,6);
    try{this.storage.setItem(COMPOSITION_KEY,JSON.stringify(this.works));$('compose-status').textContent='已收进留影册，也可以下载戏票';}catch{$('compose-status').textContent='本次留影暂存在页面中，请下载保存';}
    this.renderWorks();this.toast('小戏已收进留影册');this.animateTicket(image);
  }
  animateTicket(image){
    const ticket=document.createElement('img');ticket.className='collected-ticket';ticket.src=image;ticket.alt='刚刚收下的小戏戏票';
    document.body.append(ticket);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds=this.screenBounds();
    const animation=ticket.animate([{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',transform:'rotate(0deg)',opacity:1},{left:'78%',top:'12%',width:'120px',transform:reduced?'none':'rotate(-8deg)',opacity:1},{left:'86%',top:'6%',width:'40px',opacity:0}],{duration:reduced?350:1100,easing:'cubic-bezier(.2,.7,.3,1)'});
    animation.finished.finally(()=>ticket.remove());
  }
  renderWorks(){
    const populate=(root,compact)=>{root.replaceChildren();for(const work of this.works){const figure=document.createElement('figure');figure.className=compact?'work-item':'ex-personal-work';const img=document.createElement('img');img.src=work.image;img.alt=work.title+'的自由编戏留影';img.loading='lazy';const caption=document.createElement('figcaption'),name=document.createElement('span'),button=document.createElement('button');name.textContent=work.title;button.textContent='下载 ↗';button.setAttribute('aria-label','下载戏票：'+work.title);button.addEventListener('click',()=>this.download(work.image,'借光-'+work.title));caption.append(name,button);figure.append(img,caption);root.append(figure);}};
    populate($('compose-gallery'),false);populate($('composition-works'),true);$('compose-empty').hidden=!!this.works.length;$('ex-collection-empty').hidden=!!this.works.length;const count=$('works-grid').children.length+this.works.length;$('collection-count').textContent=count;$('works-count').textContent=String(count).padStart(2,'0');
  }
  download(image,name){const a=document.createElement('a');a.href=image;a.download=name+'.webp';a.click();}
}
