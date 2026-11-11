import {museumStop,smooth} from './route-state.js';
import {ROOMS,SOURCES,museumRoomId} from './museum-content.js';
import {galleryJourney} from './museum-gallery.js';
import {FreePlayStudio} from './compose-studio.js';
const $=id=>document.getElementById(id);
const ROOM_PHOTOS={
  heritage:{file:'heritage-photo.jpg',alt:'艺人在幕前操纵两个人物皮影',caption:'皮影表演现场'},
  craft:{file:'craft-photo.jpg',alt:'陈列着各式人物皮影的展铺',caption:'江汉皮影人物与作品陈列'},
  voices:{file:'voices-photo.jpg',alt:'手艺人用刻刀制作皮影纹样',caption:'皮影纹样制作'},
  people:{file:'people-photo.jpg',alt:'幕布上两个人物与马匹组成的皮影戏场景',caption:'皮影戏剧目场景'},
  legacy:{file:'legacy-photo.jpg',alt:'孩子尝试操纵皮影人物',caption:'年轻一代体验皮影表演'},
};

/** One physical cabinet per topic, along the museum's left-hand corridor. */
export class Exploration {
  constructor({journey,toast,onPause,onResume}){
    Object.assign(this,{journey,toast});this.active='heritage';this.visited=new Set();this.selection=new Map();
    this.originalCanvasLabel=journey.intro.canvas.getAttribute('aria-label');
    this.mount();this.bind();this.studio=new FreePlayStudio({toast,onPause,onResume});
  }
  get works(){return this.studio.works;}
  mount(){
    const entry=document.createElement('button');entry.id='explore-open';entry.className='nav-pill';entry.textContent='历史馆';
    document.querySelector('.header-actions').insertBefore(entry,$('collection-open'));
    const root=document.createElement('section');root.id='museum-ui';root.className='museum-route museum-editorial museum-cabinet-route';root.hidden=true;
    root.setAttribute('aria-label','江汉皮影馆，沿展柜参观');
    root.innerHTML=`<header class="museum-gallery-intro"><p>JIANGHAN SHADOW PUPPET GALLERY</p><h2>沿着展柜，<br>慢慢看。</h2><p>从一方水土，走到一门手艺的传承。<br>五个柜子，五段故事。</p><button id="museum-start">走近第一柜 <span>→</span></button><small>滚动自由前行；到柜前自动对正，继续滚动即可离开。</small></header>
      <div class="museum-cabinet-pins" aria-label="长廊中的展柜">${ROOMS.map(r=>`<button class="museum-cabinet-pin" data-cabinet="${r.id}" aria-label="走近第 ${r.no} 柜，${r.name}"><b>${r.no}</b><span>${r.name}</span></button>`).join('')}</div>
      <button id="museum-overview" class="museum-overview-return">← 长廊全览</button>
      <button id="museum-sign" class="museum-sign-hotspot" aria-label="打开当前展柜讲解" aria-controls="museum-article" aria-expanded="false"><span class="museum-sign-ring" aria-hidden="true"></span><span class="museum-sign-label">查看讲解</span></button>
      <button id="museum-motion" class="museum-motion" hidden aria-label="暂停画中小戏"><span class="museum-motion-icon" aria-hidden="true"></span><span id="museum-motion-label">画中小戏 · 暂停</span></button>
      <aside class="museum-tools museum-reading museum-placard" aria-label="当前展柜的完整展签"><div class="museum-tool-heading"><span id="ex-room-caption"></span><button id="museum-expand" aria-label="关闭展签" aria-expanded="false" aria-controls="museum-article">×</button></div>
        <h2 id="ex-title"></h2><p id="ex-intro" class="museum-case-intro"></p>
        <article id="museum-article" aria-labelledby="ex-title"><figure id="museum-article-photo" class="museum-article-photo"><img id="museum-article-image" alt=""><figcaption id="museum-article-caption"></figcaption></figure><p id="museum-article-text"></p><div id="museum-sections"></div><div id="museum-sources" class="museum-sources"></div></article>
        <div class="museum-placard-foot"><span>江汉皮影 · 数字展陈</span><span id="ex-visited"></span></div>
      </aside>
      <nav class="museum-stops museum-cabinet-trail" aria-label="沿廊五柜">${ROOMS.map(r=>`<button data-room="${r.id}" aria-pressed="false" aria-label="走向第 ${r.no} 柜，${r.name}"><small>${r.no}</small><span>${r.name}</span></button>`).join('')}</nav>
      <footer class="museum-route-footer"><button id="ex-prev">↶ 返回内厅</button><button id="ex-next">从第一柜开始 →</button></footer>`;
    document.body.append(root);this.dialog=root;this.pins=[...root.querySelectorAll('[data-cabinet]')];
  }
  bind(){
    $('explore-open').addEventListener('click',()=>this.open());
    this.dialog.querySelectorAll('[data-room],[data-cabinet]').forEach(b=>b.addEventListener('click',()=>this.selectRoom(b.dataset.room||b.dataset.cabinet)));
    document.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',()=>this.open(b.dataset.explore)));
    $('museum-start').addEventListener('click',()=>this.selectRoom('heritage'));
    $('museum-overview').addEventListener('click',()=>this.open());
    $('ex-prev').addEventListener('click',()=>{
      const i=ROOMS.findIndex(r=>r.id===this.active);
      if(this.atExit)this.selectRoom(ROOMS.at(-1).id);else if(this.overview)this.journey.returnHall();else if(i===0)this.open();else this.selectRoom(ROOMS[i-1].id);
    });
    $('ex-next').addEventListener('click',()=>{
      const i=ROOMS.findIndex(r=>r.id===this.active);
      if(this.atExit)this.journey.enterStage();else if(this.overview)this.selectRoom('heritage');else if(i===ROOMS.length-1)this.journey.goPosition(1);else this.selectRoom(ROOMS[i+1].id);
    });
    $('museum-expand').addEventListener('click',()=>this.expandReading(false));
    $('museum-sign').addEventListener('click',()=>this.expandReading(true));
    $('museum-motion').addEventListener('click',()=>{
      const vignette=this.journey.intro.world.walk.vignette;
      vignette.setPaused(!vignette.paused);this.journey.intro.interactionDirty=true;this.syncMotionControl();
    });
    this.dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.dialog.classList.contains('paper-open')){this.expandReading(false);event.stopPropagation();}});
    window.addEventListener('journey:frame',event=>this.updateRoute(event.detail));
  }
  open(id){this.expandReading(false);this.journey.openMuseum(museumRoomId(id));}
  resume(){this.journey.returnHall();}
  selectRoom(id){this.open(id);}
  updateDiscovery(){}
  expandReading(expanded){
    this.journey.intro.world.walk.vignette.reading=expanded;
    this.dialog.querySelector('.museum-reading').classList.toggle('is-expanded',expanded);
    this.dialog.classList.toggle('paper-open',expanded);$('museum-sign').hidden=expanded;
    $('museum-expand').setAttribute('aria-expanded',String(expanded));
    $('museum-sign').setAttribute('aria-expanded',String(expanded));
    if(expanded){this.dialog.querySelector('.museum-reading').scrollTop=0;$('museum-expand').focus({preventScroll:true});}
    else if(document.activeElement===$('museum-expand'))$('museum-sign').focus({preventScroll:true});
  }
  updateRoute({route,progress,transition,entrance}){
    const visible=route==='museum'&&(!transition||entrance)&&!this.journey.gameActive;
    this.dialog.hidden=!visible;document.body.classList.toggle('in-museum',visible);
    if(!visible){if(this.wasVisible)this.journey.intro.canvas.setAttribute('aria-label',this.originalCanvasLabel);this.wasVisible=false;return;}
    const entering=!this.wasVisible;this.wasVisible=true;
    const view=galleryJourney(progress),overview=view.overview>.5,atExit=progress>.99;
    view.reading*=1-smooth(.935,.965,progress);
    const arrival=entrance?smooth(.09,.12,progress):smooth(.085,.10,progress);
    this.dialog.style.opacity=String(arrival);this.dialog.style.visibility=arrival>.002?'visible':'hidden';
    this.dialog.inert=entrance||arrival<.9;
    this.dialog.setAttribute('aria-busy',String(!!entrance));
    if(view.reading<.5&&this.dialog.classList.contains('paper-open'))this.expandReading(false);
    const room=ROOMS.find(r=>r.id===museumStop(progress).id);
    const changed=!this.contentReady||this.active!==room.id||this.overview!==overview||this.atExit!==atExit;
    this.active=room.id;this.overview=overview;this.atExit=atExit;
    $('museum-motion').hidden=overview||view.reading<.9||this.dialog.classList.contains('paper-open');
    this.syncMotionControl();
    const signPoint=this.journey.intro.world.backdrop.signPositions?.[ROOMS.indexOf(room)];
    const sign=$('museum-sign');sign.hidden=atExit||!signPoint||!signPoint[2]||overview||signPoint[0]<.02||signPoint[0]>.98||signPoint[1]<.06||signPoint[1]>.90||this.dialog.classList.contains('paper-open');
    if(signPoint){
      sign.style.left=`${Math.max(.08,Math.min(.88,signPoint[0]))*100}%`;
      sign.style.top=`${Math.max(.12,Math.min(.84,signPoint[1]))*100}%`;
    }
    const reading=this.dialog.querySelector('.museum-reading');
    reading.style.opacity=String(view.reading);reading.inert=view.reading<.5;
    this.dialog.style.setProperty('--gallery-overview',String(view.overview));
    this.dialog.dataset.overview=String(overview);this.dialog.dataset.reading=String(view.reading>.5);
    this.dialog.querySelector('.museum-gallery-intro').inert=view.overview<.5;
    {
      const points=this.journey.intro.world.backdrop.cabinetPositions;
      this.pins.forEach((pin,i)=>{const point=points[i];pin.hidden=atExit||point[0]<.045||point[0]>.955||point[2]===false;pin.style.left=`${point[0]*100}%`;pin.style.top=`${point[1]*100}%`;pin.setAttribute('aria-pressed',String(!overview&&pin.dataset.cabinet===room.id));});
    }
    if(view.reading>.9&&Math.abs(progress-(this.previousProgress??progress))<.001&&!this.visited.has(room.id)){
      this.visited.add(room.id);$('ex-visited').textContent=`已看 ${this.visited.size} / 5 柜`;
    }
    this.previousProgress=progress;
    if(!changed){if(entering)this.updateCanvasLabel();return;}
    this.contentReady=true;this.expandReading(false);
    this.dialog.dataset.align=room.id==='heritage'?'right':'left';
    $('ex-title').textContent=room.name;$('ex-intro').textContent=room.title;
    $('ex-room-caption').textContent=`第 ${room.no} 柜 / 05`;
    $('ex-visited').textContent=`已看 ${this.visited.size} / 5 柜`;
    this.dialog.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(!overview&&!atExit&&b.dataset.room===room.id)));
    const i=ROOMS.indexOf(room);
    $('ex-prev').textContent=atExit?'← 回看第五柜':overview?'↶ 返回内厅':i===0?'← 长廊全览':`← 第 ${ROOMS[i-1].no} 柜`;
    $('ex-next').textContent=atExit?'拉开帷幕，进入戏台 →':overview?'从第一柜开始 →':i===ROOMS.length-1?'继续向前 · 皮影戏台 →':`走向第 ${ROOMS[i+1].no} 柜 →`;
    this.renderArticle(room);reading.scrollTop=0;
  }
  syncMotionControl(){
    const {paused,reduced}=this.journey.intro.world.walk.vignette;
    const state=reduced?'reduced':paused?'paused':'playing';if(this.motionState===state)return;
    this.motionState=state;const button=$('museum-motion');
    button.dataset.state=state;button.disabled=reduced;
    button.setAttribute('aria-label',reduced?'画中小戏已跟随系统减少动态效果':paused?'播放画中小戏':'暂停画中小戏');
    $('museum-motion-label').textContent=reduced?'画中小戏 · 静态':paused?'画中小戏 · 播放':'画中小戏 · 暂停';
  }
  renderArticle(room){
    const photo=ROOM_PHOTOS[room.id];
    $('museum-article-image').src=`./assets/museum/${photo.file}`;
    $('museum-article-image').alt=photo.alt;
    $('museum-article-caption').textContent=photo.caption;
    $('museum-article-text').textContent=room.overview;
    const sections=$('museum-sections');sections.replaceChildren();
    const used=new Set();
    for(const panel of room.panels){
      const section=document.createElement('section'),heading=document.createElement('h3'),body=document.createElement('p');
      heading.textContent=panel.label;body.textContent=panel.text;section.append(heading,body);sections.append(section);
      panel.sources.forEach(key=>used.add(key));
    }
    $('museum-sources').replaceChildren();
    for(const key of used){const a=document.createElement('a');a.href=SOURCES[key][1];a.textContent=SOURCES[key][0]+' ↗';a.target='_blank';a.rel='noopener noreferrer';$('museum-sources').append(a);}
    this.updateCanvasLabel();
  }
  updateCanvasLabel(){
    const room=ROOMS.find(r=>r.id===this.active);
    this.journey.intro.canvas.setAttribute('aria-label',this.atExit?'历史馆长廊尽头，皮影戏台的绛红帷幕。点击拉开帷幕，继续走入戏台。':this.overview?'江汉皮影馆长廊，五个木玻璃展柜沿走道依次排列。点击编号或滚动走近展柜。':`第 ${room.no} 柜，${room.name}。${room.intro}`);
  }
}
