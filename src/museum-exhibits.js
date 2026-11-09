import {puppetCanvas} from './art.js';

const ink='#60412d', jade='#36564a', red='#88462f';
function text(ctx,value,x,y,size=48,color=ink,brush=false){ctx.fillStyle=color;ctx.font=`${size}px ${brush?'"Zhi Mang Xing"':'serif'}`;ctx.textAlign='center';ctx.fillText(value,x,y,1080);}
function line(ctx,points,color=ink,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function badge(ctx,x,y,title,sub,active){ctx.fillStyle=active?'#91482c18':'#36564a0b';ctx.strokeStyle=active?red:jade;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,104,0,Math.PI*2);ctx.fill();ctx.stroke();text(ctx,title,x,y+30,84,active?red:jade,true);text(ctx,sub,x,y+166,36);}

// Original exhibition diagrams, printed as a transparent layer on the old linen.
// These are interpretation aids, not photographs of historic objects or people.
export function drawMuseumExhibit(canvas,room,index){
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.scale(canvas.width/1200,canvas.height/840);
  text(ctx,`${room.no} / ${room.label}`,600,72,32,jade);
  if(room.graphic==='places'){
    text(ctx,index===2?'一方传统，两份记录':'江汉平原',600,228,126,ink,true);
    if(index===2){
      line(ctx,[[285,420],[915,420]],jade,3);
      for(const [x,year,label] of [[300,'2006','江汉平原皮影戏'],[900,'2011','中国皮影戏']]){
        ctx.fillStyle=red;ctx.beginPath();ctx.arc(x,420,9,0,Math.PI*2);ctx.fill();text(ctx,year,x,370,100,jade);text(ctx,label,x,504,40);
      }
      text(ctx,'地方项目 · 中国皮影',600,675,42);
    }else{
      ctx.strokeStyle='#526f6955';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(80,490);ctx.bezierCurveTo(350,330,800,570,1120,430);ctx.stroke();
      for(const [x,name,sub] of [[260,'天门','天'],[600,'潜江','潜'],[940,'沔阳','今仙桃']])badge(ctx,x,435,name,sub,false);
      text(ctx,index===1?'乡音 · 雕镂 · 口头叙事':'流传地域关系示意',600,730,42);
    }
  }else if(room.graphic==='detail'){
    const art=puppetCanvas(35,0);
    if(index===0){ctx.drawImage(art,375,112,380,649);line(ctx,[[710,242],[980,242]],red);text(ctx,'侧面轮廓',915,210,44);line(ctx,[[392,590],[190,590]],jade);text(ctx,'衣缘',225,551,44);}
    if(index===1){ctx.drawImage(art,368,740,350,560,390,118,390,624);text(ctx,'镂空',230,360,76,jade,true);text(ctx,'连缀',960,500,76,red,true);line(ctx,[[292,390],[460,440]],jade);line(ctx,[[905,532],[735,574]],red);}
    if(index===2){ctx.drawImage(art,350,540,410,720,390,115,350,615);for(const [x,c,label] of [[226,red,'色'],[960,jade,'线']]){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x-65,325,130,130);text(ctx,label,x,420,88,c,true);}text(ctx,'色面、描边与留白',600,740,44);}
  }else if(room.graphic==='voices'){
    text(ctx,index===2?'故事，在讲述中展开':'一台戏，许多本领',600,230,100,ink,true);
    for(const [i,x,title,sub] of [[0,260,'唱','声音与语气'],[1,600,'奏','节奏与伴奏'],[2,940,'演','人物与情节']])badge(ctx,x,440,title,sub,index===2?i===2:i===index);
    text(ctx,['歌腔 · 渔鼓腔','操演、演唱与伴奏相互配合','故事线索 → 艺人讲述 → 人物与情节'][index],600,740,42);
  }else if(room.graphic==='people'){
    if(index<2){
      text(ctx,index?'汤先成':'刘年华',600,310,174,ink,true);
      line(ctx,[[240,380],[960,380]],jade,2);
      text(ctx,index?'2006':'1961',600,530,112,jade);
      text(ctx,index?'整理《汤格皮影》':'到潜江皮影队学艺',600,620,49);
      text(ctx,'江汉平原皮影戏 · 传承人档案',600,748,34);
    }else{
      text(ctx,'手艺，从相授中延续',600,230,100,ink,true);
      for(const [x,t,s] of [[260,'家','家庭相教'],[600,'班','戏班共学'],[940,'师','师徒相传']])badge(ctx,x,440,t,s,false);
    }
  }else{
    text(ctx,'让戏，接着被看见。',600,230,100,ink,true);
    line(ctx,[[205,440],[995,440]],jade,3);
    for(const [i,x,year,sub] of [[0,245,'2006','国家级名录'],[1,600,'2011','人类非遗名录'],[2,955,'今天','从观众出发']]){
      ctx.fillStyle=i===index?red:jade;ctx.beginPath();ctx.arc(x,440,i===index?12:7,0,Math.PI*2);ctx.fill();text(ctx,year,x,370,83,i===index?red:jade);text(ctx,sub,x,530,37);
    }
    text(ctx,['记下地方传统','看见共同的文化记忆','记住一个名字，接着认识一门戏'][index],600,695,46);
  }
}
