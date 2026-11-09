import {PassageScene} from './passage-scene.js';
import {RouteState, ROUTE_HEIGHTS, MUSEUM_ENTRY, MUSEUM_STOPS, museumStop, clamp, smooth} from './route-state.js';
import {museumRoomId} from './museum-content.js';

const phases = [
  {id:'home',from:0,to:.115,label:'此刻 · 珞珈',nav:'home'},
  {id:'door',from:.115,to:.21,label:'循光 · 走入门廊',nav:'home'},
  {id:'gate',from:.215,to:.32,label:'穿幕 · 循着灯火',nav:'gate'},
  {id:'crossing',from:.325,to:.405,label:'幕间 · 穿过一线光',nav:'gate'},
  {id:'market',from:.405,to:.535,label:'灯火 · 江汉人间',nav:'market'},
  {id:'arrival',from:.54,to:.615,label:'抵达 · 戏台已近',nav:'market'},
  {id:'stage',from:.635,to:.725,label:'入戏 · 来到幕前',nav:'play'},
  {id:'backstage',from:.73,to:.815,label:'幕后 · 光的来处',nav:'play'},
  {id:'ready',from:.82,to:.90,label:'开场 · 接过手杆',nav:'play'},
  {id:'memories',from:.905,to:1.1,label:'留影 · 这一幕属于你',nav:'memories'},
];
const $ = id => document.getElementById(id);

