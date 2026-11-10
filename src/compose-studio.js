import {createWorkActions,deleteSavedWork} from './collection-actions.js';
import {puppetCanvas,drawPaper,gateCanvas,branchCanvas,bridgeCanvas} from './art.js';
import {COMPOSITION_KEY,DRAFT_KEY,defaultDraft,sanitizeDraft,readJSON,readCompositions} from './explore-data.js';
const $=id=>document.getElementById(id);
const range=(id,label,min,max,value,unit='')=>`<label class="ex-range" for="${id}"><span>${label}<output id="${id}-value">${value}${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}"></label>`;
const sceneOptions='<option value="bridge">小桥相逢</option><option value="moon">月下行旅</option><option value="garden">花枝入梦</option>';

// The optional studio belongs to the user's collection, outside the museum route.
export class FreePlayStudio {
  constructor({toast,onPause,onResume}) {
    Object.assign(this,{toast,onPause,onResume});
    this.storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
    this.draft=sanitizeDraft(readJSON(this.storage,DRAFT_KEY,null));this.works=readCompositions(this.storage);
    this.scenery={gate:gateCanvas(),branch:branchCanvas(),bridge:bridgeCanvas()};
    const dialog=document.createElement('dialog');dialog.id='studio-dialog';dialog.className='sheet studio-sheet';
    dialog.setAttribute('aria-labelledby','studio-title');
    dialog.innerHTML=`<header class="studio-header"><div><span class="sheet-label">YOUR OWN LITTLE PLAY</span><h2 id="studio-title">自由编戏</h2><p>排一出自己的小戏，留在这本册子里。</p></div><button id="studio-close" aria-label="关闭自由编戏，返回留影册">返回留影册 ↶</button></header>${this.composeMarkup()}`;
    document.body.append(dialog);this.dialog=dialog;
    const collection=document.createElement('section');collection.className='ex-collection';
    collection.innerHTML='<div class="ex-collection-heading"><h3>我的自由小戏</h3><button id="collection-compose">继续编一出 ↗</button></div><p id="ex-collection-empty">还没有自己的小戏。从一张幕开始吧。</p><div id="composition-works" class="works-grid"></div>';
    $('collection-dialog').append(collection);
    $('collection-compose').addEventListener('click',()=>this.open());
    $('studio-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{this.cancelDrag?.();if(this.returnToCollection)$('collection-dialog').showModal();this.onResume?.();});
    this.bind();this.syncComposer();this.renderWorks();
    document.fonts.ready.then(()=>this.syncComposer());
  }
  open(){
    if(this.dialog.open||this.onPause?.()===false)return;
    this.returnToCollection=$('collection-dialog').open;
    this.dialog.showModal();if(this.returnToCollection)$('collection-dialog').close();
  }
  composeMarkup(){return `<section class="ex-room" id="ex-compose" aria-label="自由编戏"><div class="ex-composer"><div class="ex-composer-stage"><canvas id="compose-canvas" width="1200" height="840" tabindex="0" role="img" aria-label="自由编戏画布。拖动影人排布，也可使用右侧位置滑杆与方向键调整。"></canvas><p class="ex-canvas-caption">拖动影人排布 · 选中后用方向键微调 · 下方也可调整位置</p><span id="compose-status" class="ex-save-status" role="status">草稿自动保存在当前浏览器</span></div><div class="ex-compose-controls"><label class="ex-field" for="compose-title">给这出戏起个名字<input id="compose-title" maxlength="18" placeholder="最多18个字"></label><div class="ex-form-row"><label class="ex-field" for="compose-scene">布景<select id="compose-scene">${sceneOptions}</select></label><label class="ex-field" for="compose-count">影人<select id="compose-count"><option value="2">两位相逢</option><option value="1">一人独行</option></select></label></div><div class="ex-actor-select" aria-label="选择影人"><button data-actor="0" aria-pressed="true">朱红影人</button><button data-actor="1" aria-pressed="false">青绿影人</button></div>${range('compose-x','左右位置',16,84,36,'%')}${range('compose-y','上下位置',45,86,74,'%')}${range('compose-size','影人大小',65,135,100,'%')}${range('compose-pose','手杆角度',-30,120,40,'°')}<label class="ex-check"><input id="compose-flip" type="checkbox">转身，朝向另一侧</label><div class="ex-compose-actions"><button class="ex-primary" id="compose-save">收进留影册 ＋</button><button class="ex-secondary" id="compose-download">下载戏票 ↗</button></div><button class="ex-text-button" id="compose-reset">重新排一出</button></div></div><div class="ex-personal-heading"><h3>你留下的小戏</h3><span>仅保存在此浏览器 · 最近六出</span></div><p id="compose-empty" class="ex-muted">还没有留影。排好人物，收下今夜的第一张戏票。</p><div id="compose-gallery" class="ex-personal-grid"></div><p class="ex-note">此处使用本站原创角色与景片自由组合。可以下载保存；清理浏览器数据会移除本地草稿和留影。</p></section>`;}
  bind(){
    $('compose-title').addEventListener('input',()=>{this.draft.title=$('compose-title').value.slice(0,18);this.updateComposer();});
    $('compose-scene').addEventListener('change',()=>{this.draft.scene=$('compose-scene').value;this.updateComposer();});
    $('compose-count').addEventListener('change',()=>{this.draft.count=Number($('compose-count').value);if(this.draft.count===1)this.draft.selected=0;this.syncComposer();this.updateComposer();});
    this.dialog.querySelectorAll('[data-actor]').forEach(b=>b.addEventListener('click',()=>{this.draft.selected=Number(b.dataset.actor);this.syncComposer();}));
    for(const [id,key,scale] of [['compose-x','x',1],['compose-y','y',1],['compose-size','size',.01],['compose-pose','pose',1]])$(id).addEventListener('input',()=>{this.draft.actors[this.draft.selected][key]=Number($(id).value)*scale;this.updateComposer();});
    $('compose-flip').addEventListener('change',()=>{this.draft.actors[this.draft.selected].flip=$('compose-flip').checked;this.updateComposer();});
    $('compose-reset').addEventListener('click',()=>{this.draft=defaultDraft();this.syncComposer();this.updateComposer();});
    $('compose-save').addEventListener('click',()=>this.saveComposition());$('compose-download').addEventListener('click',()=>this.download(this.poster(),'借光-'+(this.draft.title||'无题小戏')));
    this.bindCanvas();
  }
  bindCanvas(){
    const canvas=$('compose-canvas');let drag=null;
    this.cancelDrag=()=>{drag=null;};
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;const p=this.canvasPoint(canvas,e);const hits=this.actorBounds();let hit=-1;for(let i=hits.length-1;i>=0;i--){const b=hits[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){hit=i;break;}}if(hit<0)return;e.preventDefault();this.draft.selected=hit;const a=this.draft.actors[hit];drag={pointer:e.pointerId,x:p.x,y:p.y,startX:a.x,startY:a.y};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});this.syncComposer();});
    canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const p=this.canvasPoint(canvas,e),a=this.draft.actors[this.draft.selected];a.x=Math.max(16,Math.min(84,drag.startX+(p.x-drag.x)/12));a.y=Math.max(45,Math.min(86,drag.startY+(p.y-drag.y)/8.4));this.syncComposer();this.updateComposer(false);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag&&drag.pointer===e.pointerId){drag=null;this.updateComposer();}});
    canvas.addEventListener('keydown',e=>{const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=shifts[e.key];if(!delta)return;e.preventDefault();const a=this.draft.actors[this.draft.selected],step=e.shiftKey?4:1;a.x=Math.max(16,Math.min(84,a.x+delta[0]*step));a.y=Math.max(45,Math.min(86,a.y+delta[1]*step));this.syncComposer();this.updateComposer();});
  }
  canvasPoint(canvas,e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  outputs(){this.dialog.querySelectorAll('input[type=range]').forEach(input=>{const out=$(input.id+'-value');if(out)out.textContent=Math.round(Number(input.value))+(input.dataset.unit||'');});}
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
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,false);this.outputs();
  }
  updateComposer(persist=true){
    this.drawComposition($('compose-canvas').getContext('2d'),1200,840,false);this.outputs();if(!persist)return;
    try{this.storage.setItem(DRAFT_KEY,JSON.stringify(this.draft));$('compose-status').textContent='草稿已保存 · 下次回来可以接着排';}catch{$('compose-status').textContent='草稿暂存于本页，请下载戏票保存';}
  }
  poster(){const c=document.createElement('canvas');c.width=1200;c.height=840;this.drawComposition(c.getContext('2d'),1200,840);return c.toDataURL('image/webp',.86);}
  saveComposition(){
    const image=this.poster(),title=this.draft.title.trim()||'无题小戏';this.works=[{image,title,date:new Date().toISOString()},...this.works].slice(0,6);
    try{this.storage.setItem(COMPOSITION_KEY,JSON.stringify(this.works));$('compose-status').textContent='已收进留影册，也可以下载戏票';}catch{$('compose-status').textContent='本次留影暂存在页面中，请下载保存';}
    this.renderWorks();this.toast('小戏已收进留影册');
  }
  renderWorks(){
    const populate=(root,compact)=>{
      root.replaceChildren();
      for(const work of this.works){
        const figure=document.createElement('figure');figure.className=compact?'work-item':'ex-personal-work';
        const img=document.createElement('img');img.src=work.image;img.alt=work.title+'的自由编戏留影';img.loading='lazy';
        const caption=document.createElement('figcaption'),name=document.createElement('span');name.textContent=work.title;
        const actions=createWorkActions({title:work.title,onDownload:()=>this.download(work.image,'借光-'+work.title),onDelete:()=>{
          try{this.works=deleteSavedWork(this.storage,COMPOSITION_KEY,this.works,work);this.renderWorks();$('compose-status').textContent='留影已删除，当前编戏草稿保留';this.toast('留影已删除');return true;}
          catch{this.toast('删除未能保存，请重试。');return false;}
        }});
        caption.append(name,actions);figure.append(img,caption);root.append(figure);
      }
    };
    populate($('compose-gallery'),false);populate($('composition-works'),true);
    $('compose-empty').hidden=!!this.works.length;$('ex-collection-empty').hidden=!!this.works.length;
    const count=$('works-grid').children.length+this.works.length;$('collection-count').textContent=count;$('works-count').textContent=String(count).padStart(2,'0');
  }
  download(image,name){const a=document.createElement('a');a.href=image;a.download=name+'.webp';a.click();}
}
