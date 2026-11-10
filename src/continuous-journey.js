import {CabinetVisit} from './cabinet-visit.js';
import {PassageScene} from './passage-scene.js';
import {RouteState, ROUTE_HEIGHTS, MUSEUM_ENTRY, MUSEUM_STOPS, museumStop, clamp, smooth} from './route-state.js';
import {museumRoomId} from './museum-content.js';
import {MuseumEntrance,MUSEUM_ARRIVAL,MUSEUM_ENTRANCE_MS} from './museum-entrance.js';
import {StageEntrance,STAGE_ENTRANCE_MS,entranceEase,stageTravelPhase} from './stage-entrance.js';

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
  constructor({stage,onEnter,onLeave,onCollection,onStagePrepare,onStageCancel,onProgress=()=>{}}) {
    Object.assign(this,{stage,onEnter,onLeave,onCollection,onStagePrepare,onStageCancel,onProgress});
    this.visit=new CabinetVisit();this.state = new RouteState(); this.opening = $('journey-opening'); this.play = $('play');
    this.intro = new PassageScene($('opening-canvas'));
    this.progress = 0; this.target = 0; this.gameActive = false; this.active = 'home';
    this.openingPushStart=Infinity;this.openingPushDone=!!location.hash&&location.hash!=='#home';
    if(this.openingPushDone)document.body.classList.add('opening-intro-finished');
    const openingPhoto=new Image();openingPhoto.src=new URL('../assets/passage/luojia-dusk.png',import.meta.url).href;
    openingPhoto.decode().catch(()=>{}).then(()=>{
      this.openingPushStart=performance.now();document.body.classList.add('opening-intro-running');
    });
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
      button.addEventListener('click',()=>button.dataset.branch==='game'?this.enterStage():this.choose(button.dataset.branch));
      for (const event of ['pointerenter','focus']) button.addEventListener(event,()=>{if(this.intro.world)this.intro.world.hover=button.dataset.branch==='museum'?-1:1;this.intro.interactionDirty=true;});
      for (const event of ['pointerleave','blur']) button.addEventListener(event,()=>{if(this.intro.world)this.intro.world.hover=0;this.intro.interactionDirty=true;});
    }
  }
  bind() {
    window.addEventListener('scroll',()=>{this.dirty=true;},{passive:true});
    for(const type of ['wheel','pointerdown','touchstart'])window.addEventListener(type,()=>this.visit.interrupt(),{passive:true});
    for(const type of ['wheel','touchmove'])window.addEventListener(type,event=>{
      if(this.museumEntrance||this.stageEntrance)event.preventDefault();
    },{passive:false});
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
      if((this.museumEntrance||this.stageEntrance)&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)){e.preventDefault();return;}
      if(['ArrowUp','ArrowDown','PageUp','PageDown',' '].includes(e.key))this.visit.interrupt();
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
    if((this.museumEntrance||this.stageEntrance)&&!instant)return;
    const p=clamp(progress),top=this.opening.getBoundingClientRect().top+scrollY;
    if(this.state.route==='museum'&&!this.state.transition)this.visit.seek(p);
    scrollTo({top:top+p*(this.opening.offsetHeight-innerHeight),behavior:instant||this.media.matches?'instant':'smooth'});
    if(instant||this.media.matches){this.progress=this.target=p;this.state.setProgress(p);}
    this.dirty=true;
  }
  fadeReturn(options){
    if(this.returning)return false;
    this.returning=true;this.pendingPlay=undefined;
    const veil=document.createElement('div');veil.className='hall-return-veil';veil.setAttribute('aria-label','返回大厅');document.body.append(veil);
    const delay=this.media.matches?0:240;
    requestAnimationFrame(()=>veil.classList.add('opaque'));
    setTimeout(()=>{
      options?.beforeCommit?.();
      if(this.stageEntrance){this.stage.cancelEntrance();this.onStageCancel?.();}
      this.stageEntrance=null;this.directStage=false;this.stageEntryFraction=0;
      document.body.classList.remove('stage-direct','is-entering-stage');document.body.style.removeProperty('--stage-entry-ui');
      document.querySelector('.site-header').inert=false;
      this.state.transition=null;this.state.interaction=null;this.visit.reset();
      this.choose('public',{...options,fadeCommit:true});
      this.state.transition=null;this.returnJourney=this.gameReturn=null;
      this.intro.setRoute('public',1,null);this.dirty=true;
      setTimeout(()=>{veil.classList.remove('opaque');setTimeout(()=>{veil.remove();this.returning=false;},delay);},80);
    },delay);
    return true;
  }
  choose(route,{destination,room,fadeCommit=false,directStage=false,level}={}) {
    if(route==='public'&&!fadeCommit)return this.fadeReturn({destination,room});
    if(!this.intro.loaded||!this.intro.world?.prepared){
      $('route-status').className='route-notice';
      $('route-status').textContent=this.intro.fallback?'当前浏览器无法创建三维场景，请启用 WebGL 2 后重新打开。':'场景正在准备，请稍候再选择入口。';
      return false;
    }
    $('route-status').className='sr-only';
    const from=this.state.route,now=performance.now();
    if(!this.state.begin(route,now))return false;
    this.museumEntrance=null;this.entranceFraction=0;
    this.entryPublicProgress=from==='public'?this.progress:null;
    this.intro.world.startTransition(from);
    if(from==='public'&&this.progress<.98)this.intro.world.transitionPose=this.intro.world.hallPose(1);
    if(route==='game')this.intro.world.gameOrigin=from==='museum'?'museum':'public';
    this.returnJourney = null;
    this.gameReturn = null;
    this.returnViaMuseum=this.gameReturn!==null&&this.intro.world.gameOrigin==='museum';
    this.museumReturnDistance=this.state.progress.museum;
    if(route!=='public')this.state.transition.duration=from==='public'&&this.progress<.98?3500:1850;
    if(route==='public')this.state.transition.duration=0;
    this.visit.reset();
    this.transitionOrigin=from;
    this.progress=this.target=route==='public'?1:route==='museum'?0:.09;
    if(route==='game'&&directStage){
      this.directStage=true;this.stageEntryFraction=0;this.entryPublicProgress=null;this.pendingPlay=undefined;
      this.stageLevel=this.onStagePrepare?.(level)??level;
      document.body.classList.add('stage-direct','is-entering-stage');
      document.querySelector('.site-header').inert=true;
      this.stage.beginEntrance();
      this.stageEntrance=new StageEntrance(now);this.state.transition.duration=STAGE_ENTRANCE_MS;
      this.progress=this.target=0;this.hall.inert=true;
    }
    if(route==='museum'){
      this.entryPublicProgress=null;
      if(from==='public'){
        this.museumEntrance=new MuseumEntrance(now);this.state.transition.duration=MUSEUM_ENTRANCE_MS;
        this.hall.inert=true;this.hall.dataset.entering='true';
      }else{this.state.transition=null;this.progress=this.target=MUSEUM_ARRIVAL;}
    }
    this.state.setProgress(this.progress);this.resizeProgress=undefined;
    this.setTrack();this.goPosition(this.progress,true);
    this.afterTransition=destination!==undefined?destination:room?MUSEUM_STOPS.find(s=>s.id===room)?.at:undefined;
    if(!this.state.transition&&this.afterTransition!==undefined){const p=this.afterTransition;this.afterTransition=undefined;this.goPosition(p);}
    history.replaceState(null,'',`#${route==='public'?'hall':route==='museum'?'museum':directStage?'play':'gate'}`);
    $('route-status').textContent=route==='public'?'返回教学楼内厅':route==='museum'?'走进江汉皮影馆':directStage?'正在走入皮影戏台，抵达后即可操作。':'穿过影幕，前往灯市';
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
    // A museum shortcut never plays the campus entrance on the visitor's behalf.
    if(this.state.route==='public'&&this.progress<.94){
      return;
    }
    room=museumRoomId(room);
    const p=MUSEUM_STOPS.find(stop=>stop.id===room)?.at??MUSEUM_ENTRY;
    if(this.gameActive){this.onLeave();this.queuedMuseum=room||'corridor';return;}
    if(this.state.route==='museum'){this.goPosition(p);}
    else if(this.state.transition)this.queuedMuseum=room||'corridor';
    else this.choose('museum',{room});
  }
  requestPlay(index) {
    if(this.gameActive||this.stageEntrance)return;
    if(this.state.route==='public'&&this.progress>=.94){this.enterStage(index);return;}
    if(this.state.route==='game'&&!this.state.transition&&this.progress>=.77&&this.progress<=.92){this.onEnter(index);return;}
    this.pendingPlay=index??-1;
    if(this.state.route==='game')this.goPosition(.82);
    else if(!this.choose('game',{destination:.82}))this.pendingPlay=undefined;
  }
  enterStage(level){
    if(this.stageEntrance||this.state.transition||this.gameActive||this.returning)return false;
    if(this.stage.fallback||!this.stage.assetsReady){
      $('route-status').className='route-notice';$('route-status').textContent=this.stage.fallback?'当前浏览器无法创建三维戏台。':'戏台正在准备，请稍候再选择入口。';return false;
    }
    return this.choose('game',{directStage:true,level});
  }
  canPlay() {return this.state.route==='game'&&!this.state.transition&&this.progress>=.77&&this.progress<=.92;}
  setGameActive(active) {
    this.gameActive=active;this.state.gameActive=active;this.resizeProgress=undefined;
    if(!active&&!this.stageEntrance){
      this.directStage=false;document.body.classList.remove('stage-direct','is-entering-stage');
      document.querySelector('.site-header').inert=false;
    }
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
    const entrance=!!this.museumEntrance;
    if(this.intro.inspect){
      const phase=entrance?(this.entranceFraction<.33?'approach':this.entranceFraction<.5?'threshold':this.entranceFraction<.65?'crossing':'inside'):this.state.route==='museum'?'complete':'hall';
      document.documentElement.dataset.museumEntry=phase;
      document.documentElement.dataset.stageEntry=this.stageEntrance?stageTravelPhase(this.progress):this.directStage?'complete':'hall';
      if(this.directStage){
        const d=this.stage.diagnostics();
        document.documentElement.dataset.stageEntryRender=JSON.stringify({fraction:this.stageEntryFraction,progress:this.progress,phase:stageTravelPhase(this.progress),active:!!this.stageEntrance,playing:this.gameActive,
          camera:d.cameraPosition,angle:d.cameraAngle,pixelRatio:d.pixelRatio,median:d.frameMedianMs,p95:d.frameP95Ms,frames:d.frames,paused:d.paused,post:d.post});
      }
    }
    window.dispatchEvent(new CustomEvent('journey:frame',{detail:{route:this.state.route,progress:this.progress,transition:!!this.state.transition,entrance,viewing:this.visit.aligned?.id||null}}));
  }
  syncCopy() {
    const route=this.state.route,p=route==='public'?this.progress*.23:route==='game'?.21+this.progress*.79:-1;
    const key=route+'/'+Math.round(this.progress*100000)+'/'+!!this.state.transition+'/'+Math.round(this.entranceFraction*1000)+'/'+Math.round((this.stageEntryFraction||0)*1000)+'/'+!!this.stage.entryReady;
    if(this.lastCopyKey===key){if(!this.hall.hidden)this.positionDoors();return;}
    this.lastCopyKey=key;
    // The campus needs a reading scrim; indoor materials already have their own
    // exposure and lighting. Fade it away as the camera enters the doorway.
    this.layer(this.shade,route==='public'?1-smooth(.3,.72,this.progress):route==='museum'?0:smooth(.18,.33,this.progress));
    let current=phases[0];
    for(const item of this.copies) {
      const allowed=route==='game'||route==='public'&&(item.id==='home'||item.id==='door');
      const enter=item.from===0?1:smooth(item.from,item.from+.018,p),leave=1-smooth(item.to-.018,item.to,p);
      this.layer(item.element,allowed?enter*leave*(this.stageEntrance?smooth(.018,.035,this.progress):1):0);
      if(p>=item.from)current=item;
    }
    const opacity=route==='game'?smooth(.59,.645,p):0;
    this.stageOpacity=opacity;this.layer(this.play,opacity);
    const entry=route==='game'&&!this.directStage?smooth(.82,.835,p)*(1-smooth(.89,.90,p)):0;
    this.layer(this.homeUI,entry);this.layer(this.chapters,entry);this.layer(this.credits,route==='game'?smooth(.965,.99,p):0);
    this.seam.style.opacity='0';this.play.style.setProperty('--stage-end-shade',this.directStage?'0':smooth(.89,1,p).toFixed(3));
    const atHall=route==='public'&&this.progress>.94&&!this.state.transition;
    const hallOpacity=atHall?1:this.museumEntrance?1-smooth(0,.18,this.entranceFraction):this.stageEntrance?1-entranceEase(0,.018,this.progress):0;
    this.hall.dataset.entering=String(!!(this.museumEntrance||this.stageEntrance));
    this.hall.hidden=hallOpacity<=.002;this.layer(this.hall,hallOpacity);
    this.hall.inert=!!(this.museumEntrance||this.stageEntrance)||hallOpacity<.55;
    if(!this.hall.hidden)this.positionDoors();
    const returnOpacity=route==='public'||this.stageEntrance?0:this.museumEntrance?smooth(.09,.12,this.progress):this.state.transition?0:1;
    $('return-hall').hidden=returnOpacity<=.002;this.layer($('return-hall'),returnOpacity);
    $('return-hall').inert=!!this.museumEntrance||returnOpacity<.55;
    this.active=route==='museum'?museumStop(this.progress).id:atHall?'hall':current.nav;
    $('journey-place').textContent=this.directStage?'皮影戏台 · 循光入戏':route==='museum'?`江汉皮影馆 · ${museumStop(this.progress).label}`:atHall?'教学楼内厅 · 选择去向':current.label;
    $('journey-percent').textContent=String(Math.round(this.progress*100)).padStart(2,'0');
    $('journey-track').style.transform=`scaleX(${this.progress})`;
    $('reading-chapter').textContent=route==='museum'?String(MUSEUM_STOPS.findIndex(s=>s.id===this.active)+1).padStart(2,'0'):atHall?'岔':'序';
    $('reading-fill').style.transform=`scaleY(${this.progress})`;
    document.querySelectorAll('.story-nav a').forEach(link=>{if(link.hash===`#${this.active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    this.onProgress(route==='public'?this.progress*.23:route==='museum'?.25:p);
  }
  positionDoors() {
    if(this.intro.fallback||!this.intro.world?.backdrop?.doorPositions)return;
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
    let entryStep=null,fraction;
    if(this.stageEntrance){
      entryStep=this.stageEntrance.advance(now,this.media.matches,this.stage.entryReady);fraction=entryStep.fraction;this.stageEntryFraction=fraction;
      this.progress=this.target=entryStep.progress;
      const top=this.opening.getBoundingClientRect().top+scrollY;
      scrollTo({top:top+this.progress*(this.opening.offsetHeight-innerHeight),behavior:'instant'});
      this.dirty=false;this.resizeProgress=undefined;
      document.body.style.setProperty('--stage-entry-ui',(1-entranceEase(0,.12,fraction)).toFixed(4));
      if(entryStep.done){this.stageEntrance=null;this.state.transition=null;}
    }else if(this.museumEntrance){
      entryStep=this.museumEntrance.advance(now,this.media.matches);fraction=entryStep.fraction;this.entranceFraction=fraction;
      this.progress=this.target=entryStep.progress;
      const top=this.opening.getBoundingClientRect().top+scrollY;
      scrollTo({top:top+this.progress*(this.opening.offsetHeight-innerHeight),behavior:'instant'});
      this.dirty=false;this.resizeProgress=undefined;
      if(entryStep.done){
        this.museumEntrance=null;this.state.transition=null;this.visit.seek(MUSEUM_ARRIVAL);
        $('route-status').textContent='已进入江汉皮影馆，可滚动参观或选择展柜。';
      }
    }else fraction=this.state.advance(now,this.media.matches);
    if(transition&&!this.state.transition) {
      this.returnJourney=null;this.gameReturn=null;
      if(this.afterTransition!==undefined){const p=this.afterTransition;this.afterTransition=undefined;this.goPosition(p);}
      if(this.queuedMuseum){const room=this.queuedMuseum;this.queuedMuseum=null;this.openMuseum(room);}
      if(this.state.route==='public'&&this.target>=.98)$('choose-museum').focus({preventScroll:true});
    }
    if(!entryStep&&this.resizeProgress!==undefined){const p=this.resizeProgress;this.resizeProgress=undefined;this.goPosition(p,true);}
    if(!entryStep&&this.dirty&&!this.state.interaction&&!this.state.transition) {
      const rect=this.opening.getBoundingClientRect();this.target=clamp(-rect.top/Math.max(1,rect.height-innerHeight));this.dirty=false;
    }
    if(!this.openingPushDone&&this.state.route==='public'){
      const elapsed=now-this.openingPushStart;
      if(elapsed<2500||!this.intro.loaded){
        this.target=0;if(scrollY>2)scrollTo({top:0,behavior:'instant'});
      }else{this.openingPushDone=true;document.body.classList.add('opening-intro-finished');}
    }
    if(!entryStep&&this.state.route==='museum'&&!this.state.transition){
      const limited=this.visit.constrain(this.progress,this.target);
      if(limited!==this.target){this.target=limited;const top=this.opening.getBoundingClientRect().top+scrollY;scrollTo({top:top+limited*(this.opening.offsetHeight-innerHeight),behavior:'instant'});}
    }
    // A short exponential response, independent of input speed; no long catch-up.
    if(!entryStep&&!this.state.interaction) this.progress=this.media.matches?this.target:this.progress+(this.target-this.progress)*(1-Math.exp(-20*dt));
    if(Math.abs(this.progress-this.target)<.00002)this.progress=this.target;
    this.state.setProgress(this.progress);
    const route=this.state.route;
    this.intro.visible=route!=='game'||this.progress<.56;
    let renderRoute=route,renderProgress=this.progress,renderTransition=transition?{fraction,...(this.directStage?{autoplay:true,routeProgress:this.progress}:{})}:null;
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
    if(this.gameReturn==null)this.stage.setPaused?.('route',this.stageEntrance?this.progress<.46&&this.stage.entryReady:route!=='game');
    if(route==='game')this.stage.setStoryFrame(gameP,this.stageOpacity>.001);
    if(this.pendingPlay!==undefined&&!this.state.transition&&route==='game'&&Math.abs(this.progress-.82)<.002) {
      const index=this.pendingPlay;this.pendingPlay=undefined;this.onEnter(index===-1?undefined:index);
    }
    if(entryStep?.done&&this.directStage){
      this.stage.finishEntrance();document.body.classList.remove('is-entering-stage');document.body.style.removeProperty('--stage-entry-ui');
      document.querySelector('.site-header').inert=false;
      $('route-status').textContent='已进入皮影戏台，可直接拖动灯与影人。';
      this.onEnter(this.stageLevel,{fromEntrance:true});
    }
    if(this.viewLabelBackstage!==this.stage.backstage){this.viewLabelBackstage=this.stage.backstage;$('hero-view-toggle').firstChild.textContent=(this.stage.backstage?'回到幕前':'绕到幕后')+' ';}
    this.dispatch();
    if(entryStep?.done&&!this.directStage)$('museum-start')?.focus({preventScroll:true});
  }
  diagnostics() {
    return {route:this.state.route,active:this.active,gameActive:this.gameActive,scrollY,progress:this.progress,target:this.target,
      routes:{...this.state.progress},transition:this.state.transition?{...this.state.transition}:null,interaction:this.state.interaction,
      stageOpacity:this.stageOpacity,opening:this.intro.diagnostics(),camera:this.intro.cameraG?.position.toArray()};
  }
}