export class Journey {
  constructor({stage,onEnter,onLeave,onCollection,onProgress=()=>{}}) {
    Object.assign(this,{stage,onEnter,onLeave,onCollection,onProgress});
    this.state = new RouteState(); this.opening = $('journey-opening'); this.play = $('play');
    this.intro = new PassageScene($('opening-canvas'));
    this.progress = 0; this.target = 0; this.gameActive = false; this.active = 'home';
    this.media = matchMedia('(prefers-reduced-motion: reduce)'); this.lastTime = performance.now(); this.dirty = true;
    this.copies = phases.map(phase => ({...phase,element:document.querySelector(`[data-passage-copy="${phase.id}"]`)}));
    this.homeUI = $('home-stage-ui'); this.chapters = document.querySelector('#play .site-footer');
    this.credits = document.querySelector('.site-credits'); this.seam = $('scene-seam');
    this.shade = document.querySelector('.passage-shade');
    document.body.classList.add('has-journey','has-passage','has-continuous','in-passage');
    this.mountHall(); this.setTrack(); this.bind(); this.frame();
    const hash = location.hash.slice(1);
    if (hash) window.addEventListener('passage:ready',()=>this.goTo(hash,true),{once:true});
  }
  mountHall() {
    const hall = document.createElement('section'); hall.id = 'hall-ui'; hall.hidden = true;
    hall.setAttribute('aria-label','教学楼内厅 · 请选择去向');
    hall.innerHTML = `<div class="hall-heading"><p>教学楼内厅 / TWO WAYS INTO THE LIGHT</p><h2 tabindex="-1">往光里走，<span>选一条路。</span></h2><p>左廊看手艺与传承，右廊亲手演一出戏。<br>在这里停下，不必着急选择。</p></div>
      <button id="choose-museum" class="hall-door" data-branch="museum"><small>左廊 · 五柜文化小展</small><strong>江汉皮影馆 <span>↖</span></strong><span>沿着展柜，认识一门手艺与传艺的人</span></button>
      <button id="choose-game" class="hall-door" data-branch="game"><small>右廊 · 三幕小戏</small><strong>皮影戏台 <span>↗</span></strong><span>接过手杆，亲手开演</span></button>
      <p class="hall-instruction">点击门牌 / Tab 选择后按 Enter · 向上滚动返回校园</p>`;
    document.body.append(hall); this.hall = hall;
    const back = document.createElement('button'); back.id = 'return-hall'; back.className = 'route-return';
    back.textContent = '↶ 返回内厅'; back.hidden = true; back.addEventListener('click',()=>this.returnHall()); document.body.append(back);
    const status = document.createElement('span'); status.id = 'route-status'; status.className = 'sr-only'; status.setAttribute('role','status'); document.body.append(status);
    for (const button of hall.querySelectorAll('[data-branch]')) {
      button.addEventListener('click',()=>this.choose(button.dataset.branch));
      for (const event of ['pointerenter','focus']) button.addEventListener(event,()=>{if(this.intro.world)this.intro.world.hover=button.dataset.branch==='museum'?-1:1;this.intro.interactionDirty=true;});
      for (const event of ['pointerleave','blur']) button.addEventListener(event,()=>{if(this.intro.world)this.intro.world.hover=0;this.intro.interactionDirty=true;});
    }
  }
  bind() {
    window.addEventListener('scroll',()=>{this.dirty=true;},{passive:true});
    window.addEventListener('resize',()=>{if(!this.gameActive)this.resizeProgress=this.target;this.dirty=true;},{passive:true});
    document.addEventListener('visibilitychange',()=>{this.lastTime=performance.now();this.dirty=true;});
    this.media.addEventListener('change',()=>{this.intro.resizeDirty=true;});
    window.addEventListener('pointermove',e=>{if(!this.gameActive&&e.pointerType!=='touch')this.intro.setPointer(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);},{passive:true});
    document.addEventListener('pointerleave',()=>this.intro.setPointer(0,0));
    document.querySelectorAll('[data-story-link]').forEach(link=>link.addEventListener('click',e=>{
      e.preventDefault();if(this.gameActive){this.onLeave();this.afterTransition=link.hash==='#home'?0:1;}else this.goTo(link.hash.slice(1));
    }));
    document.querySelectorAll('[data-enter-game]').forEach(button=>button.addEventListener('click',()=>this.requestPlay()));
    $('story-collection').addEventListener('click',this.onCollection);
    window.addEventListener('hashchange',()=>this.goTo(location.hash.slice(1),true));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!this.gameActive&&!document.querySelector('dialog[open]')&&this.state.route!=='public')this.returnHall();
      if((e.target.closest('input,select,textarea,button,a')||this.gameActive||document.querySelector('dialog[open]')))return;
      if(e.key==='Home'){e.preventDefault();this.goPosition(0);}
      if(e.key==='End'){e.preventDefault();this.goPosition(1);}
    });
  }
  setTrack() {
    this.opening.style.height = `${(ROUTE_HEIGHTS[this.state.route]+1)*100}svh`;
    document.body.dataset.route = this.state.route;
  }
  goPosition(progress, instant=false) {
    const p=clamp(progress),top=this.opening.getBoundingClientRect().top+scrollY;
    scrollTo({top:top+p*(this.opening.offsetHeight-innerHeight),behavior:instant||this.media.matches?'instant':'smooth'});
    if(instant||this.media.matches){this.progress=this.target=p;this.state.setProgress(p);}
    this.dirty=true;
  }
  choose(route,{destination,room}={}) {
    if(!this.intro.loaded||!this.intro.world?.prepared){
      $('route-status').className='route-notice';
      $('route-status').textContent=this.intro.fallback?'当前浏览器无法创建三维场景，请启用 WebGL 2 后重新打开。':'场景正在准备，请稍候再选择入口。';
      return false;
    }
    $('route-status').className='sr-only';
    const from=this.state.route;
    if(!this.state.begin(route,performance.now()))return false;
    this.entryPublicProgress=from==='public'?this.progress:null;
    this.intro.world.startTransition(from);
    if(from==='public'&&this.progress<.98)this.intro.world.transitionPose=this.intro.world.hallPose(1);
    if(route==='game')this.intro.world.gameOrigin=from==='museum'?'museum':'public';
    this.returnJourney = route==='public'&&from==='museum'?this.progress:null;
    this.gameReturn = route==='public'&&from==='game'?this.progress:null;
    this.returnViaMuseum=this.gameReturn!==null&&this.intro.world.gameOrigin==='museum';
    this.museumReturnDistance=this.state.progress.museum;
    if(route!=='public')this.state.transition.duration=from==='public'&&this.progress<.98?3500:1850;
    if(route==='public')this.state.transition.duration=1400+Math.round(this.progress*1800)+(this.returnViaMuseum?1800:0);
    this.transitionOrigin=from;
    this.progress=this.target=route==='public'?1:route==='museum'?MUSEUM_ENTRY:.09;
    this.state.setProgress(this.progress);this.resizeProgress=undefined;
    this.setTrack();this.goPosition(this.progress,true);
    this.afterTransition=destination!==undefined?destination:room?MUSEUM_STOPS.find(s=>s.id===room)?.at:undefined;
    history.replaceState(null,'',`#${route==='public'?'hall':route==='museum'?'museum':'gate'}`);
    $('route-status').textContent=route==='public'?'沿原路返回教学楼内厅':route==='museum'?'走进江汉皮影馆':'穿过影幕，前往灯市';
    this.dispatch();return true;
  }
  returnHall() {
    if(this.gameActive){this.onLeave();return;}
    this.pendingPlay=undefined;
    if(this.state.route==='public'){this.goPosition(1);return;}
    this.choose('public');
  }
  goTo(id,instant=false) {
    id= museumRoomId(id);
    if(id==='home'||id==='door'||id==='hall') {
      if(this.state.route!=='public') {
        if(this.choose('public'))this.afterTransition=id==='home'?0:id==='door'?.73:1;
      } else this.goPosition(id==='home'?0:id==='door'?.73:1,instant);
      return;
    }
    const room=MUSEUM_STOPS.find(stop=>stop.id===id);
    if(id==='museum'||room){this.openMuseum(room?.id);return;}
    const legacy={gate:.29,market:.47,play:.84,memories:.97}[id];
    if(legacy===undefined)return;
    const p=(legacy-.21)/.79;
    if(this.state.route!=='game')this.choose('game',{destination:p});else this.goPosition(p,instant);
  }
  openMuseum(room) {
    room=museumRoomId(room);
    const p=MUSEUM_STOPS.find(stop=>stop.id===room)?.at??MUSEUM_ENTRY;
    if(this.gameActive){this.onLeave();this.queuedMuseum=room||'corridor';return;}
    if(this.state.route==='museum')this.goPosition(p);
    else if(this.state.transition)this.queuedMuseum=room||'corridor';
    else this.choose('museum',{room});
  }
  requestPlay(index) {
    if(this.gameActive)return;
    if(this.state.route==='game'&&!this.state.transition&&this.progress>=.77&&this.progress<=.92){this.onEnter(index);return;}
    this.pendingPlay=index??-1;
    if(this.state.route==='game')this.goPosition(.82);
    else if(!this.choose('game',{destination:.82}))this.pendingPlay=undefined;
  }
  canPlay() {return this.state.route==='game'&&!this.state.transition&&this.progress>=.77&&this.progress<=.92;}
  setGameActive(active) {
    this.gameActive=active;this.state.gameActive=active;this.resizeProgress=undefined;
    document.querySelectorAll('[data-reading]').forEach(el=>{el.inert=active;});
    this.stage.setPaused?.('route',!active&&this.state.route!=='game');
    if(active){this.layer(this.play,1);this.layer(this.chapters,1);this.intro.visible=false;this.hall.hidden=true;$('return-hall').hidden=true;}
    this.dirty=true;
  }
  setExploring() {} // Historical optional-room API; the museum now owns a native scroll route.
  returnToPlay() {this.setGameActive(false);this.returnHall();}
  layer(element,opacity) {
    this.layerCache ||= new WeakMap();
    const value=opacity.toFixed(4);
    if(this.layerCache.get(element)===value)return;
    this.layerCache.set(element,value);
    element.style.opacity=value;element.style.visibility=opacity>.002?'visible':'hidden';
    element.inert=opacity<.55;element.setAttribute('aria-hidden',String(opacity<.55));
  }
  dispatch() {
    window.dispatchEvent(new CustomEvent('journey:frame',{detail:{route:this.state.route,progress:this.progress,transition:!!this.state.transition}}));
  }
  syncCopy() {
    const route=this.state.route,p=route==='public'?this.progress*.23:route==='game'?.21+this.progress*.79:-1;
    const key=route+'/'+Math.round(this.progress*100000)+'/'+!!this.state.transition;
    if(this.lastCopyKey===key){if(!this.hall.hidden)this.positionDoors();return;}
    this.lastCopyKey=key;
    // The campus needs a reading scrim; indoor materials already have their own
    // exposure and lighting. Fade it away as the camera enters the doorway.
    this.layer(this.shade,route==='public'?1-smooth(.3,.72,this.progress):route==='museum'?0:smooth(.18,.33,this.progress));
    let current=phases[0];
    for(const item of this.copies) {
      const allowed=route==='game'||route==='public'&&(item.id==='home'||item.id==='door');
      const enter=item.from===0?1:smooth(item.from,item.from+.018,p),leave=1-smooth(item.to-.018,item.to,p);
      this.layer(item.element,allowed?enter*leave:0);
      if(p>=item.from)current=item;
    }
    const opacity=route==='game'?smooth(.59,.645,p):0;
    this.stageOpacity=opacity;this.layer(this.play,opacity);
    const entry=route==='game'?smooth(.82,.835,p)*(1-smooth(.89,.90,p)):0;
    this.layer(this.homeUI,entry);this.layer(this.chapters,entry);this.layer(this.credits,route==='game'?smooth(.965,.99,p):0);
    this.seam.style.opacity='0';this.play.style.setProperty('--stage-end-shade',smooth(.89,1,p).toFixed(3));
    const atHall=route==='public'&&this.progress>.94&&!this.state.transition;
    this.hall.hidden=!atHall;
    if(atHall)this.positionDoors();
    $('return-hall').hidden=route==='public'||!!this.state.transition;
    this.active=route==='museum'?museumStop(this.progress).id:atHall?'hall':current.nav;
    $('journey-place').textContent=route==='museum'?`江汉皮影馆 · ${museumStop(this.progress).label}`:atHall?'教学楼内厅 · 选择去向':current.label;
    $('journey-percent').textContent=String(Math.round(this.progress*100)).padStart(2,'0');
    $('journey-track').style.transform=`scaleX(${this.progress})`;
    $('reading-chapter').textContent=route==='museum'?String(MUSEUM_STOPS.findIndex(s=>s.id===this.active)+1).padStart(2,'0'):atHall?'岔':'序';
    $('reading-fill').style.transform=`scaleY(${this.progress})`;
    document.querySelectorAll('.story-nav a').forEach(link=>{if(link.hash===`#${this.active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    this.onProgress(route==='public'?this.progress*.23:route==='museum'?.25:p);
  }
  positionDoors() {
    if(this.intro.fallback)return;
    for(const [i,id] of ['choose-museum','choose-game'].entries()) {
      const point=this.intro.world.backdrop.doorPositions[i];
      const half=$(id).offsetWidth/2+12;
      $(id).style.left=`${clamp(point[0]*innerWidth,half,innerWidth-half)}px`;
      $(id).style.top=`${point[1]*100}%`;
    }
  }
  frame() {
    requestAnimationFrame(()=>this.frame());
    const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
    if(document.hidden||this.gameActive)return;
    const transition=this.state.transition;
    const fraction=this.state.advance(now,this.media.matches);
    if(transition&&!this.state.transition) {
      this.returnJourney=null;this.gameReturn=null;
      if(this.afterTransition!==undefined){const p=this.afterTransition;this.afterTransition=undefined;this.goPosition(p);}
      if(this.queuedMuseum){const room=this.queuedMuseum;this.queuedMuseum=null;this.openMuseum(room);}
      if(this.state.route==='public'&&this.target>=.98)$('choose-museum').focus({preventScroll:true});
    }
    if(this.resizeProgress!==undefined){const p=this.resizeProgress;this.resizeProgress=undefined;this.goPosition(p,true);}
    if(this.dirty&&!this.state.interaction&&!this.state.transition) {
      const rect=this.opening.getBoundingClientRect();this.target=clamp(-rect.top/Math.max(1,rect.height-innerHeight));this.dirty=false;
    }
    // A short exponential response, independent of input speed; no long catch-up.
    if(!this.state.interaction) this.progress=this.media.matches?this.target:this.progress+(this.target-this.progress)*(1-Math.exp(-20*dt));
    if(Math.abs(this.progress-this.target)<.00002)this.progress=this.target;
    this.state.setProgress(this.progress);
    const route=this.state.route;
    this.intro.visible=route!=='game'||this.progress<.56;
    let renderRoute=route,renderProgress=this.progress,renderTransition=transition?{fraction}:null;
    if(transition&&this.entryPublicProgress!==null&&this.entryPublicProgress<.98&&route!=='public'){
      if(fraction<.6){renderRoute='public';renderProgress=this.entryPublicProgress+(1-this.entryPublicProgress)*smooth(0,.6,fraction);renderTransition=null;}
      else renderTransition={fraction:(fraction-.6)/.4};
    }
    else if(this.returnJourney!==null&&this.returnJourney!==undefined){renderRoute='museum';renderProgress=this.returnJourney*(1-smooth(0,1,fraction));renderTransition=null;}
    else if(this.gameReturn!==null&&this.gameReturn!==undefined){
      const distance=smooth(0,1,fraction)*(this.gameReturn+(this.returnViaMuseum?this.museumReturnDistance:0));
      renderRoute=this.returnViaMuseum&&distance>this.gameReturn?'museum':'game';
      renderProgress=renderRoute==='museum'?this.museumReturnDistance-(distance-this.gameReturn):Math.max(0,this.gameReturn-distance);
      renderTransition=null;this.intro.visible=true;
    }
    this.intro.setRoute(renderRoute,renderProgress,renderTransition);this.intro.update(now/1000,dt,this.media.matches);
    this.syncCopy();
    if(this.gameReturn!==null&&this.gameReturn!==undefined){
      const opacity=renderRoute==='game'?smooth(.59,.645,.21+renderProgress*.79):0;
      this.layer(this.play,opacity);
      this.stage.setStoryFrame(.21+renderProgress*.79,opacity>.001);this.stage.setPaused?.('route',opacity<=.001);
    }
    const gameP=.21+this.progress*.79;
    if(this.gameReturn==null)this.stage.setPaused?.('route',route!=='game');
    if(route==='game')this.stage.setStoryFrame(gameP,this.stageOpacity>.001);
    if(this.pendingPlay!==undefined&&!this.state.transition&&route==='game'&&Math.abs(this.progress-.82)<.002) {
      const index=this.pendingPlay;this.pendingPlay=undefined;this.onEnter(index===-1?undefined:index);
    }
    if(this.viewLabelBackstage!==this.stage.backstage){this.viewLabelBackstage=this.stage.backstage;$('hero-view-toggle').firstChild.textContent=(this.stage.backstage?'回到幕前':'绕到幕后')+' ';}
    this.dispatch();
  }
  diagnostics() {
    return {route:this.state.route,active:this.active,gameActive:this.gameActive,scrollY,progress:this.progress,target:this.target,
      routes:{...this.state.progress},transition:this.state.transition?{...this.state.transition}:null,interaction:this.state.interaction,
      stageOpacity:this.stageOpacity,opening:this.intro.diagnostics(),camera:this.intro.cameraG?.position.toArray()};
  }
}
