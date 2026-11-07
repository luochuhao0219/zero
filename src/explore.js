import {puppetCanvas,drawPaper,gateCanvas,branchCanvas,bridgeCanvas} from './art.js';
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
    const headerButton=document.createElement('button');headerButton.id='explore-open';headerButton.className='nav-pill';headerButton.textContent='探索';headerButton.setAttribute('aria-haspopup','dialog');
    document.querySelector('.header-actions').insertBefore(headerButton,$('collection-open'));
    const launcher=document.createElement('aside');launcher.id='explore-discovery';launcher.className='ex-discovery';launcher.hidden=true;launcher.setAttribute('aria-label','沿途探索');
    launcher.innerHTML='<span class="ex-discovery-note">在这里，停留片刻</span><button id="explore-scene-open"><span class="ex-discovery-symbol" aria-hidden="true">＋</span><span><small id="explore-scene-label">沿途探索</small><strong id="explore-scene-name">认识江汉皮影</strong></span><span aria-hidden="true">↗</span></button>';
    document.body.append(launcher);
    const dialog=document.createElement('dialog');dialog.id='explore-dialog';dialog.className='exploration';dialog.setAttribute('aria-labelledby','ex-title');
    dialog.innerHTML=`
      <aside class="ex-sidebar"><a class="ex-brand" href="#">借光 <span>沿途拾影</span></a><p class="ex-sidebar-intro">门廊之外，<br>还有一出戏的来处。</p>
        <nav aria-label="探索空间">${ROOMS.map(r=>`<button data-room="${r.id}" aria-pressed="false"><span>${r.no}</span><strong>${r.name}</strong><i aria-hidden="true">↗</i></button>`).join('')}</nav>
        <div class="ex-sidebar-bottom"><span id="ex-visited">已探访 0 / 5</span><p>随时离开，接着刚才的光走。</p></div>
      </aside>
      <div class="ex-main"><header class="ex-top"><span id="ex-room-caption">01 / 识影馆</span><button id="ex-close" aria-label="关闭探索，继续原来的旅程">继续旅程 <span aria-hidden="true">×</span></button></header>
        <div class="ex-scroll" id="ex-scroll"><div class="ex-heading"><p class="ex-eyebrow" id="ex-eyebrow"></p><h2 id="ex-title" tabindex="-1"></h2><p id="ex-intro"></p></div>
          ${this.heritageMarkup()}${this.craftMarkup()}${this.storyMarkup()}${this.lightMarkup()}${this.composeMarkup()}
        </div>
        <footer class="ex-bottom"><span>江汉皮影 · 珞珈新演</span><button id="ex-next">下一站 <span aria-hidden="true">→</span></button></footer>
      </div>`;
    document.body.append(dialog);this.dialog=dialog;
    const collection=document.createElement('section');collection.className='ex-collection';collection.innerHTML='<div class="ex-collection-heading"><h3>我的自由小戏</h3><button id="collection-compose">去编一出 ↗</button></div><p id="ex-collection-empty">还没有自己的小戏。从一张幕开始吧。</p><div id="composition-works" class="works-grid"></div>';
    $('collection-dialog').append(collection);
    // Chapter jumps skip the doorway/backstage intervals, so keep these exhibits
    // reachable at the landing positions too, without changing the scroll route.
    for(const [selector,id,label] of [
      ['.passage-copy-door','heritage','01 · 打开识影馆 ↗'],
      ['.passage-copy-gate','craft','02 · 打开影人工坊 ↗'],
      ['.backstage-copy','light','04 · 打开光影实验 ↗'],
      ['.ready-copy','light','04 · 打开光影实验 ↗'],
    ]){
      const button=document.createElement('button');button.className='ex-inline-entry';
      button.dataset.explore=id;button.textContent=label;button.setAttribute('aria-haspopup','dialog');
      document.querySelector(selector)?.append(button);
    }
    const outroButton=document.createElement('button');outroButton.className='ex-outro-button';outroButton.textContent='自由编一出戏 ↗';outroButton.dataset.explore='compose';document.querySelector('.outro-bottom').append(outroButton);
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
    $('explore-scene-open').addEventListener('click',()=>this.open(this.discoveryRoom||'heritage'));
    $('ex-close').addEventListener('click',()=>this.dialog.close());
    this.dialog.querySelector('.ex-brand').addEventListener('click',e=>{e.preventDefault();this.selectRoom('heritage');});
    this.dialog.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>this.selectRoom(b.dataset.room)));
    document.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',()=>this.open(b.dataset.explore)));
    $('collection-compose').addEventListener('click',()=>{$('collection-dialog').close();this.open('compose');});
    $('ex-next').addEventListener('click',()=>{const i=ROOMS.findIndex(r=>r.id===this.active);this.selectRoom(ROOMS[(i+1)%ROOMS.length].id);});
    this.dialog.addEventListener('close',()=>this.resume());
    this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
    this.dialog.querySelectorAll('[data-craft]').forEach(b=>b.addEventListener('click',()=>{this.craftStep=Number(b.dataset.craft);this.drawCraft();}));
    $('craft-color').addEventListener('click',()=>{this.craftVariant=1-this.craftVariant;this.drawCraft();});
    for(const id of ['craft-zoom','craft-arm'])$(id).addEventListener('input',()=>this.drawCraft());
    this.dialog.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>{this.storyStep=Number(b.dataset.story);this.drawStory();}));
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
    this.syncDiscovery=()=>{if(this.discoveryFrame)return;this.discoveryFrame=requestAnimationFrame(()=>{this.discoveryFrame=null;this.updateDiscovery();});};
    window.addEventListener('scroll',this.syncDiscovery,{passive:true});window.addEventListener('resize',this.syncDiscovery,{passive:true});this.updateDiscovery();
  }
  open(id){
    if(this.dialog.open){this.selectRoom(id);return;}
    if(this.onPause()===false)return;
    this.returnFocus=document.activeElement;this.oldOverflow=document.body.style.overflow;
    document.body.classList.add('is-exploring');document.body.style.overflow='hidden';this.journey.setExploring(true);
    this.dialog.showModal();this.selectRoom(id);
  }
  resume(){
    document.body.classList.remove('is-exploring');document.body.style.overflow=this.oldOverflow;
    // No route navigation on close: preserve scroll offset, including after a viewport change.
    this.journey.resizeProgress=undefined;const top=this.journey.opening.getBoundingClientRect().top+scrollY;
    const position=top+this.journey.target*(this.journey.opening.offsetHeight-innerHeight);
    scrollTo({top:position,behavior:'instant'});this.journey.setExploring(false);this.onResume();
    if(this.journey.gameActive)$('stage').focus({preventScroll:true});else if(this.returnFocus?.isConnected&&this.returnFocus.getClientRects().length&&!this.returnFocus.closest('[inert]'))this.returnFocus.focus({preventScroll:true});else $('explore-open').focus({preventScroll:true});this.updateDiscovery();
  }
  selectRoom(id){
    const room=ROOMS.find(r=>r.id===id)||ROOMS[0];this.active=room.id;this.visited.add(room.id);
    $('ex-title').textContent=room.title;$('ex-intro').textContent=room.intro;$('ex-eyebrow').textContent=room.en;$('ex-room-caption').textContent=`${room.no} / ${room.name}`;
    $('ex-visited').textContent=`已探访 ${this.visited.size} / 5`;
    this.dialog.querySelectorAll('[data-room]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.room===room.id));if(b.dataset.room===room.id)b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});
    ROOMS.forEach(r=>$('ex-'+r.id).hidden=r.id!==room.id);$('ex-scroll').scrollTop=0;
    const next=ROOMS[(ROOMS.indexOf(room)+1)%ROOMS.length];$('ex-next').textContent=`${room.id==='compose'?'回到':'下一站 · '}${next.name} →`;
    if(room.id==='compose')this.syncComposer();$('ex-title').focus({preventScroll:true});
  }
  updateDiscovery(){
    const p=this.journey.target;let room=null;
    if(p>.115&&p<.215)room=ROOMS[0];else if(p>=.215&&p<.325)room=ROOMS[1];else if(p>.405&&p<.615)room=ROOMS[2];else if(p>.73&&p<.82)room=ROOMS[3];else if(p>.905)room=ROOMS[4];
    $('explore-discovery').hidden=!room;if(!room)return;this.discoveryRoom=room.id;$('explore-scene-label').textContent=`${room.no} / ${room.name}`;$('explore-scene-name').textContent=room.hint;
  }
  play(index){this.dialog.close();this.onPlay(index);}
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
    const lamp=Number($('light-position').value)/100,depth=Number($('light-depth').value)/100,scale=1/(1-depth*.7);
    const x=.5-lamp*(scale-1)*.4;ctx.save();ctx.globalAlpha=.78;ctx.filter=$('light-color').checked?'none':'brightness(.35) sepia(1)';const height=340*scale;ctx.drawImage(puppetCanvas(38,0),w*x-height*.585/2,560-height,height*.585,height);ctx.restore();
    ctx.strokeStyle='#8c7048';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(100,655);ctx.lineTo(900,655);ctx.stroke();
    const lx=500+lamp*320,px=500;ctx.strokeStyle='#a78045';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(lx,720);ctx.lineTo(px,688-depth*35);ctx.lineTo(w*x,655);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#885333';ctx.beginPath();ctx.arc(lx,720,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29483a';ctx.beginPath();ctx.arc(px,688-depth*35,7,0,Math.PI*2);ctx.fill();ctx.font='16px sans-serif';ctx.fillStyle='#4e4532';ctx.fillText('幕',70,661);ctx.fillText('灯',lx-8,750);ctx.fillText('影人',px+14,692-depth*35);
    $('light-caption').textContent=`影子约放大到 ${scale.toFixed(2)} 倍。${lamp===0?'光源居中，影子也居中。':lamp<0?'灯向左移，影子向右偏。':'灯向右移，影子向左偏。'}`;this.outputs();
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
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,true);this.outputs();
  }
  updateComposer(persist=true){
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,true);this.outputs();if(!persist)return;
    try{this.storage.setItem(DRAFT_KEY,JSON.stringify(this.draft));$('compose-status').textContent='草稿已保存 · 下次回来可以接着排';}catch{$('compose-status').textContent='草稿暂存于本页，请下载戏票保存';}
  }
  poster(){const c=document.createElement('canvas');c.width=1200;c.height=840;this.drawComposition(c.getContext('2d'),1200,840);return c.toDataURL('image/webp',.86);}
  saveComposition(){
    const image=this.poster(),title=this.draft.title.trim()||'无题小戏';this.works=[{image,title,date:new Date().toISOString()},...this.works].slice(0,6);
    try{this.storage.setItem(COMPOSITION_KEY,JSON.stringify(this.works));$('compose-status').textContent='已收进留影册，也可以下载戏票';}catch{$('compose-status').textContent='本次留影暂存在页面中，请下载保存';}
    this.renderWorks();this.toast('小戏已收进留影册');
  }
  renderWorks(){
    const populate=(root,compact)=>{root.replaceChildren();for(const work of this.works){const figure=document.createElement('figure');figure.className=compact?'work-item':'ex-personal-work';const img=document.createElement('img');img.src=work.image;img.alt=work.title+'的自由编戏留影';img.loading='lazy';const caption=document.createElement('figcaption'),name=document.createElement('span'),button=document.createElement('button');name.textContent=work.title;button.textContent='下载 ↗';button.setAttribute('aria-label','下载戏票：'+work.title);button.addEventListener('click',()=>this.download(work.image,'借光-'+work.title));caption.append(name,button);figure.append(img,caption);root.append(figure);}};
    populate($('compose-gallery'),false);populate($('composition-works'),true);$('compose-empty').hidden=!!this.works.length;$('ex-collection-empty').hidden=!!this.works.length;const count=$('works-grid').children.length+this.works.length;$('collection-count').textContent=count;$('works-count').textContent=String(count).padStart(2,'0');
  }
  download(image,name){const a=document.createElement('a');a.href=image;a.download=name+'.webp';a.click();}
}
