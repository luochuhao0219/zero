import {museumStop} from './route-state.js';
import {ROOMS,SOURCES,museumRoomId} from './museum-content.js';
import {galleryJourney} from './museum-gallery.js';
const $=id=>document.getElementById(id);

/** One physical cabinet per topic, along the museum's left-hand corridor. */
export class Exploration {
  constructor({journey,toast,onPause,onResume}){
    Object.assign(this,{journey,toast});this.active='heritage';this.visited=new Set();this.selection=new Map();
    this.originalCanvasLabel=journey.intro.canvas.getAttribute('aria-label');
    this.mount();this.bind();
  }
  mount(){
    const entry=document.createElement('button');entry.id='explore-open';entry.className='nav-pill';entry.textContent='皮影馆';
    document.querySelector('.header-actions').insertBefore(entry,$('collection-open'));
    const root=document.createElement('section');root.id='museum-ui';root.className='museum-route museum-editorial museum-cabinet-route';root.hidden=true;
    root.setAttribute('aria-label','江汉皮影馆，沿展柜参观');
    root.innerHTML=`<header class="museum-gallery-intro"><p>JIANGHAN SHADOW PUPPET GALLERY</p><h2>沿着展柜，<br>慢慢看。</h2><p>从一方水土，走到一门手艺的传承。<br>五个柜子，五段故事。</p><button id="museum-start">走近第一柜 <span>→</span></button><small>滚动自由前行；到柜前自动对正，继续滚动即可离开。</small></header>
      <div class="museum-cabinet-pins" aria-label="长廊中的展柜">${ROOMS.map(r=>`<button class="museum-cabinet-pin" data-cabinet="${r.id}" aria-label="走近第 ${r.no} 柜，${r.name}"><b>${r.no}</b><span>${r.name}</span></button>`).join('')}</div>
      <button id="museum-overview" class="museum-overview-return">← 长廊全览</button>
      <button id="museum-sign" class="museum-sign-hotspot" aria-label="打开当前展柜讲解栏">查看讲解 ↗</button>
      <aside class="museum-tools museum-reading museum-placard" aria-label="当前展柜的完整展签"><div class="museum-tool-heading"><span id="ex-room-caption"></span><button id="museum-expand" aria-expanded="false" aria-controls="museum-article">关闭展签 ×</button></div>
        <h2 id="ex-title"></h2><p id="ex-intro" class="museum-case-intro"></p>
        <article id="museum-article" aria-labelledby="ex-title"><p id="museum-article-text"></p><div id="museum-sections"></div><div id="museum-sources" class="museum-sources"></div></article>
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
      if(this.overview)this.journey.returnHall();else if(i===0)this.open();else this.selectRoom(ROOMS[i-1].id);
    });
    $('ex-next').addEventListener('click',()=>{
      const i=ROOMS.findIndex(r=>r.id===this.active);
      if(this.overview)this.selectRoom('heritage');else if(i===ROOMS.length-1)this.journey.returnHall();else this.selectRoom(ROOMS[i+1].id);
    });
    $('museum-expand').addEventListener('click',()=>this.expandReading(false));
    $('museum-sign').addEventListener('click',()=>this.expandReading(true));
    window.addEventListener('journey:frame',event=>this.updateRoute(event.detail));
  }
  open(id){this.expandReading(false);this.journey.openMuseum(museumRoomId(id));}
  resume(){this.journey.returnHall();}
  selectRoom(id){this.open(id);}
  updateDiscovery(){}
  expandReading(expanded){
    this.dialog.querySelector('.museum-reading').classList.toggle('is-expanded',expanded);
    this.dialog.classList.toggle('paper-open',expanded);$('museum-sign').hidden=expanded;
    $('museum-expand').setAttribute('aria-expanded',String(expanded));
    if(expanded)this.dialog.querySelector('.museum-reading').scrollTop=0;
  }
  updateRoute({route,progress,transition}){
    const visible=route==='museum'&&!transition&&!this.journey.gameActive;
    this.dialog.hidden=!visible;document.body.classList.toggle('in-museum',visible);
    if(!visible){if(this.wasVisible)this.journey.intro.canvas.setAttribute('aria-label',this.originalCanvasLabel);this.wasVisible=false;return;}
    const entering=!this.wasVisible;this.wasVisible=true;
    const view=galleryJourney(progress),overview=view.overview>.5;
    this.dialog.style.visibility=progress<.10?'hidden':'visible';
    if(view.reading<.5&&this.dialog.classList.contains('paper-open'))this.expandReading(false);
    const room=ROOMS.find(r=>r.id===museumStop(progress).id);
    const changed=!this.contentReady||this.active!==room.id||this.overview!==overview;
    this.active=room.id;this.overview=overview;
    const signPoint=this.journey.intro.world.backdrop.signPositions?.[ROOMS.indexOf(room)];
    const sign=$('museum-sign');sign.hidden=!signPoint||!signPoint[2]||view.reading<.65||this.dialog.classList.contains('paper-open');
    if(signPoint){sign.style.left=`${signPoint[0]*100}%`;sign.style.top=`${signPoint[1]*100}%`;}
    const reading=this.dialog.querySelector('.museum-reading');
    reading.style.opacity=String(view.reading);reading.inert=view.reading<.5;
    this.dialog.style.setProperty('--gallery-overview',String(view.overview));
    this.dialog.dataset.overview=String(overview);this.dialog.dataset.reading=String(view.reading>.5);
    this.dialog.querySelector('.museum-gallery-intro').inert=view.overview<.5;
    {
      const points=this.journey.intro.world.backdrop.cabinetPositions;
      this.pins.forEach((pin,i)=>{const point=points[i];pin.hidden=point[0]<.045||point[0]>.955||point[2]===false;pin.style.left=`${point[0]*100}%`;pin.style.top=`${point[1]*100}%`;pin.setAttribute('aria-pressed',String(!overview&&pin.dataset.cabinet===room.id));});
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
    this.dialog.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(!overview&&b.dataset.room===room.id)));
    const i=ROOMS.indexOf(room);
    $('ex-prev').textContent=overview?'↶ 返回内厅':i===0?'← 长廊全览':`← 第 ${ROOMS[i-1].no} 柜`;
    $('ex-next').textContent=overview?'从第一柜开始 →':i===ROOMS.length-1?'参观完毕 · 返回内厅 ↗':`走向第 ${ROOMS[i+1].no} 柜 →`;
    this.renderArticle(room);reading.scrollTop=0;
  }
  renderArticle(room){
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
    this.journey.intro.canvas.setAttribute('aria-label',this.overview?'江汉皮影馆长廊，五个木玻璃展柜沿走道依次排列。点击编号或滚动走近展柜。':`第 ${room.no} 柜，${room.name}。${room.intro}`);
  }
}
