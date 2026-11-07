import {OpeningScene,LightStudy} from './journey-scene.js';

export class Journey {
  constructor({onEnter,onLeave,onCollection}){
    this.opening=document.getElementById('journey-opening');this.play=document.getElementById('play');
    this.sections=[...document.querySelectorAll('[data-story-section]')];this.active='home';this.gameActive=false;
    this.intro=new OpeningScene(document.getElementById('opening-canvas'));
    this.study=new LightStudy(document.getElementById('light-study'),document.getElementById('study-light'),document.getElementById('study-hint'));
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.dirty=true;this.lastTime=performance.now();
    document.body.classList.add('has-journey');
    const revealObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target);}
    },{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
    this.revealObserver=revealObserver;
    window.addEventListener('scroll',()=>{this.dirty=true;},{passive:true});
    window.addEventListener('resize',()=>{this.dirty=true;},{passive:true});
    document.addEventListener('visibilitychange',()=>{this.lastTime=performance.now();this.dirty=true;});
    window.addEventListener('pointermove',e=>{
      if(!this.gameActive&&this.intro.visible)this.intro.setPointer(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1);
    },{passive:true});
    document.addEventListener('pointerleave',()=>this.intro.setPointer(0,0));
    document.querySelectorAll('[data-story-link]').forEach(link=>link.addEventListener('click',e=>{
      e.preventDefault();if(this.gameActive)onLeave();this.goTo(link.hash.slice(1));
    }));
    document.querySelectorAll('[data-enter-game]').forEach(button=>button.addEventListener('click',()=>onEnter()));
    document.getElementById('story-collection').addEventListener('click',onCollection);
    document.querySelectorAll('[data-craft]').forEach(button=>{
      const choose=()=>this.selectCraft(Number(button.dataset.craft));
      button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')choose();});button.addEventListener('click',choose);button.addEventListener('focus',choose);
    });
    document.querySelectorAll('.magnetic').forEach(el=>{
      el.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||this.media.matches)return;const r=el.getBoundingClientRect();el.style.translate=`${(e.clientX-r.left-r.width/2)*.08}px ${(e.clientY-r.top-r.height/2)*.15}px`;});
      el.addEventListener('pointerleave',()=>{el.style.translate='0 0';});
    });
    this.frame();
  }
  selectCraft(index){
    this.intro.feature=index;
    document.querySelectorAll('[data-craft]').forEach(button=>{const active=Number(button.dataset.craft)===index;button.classList.toggle('active',active);button.setAttribute('aria-expanded',String(active));});
  }
  goTo(id,instant=false){
    const target=document.getElementById(id);if(!target)return;
    target.scrollIntoView({behavior:instant||this.media.matches?'instant':'smooth',block:'start'});
    history.replaceState(null,'',`#${id}`);this.dirty=true;
  }
  setGameActive(active){
    this.gameActive=active;
    document.querySelectorAll('[data-reading]').forEach(el=>{el.inert=active;});
    this.dirty=true;
  }
  returnToPlay(){this.setGameActive(false);this.goTo('play',true);}
  measure(){
    const r=this.opening.getBoundingClientRect(),vh=innerHeight;
    this.intro.visible=!this.gameActive&&r.bottom>0&&r.top<vh;
    this.intro.setProgress(-r.top/Math.max(1,r.height-vh));
    const studyRect=document.getElementById('study-window').getBoundingClientRect();
    this.study.visible=!this.gameActive&&studyRect.bottom>0&&studyRect.top<vh;
    let active=this.sections[0];
    for(const section of this.sections){const rect=section.getBoundingClientRect();if(rect.top<=vh*.5)active=section;}
    this.active=active.dataset.storySection;
    document.querySelectorAll('.story-nav a').forEach(link=>{if(link.hash===`#${this.active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    document.getElementById('reading-chapter').textContent={home:'序',craft:'01',light:'02',play:'03'}[this.active];
    const progress=Math.max(0,Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
    document.getElementById('reading-fill').style.transform=`scaleY(${progress})`;
    const pose=smoothProgress(this.intro.progress);
    const orbit=document.querySelector('.opening-orbit');
    orbit.style.left=`${innerWidth<=700?71-21*pose:70-42*pose}%`;
    orbit.style.top=`${innerWidth<=700?65-35*pose:52}%`;
    document.body.classList.toggle('has-scrolled',scrollY>30);this.dirty=false;
  }
  frame(){
    requestAnimationFrame(()=>this.frame());const now=performance.now(),dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
    if(document.hidden||this.gameActive)return;if(this.dirty)this.measure();
    this.intro.update(now/1000,dt,this.media.matches);this.study.update(dt,this.media.matches);
  }
  diagnostics(){return {active:this.active,gameActive:this.gameActive,scrollY,opening:this.intro.diagnostics(),study:this.study.diagnostics()};}
}

function smoothProgress(value){const t=Math.max(0,Math.min(1,(value-.25)/.63));return t*t*(3-2*t);}
