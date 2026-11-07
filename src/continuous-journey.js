import {PassageScene} from './passage-scene.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const phases=[
  {id:'home',from:0,to:.115,label:'此刻 · 珞珈',nav:'home'},
  {id:'door',from:.115,to:.21,label:'循光 · 走入门廊',nav:'home'},
  {id:'gate',from:.215,to:.32,label:'室内 · 一张影幕',nav:'gate'},
  {id:'crossing',from:.325,to:.405,label:'幕间 · 穿过一线光',nav:'gate'},
  {id:'market',from:.405,to:.535,label:'灯火 · 江汉人间',nav:'market'},
  {id:'arrival',from:.54,to:.615,label:'抵达 · 戏台已近',nav:'market'},
  {id:'stage',from:.635,to:.725,label:'入戏 · 来到幕前',nav:'play'},
  {id:'backstage',from:.73,to:.815,label:'幕后 · 光的来处',nav:'play'},
  {id:'ready',from:.82,to:.90,label:'开场 · 接过手杆',nav:'play'},
  {id:'memories',from:.905,to:1.1,label:'留影 · 这一幕属于你',nav:'memories'}
];

export class Journey {
  constructor({stage,onEnter,onLeave,onCollection,onProgress=()=>{}}){
    this.stage=stage;this.onProgress=onProgress;
    this.opening=document.getElementById('journey-opening');this.play=document.getElementById('play');
    this.intro=new PassageScene(document.getElementById('opening-canvas'));
    this.progress=0;this.target=0;this.active='home';this.gameActive=false;
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.dirty=true;this.lastTime=performance.now();this.lastPose=-1;
    this.copies=phases.map(phase=>({...phase,element:document.querySelector(`[data-passage-copy="${phase.id}"]`)}));
    this.homeUI=document.getElementById('home-stage-ui');this.chapters=document.querySelector('#play .site-footer');
    this.credits=document.querySelector('.site-credits');this.seam=document.getElementById('scene-seam');
    document.body.classList.add('has-journey','has-passage','has-continuous','in-passage');
    window.addEventListener('scroll',()=>{this.dirty=true;},{passive:true});
    window.addEventListener('resize',()=>{if(!this.gameActive)this.resizeProgress=this.target;this.dirty=true;this.lastPose=-1;},{passive:true});
    document.addEventListener('visibilitychange',()=>{this.lastTime=performance.now();this.dirty=true;});
    window.addEventListener('pointermove',e=>{if(!this.gameActive&&!this.exploring&&e.pointerType!=='touch')this.intro.setPointer(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);},{passive:true});
    document.addEventListener('pointerleave',()=>this.intro.setPointer(0,0));
    document.querySelectorAll('[data-story-link]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();if(this.gameActive)onLeave();this.goTo(link.hash.slice(1));}));
    document.querySelectorAll('[data-enter-game]').forEach(button=>button.addEventListener('click',onEnter));
    document.getElementById('story-collection').addEventListener('click',onCollection);
    const hash=location.hash.slice(1);if(hash){requestAnimationFrame(()=>this.goTo(hash,true));window.addEventListener('load',()=>this.goTo(hash,true),{once:true});}
    window.addEventListener('hashchange',()=>this.goTo(location.hash.slice(1),true));
    this.frame();
  }
  goTo(id,instant=false){
    const target=document.getElementById(id);if(!target)return;
    const stop=Number(target.dataset.stop||0),behavior=instant||this.media.matches?'instant':'smooth';
    const top=this.opening.getBoundingClientRect().top+scrollY;
    scrollTo({top:top+stop*(this.opening.offsetHeight-innerHeight),behavior});
    if(instant||this.media.matches){this.progress=this.target=stop;this.lastPose=-1;}
    history.replaceState(null,'',`#${id}`);this.dirty=true;
  }
  setGameActive(active){
    this.gameActive=active;this.resizeProgress=undefined;document.querySelectorAll('[data-reading]').forEach(el=>{el.inert=active;});
    if(active){this.layer(this.play,1);this.layer(this.chapters,1);this.intro.visible=false;}
    this.lastPose=-1;this.dirty=true;
  }
  // Exploration lives above the route. Keep its exact camera pose until returning.
  setExploring(active){this.exploring=active;this.stage.paused=active;if(!active){this.lastTime=performance.now();this.dirty=true;}}
  returnToPlay(){this.setGameActive(false);this.goTo('play',true);this.syncCopy();}
  measure(){const r=this.opening.getBoundingClientRect();this.target=clamp(-r.top/Math.max(1,r.height-innerHeight));this.dirty=false;}
  layer(element,opacity){
    element.style.opacity=opacity.toFixed(4);element.style.visibility=opacity>.002?'visible':'hidden';
    element.inert=opacity<.55;element.setAttribute('aria-hidden',String(opacity<.55));
  }
  syncCopy(){
    const p=this.progress;if(p===this.lastPose)return;this.lastPose=p;
    this.onProgress(clamp(p/.6));
    let current=this.copies[0],highest=0;
    for(const item of this.copies){
      const enter=item.from===0?1:smooth(item.from,item.from+.018,p),leave=1-smooth(item.to-.018,item.to,p),opacity=enter*leave;
      this.layer(item.element,opacity);
      item.element.style.transform=`translate3d(0,${((1-enter)*32-(1-leave)*28).toFixed(2)}px,0)`;
      if(p>=item.from&&highest===0)current=item;
      if(opacity>highest){highest=opacity;current=item;}
    }
    const stageOpacity=smooth(.59,.645,p),entryOpacity=smooth(.82,.835,p)*(1-smooth(.88,.9,p));
    this.stageOpacity=stageOpacity;this.layer(this.play,stageOpacity);
    this.layer(this.homeUI,entryOpacity);this.layer(this.chapters,entryOpacity);
    this.layer(this.credits,smooth(.965,.99,p));
    this.seam.style.opacity=(Math.sin(smooth(.59,.645,p)*Math.PI)*.35).toFixed(3);
    this.play.style.setProperty('--stage-end-shade',smooth(.89,1,p).toFixed(3));
    document.body.classList.toggle('at-journey-end',p>.965);
    this.active=current.nav;document.getElementById('journey-place').textContent=current.label;
    document.getElementById('journey-percent').textContent=String(Math.round(p*100)).padStart(2,'0');
    document.getElementById('journey-track').style.transform=`scaleX(${p})`;
    document.querySelectorAll('.story-nav a').forEach(link=>{if(link.hash===`#${this.active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    document.getElementById('reading-chapter').textContent=this.active==='memories'?'终':this.active==='play'?'03':this.active==='market'?'02':this.active==='gate'?'01':'序';
    document.getElementById('reading-fill').style.transform=`scaleY(${p})`;
  }
  frame(){
    requestAnimationFrame(()=>this.frame());const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
    if(document.hidden||this.gameActive||this.exploring)return;
    if(this.resizeProgress!==undefined){
      const p=this.resizeProgress;this.resizeProgress=undefined;
      const top=this.opening.getBoundingClientRect().top+scrollY;
      scrollTo({top:top+p*(this.opening.offsetHeight-innerHeight),behavior:'instant'});
      this.progress=this.target=p;this.dirty=true;
    }
    if(this.dirty)this.measure();
    this.progress=this.media.matches?this.target:this.progress+(this.target-this.progress)*(1-Math.exp(-9*dt));
    if(Math.abs(this.progress-this.target)<.00001)this.progress=this.target;
    this.intro.visible=this.progress<.646;this.intro.setProgress(this.progress);this.intro.update(now/1000,dt,this.media.matches);
    this.syncCopy();this.stage.setStoryFrame(this.progress,this.stageOpacity>.001);
    if(this.viewLabelBackstage!==this.stage.backstage){this.viewLabelBackstage=this.stage.backstage;document.getElementById('hero-view-toggle').firstChild.textContent=(this.stage.backstage?'回到幕前':'绕到幕后')+' ';}
  }
  diagnostics(){return{active:this.active,gameActive:this.gameActive,scrollY,progress:this.progress,target:this.target,stageOpacity:this.stageOpacity,opening:this.intro.diagnostics()};}
}
