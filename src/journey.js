import {PassageScene} from './passage-scene.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const phases=[
  {id:'home',from:0,to:.17,label:'此刻 · 珞珈',nav:'home'},
  {id:'gate',from:.15,to:.36,label:'门外 · 一束光',nav:'gate'},
  {id:'crossing',from:.38,to:.58,label:'幕间 · 穿过一线光',nav:'gate'},
  {id:'market',from:.59,to:.82,label:'灯火 · 江汉人间',nav:'market'},
  {id:'arrival',from:.84,to:1.1,label:'抵达 · 戏台已近',nav:'market'}
];

export class Journey {
  constructor({onEnter,onLeave,onCollection,onProgress=()=>{}}){
    this.onProgress=onProgress;
    this.opening=document.getElementById('journey-opening');this.play=document.getElementById('play');
    this.intro=new PassageScene(document.getElementById('opening-canvas'));this.active='home';this.gameActive=false;
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.dirty=true;this.lastTime=performance.now();this.lastPose=-1;
    this.copies=phases.map(phase=>({...phase,element:document.querySelector(`[data-passage-copy="${phase.id}"]`)}));
    document.body.classList.add('has-journey','has-passage');
    const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('in-view');observer.unobserve(e.target);}},{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
    window.addEventListener('scroll',()=>{this.dirty=true;},{passive:true});
    window.addEventListener('resize',()=>{this.dirty=true;},{passive:true});
    document.addEventListener('visibilitychange',()=>{this.lastTime=performance.now();this.dirty=true;});
    window.addEventListener('pointermove',e=>{if(!this.gameActive&&this.intro.visible&&e.pointerType!=='touch')this.intro.setPointer(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);},{passive:true});
    document.addEventListener('pointerleave',()=>this.intro.setPointer(0,0));
    document.querySelectorAll('[data-story-link]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();if(this.gameActive)onLeave();this.goTo(link.hash.slice(1));}));
    document.querySelectorAll('[data-enter-game]').forEach(button=>button.addEventListener('click',onEnter));
    document.getElementById('story-collection').addEventListener('click',onCollection);
    this.frame();
  }
  goTo(id,instant=false){
    const target=document.getElementById(id);if(!target)return;
    const stop=target.dataset.stop;
    const behavior=instant||this.media.matches?'instant':'smooth';
    if(stop!==undefined){const top=this.opening.getBoundingClientRect().top+scrollY;scrollTo({top:top+Number(stop)*(this.opening.offsetHeight-innerHeight),behavior});}
    else target.scrollIntoView({behavior,block:'start'});
    history.replaceState(null,'',`#${id}`);this.dirty=true;
  }
  setGameActive(active){this.gameActive=active;document.querySelectorAll('[data-reading]').forEach(el=>{el.inert=active;});this.dirty=true;}
  returnToPlay(){this.setGameActive(false);this.goTo('play',true);}
  measure(){
    const r=this.opening.getBoundingClientRect(),vh=innerHeight;
    this.intro.visible=!this.gameActive&&r.bottom>0&&r.top<vh;
    this.intro.setProgress(clamp(-r.top/Math.max(1,r.height-vh)));
    const inPassage=r.bottom>vh*.5;
    if(this.inPassage!==inPassage){this.lastPose=-1;this.inPassage=inPassage;}
    document.body.classList.toggle('in-passage',inPassage&&!this.gameActive);
    if(!inPassage)this.active='play';
    this.dirty=false;
  }
  syncCopy(){
    const p=this.intro.progress;
    if(p===this.lastPose)return;this.lastPose=p;this.onProgress(p);
    let current=this.copies[0],highest=0;
    for(const item of this.copies){
      const entry=item.from===0?1:smooth(item.from,item.from+.035,p),exit=1-smooth(item.to-.035,item.to,p),opacity=entry*exit;
      item.element.style.opacity=opacity.toFixed(3);item.element.style.transform=`translate3d(0,${((1-entry)*22-(1-exit)*15).toFixed(2)}px,0)`;
      item.element.style.visibility=opacity>.005?'visible':'hidden';item.element.inert=opacity<.55;
      item.element.setAttribute('aria-hidden',String(opacity<.55));
      if(opacity>highest){highest=opacity;current=item;}
    }
    this.active=this.inPassage?current.nav:'play';
    document.getElementById('journey-place').textContent=current.label;
    document.getElementById('journey-percent').textContent=String(Math.round(p*100)).padStart(2,'0');
    document.getElementById('journey-track').style.transform=`scaleX(${p})`;
    document.querySelectorAll('.story-nav a').forEach(link=>{if(link.hash===`#${this.active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    document.getElementById('reading-chapter').textContent=this.active==='play'?'终':this.active==='market'?'02':this.active==='gate'?'01':'序';
    document.getElementById('reading-fill').style.transform=`scaleY(${p})`;
  }
  frame(){
    requestAnimationFrame(()=>this.frame());const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
    if(document.hidden||this.gameActive)return;
    if(this.dirty)this.measure();
    this.intro.update(now/1000,dt,this.media.matches);
    if(this.intro.fallback)this.intro.progress=this.intro.targetProgress;
    this.syncCopy();
  }
  diagnostics(){return{active:this.active,gameActive:this.gameActive,scrollY,opening:this.intro.diagnostics()};}
}
