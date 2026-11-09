/** Curatorial copy checked against the linked institutional records, 2026-11-08. */
export const SOURCES = {
  regional: ['中国非遗网 · 江汉平原皮影戏', 'https://www.ihchina.cn/project_details/13398.html'],
  artist: ['中国非遗网 · 刘年华', 'https://www.ihchina.cn/ccr_detail/1787.html'],
  carver: ['中国非遗网 · 汤先成', 'https://www.ihchina.cn/ccr_detail/1786.html'],
  unesco: ['UNESCO · 中国皮影戏', 'https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421?RL=00421'],
  film: ['UNESCO · 中国皮影纪录片', 'https://www.unesco.org/archives/multimedia/document-2233'],
};

export const ROOMS = [
  {
    id: 'heritage', no: '01', name: '江汉水土', en: 'A TRADITION AND ITS PLACE',
    title: '先认一方水土，再认一张影。',
    intro: '这段参观，从湖北江汉平原的一支地方传统开始。',
    label: '地方档案', graphic: 'places',
    panels: [
      {label:'流传地域', title:'天、潜、沔，是理解它的起点。', text:'天门、潜江、沔阳一带，是江汉平原皮影戏的核心流传地区。沔阳对应今天的仙桃；相邻地方的生活与乡音，共同进入这门戏。', note:'柜内以江河景片与影人介绍地方传统，为主题数字陈列。', sources:['regional']},
      {label:'地方风格', title:'同是皮影，各有自己的口音。', text:'中国各地的皮影传统并不相同。江汉皮影在雕镂、唱腔和口头叙事上形成了自己的面貌，不能用一个数字影人概括所有地方。', note:'接下来，分别从手艺、声音和人的经历认识它。', sources:['regional']},
      {label:'名录线索', title:'两个年份，记录不同的范围。', text:'2006年，江汉平原皮影戏进入第一批国家级非遗名录。2011年列入联合国教科文组织名录的，是“中国皮影戏”这一整体项目。', note:'地方项目与中国皮影，彼此关联，也各有范围。', sources:['regional','unesco']},
    ],
  },
  {
    id: 'craft', no: '02', name: '刀下纹样', en: 'READING THE CUT LEATHER',
    title: '看见刀口，也看见留白。',
    intro: '停在一张影人前，看轮廓、镂空与设色怎样留下手艺的痕迹。',
    label: '细节观察', graphic: 'detail',
    panels: [
      {label:'看轮廓', title:'侧面的线，也在交代人物。', text:'顺着额头、鼻梁与衣缘看下去：外轮廓让人物在幕上容易辨认。停在柜前，可以先看影人的整体，再留意头饰与衣缘的细节。', note:'柜中影人为主题数字陈列，不作为传统实物样本。', sources:['regional']},
      {label:'看刀口', title:'刻去的部分，也参与造型。', text:'细小的空隙让光透过，留下的线条连接纹样。江汉皮影的“汤格”“郭格”雕镂自有地方特点；可以结合柜内纹样，看看刻去与留下如何构成衣饰。', note:'观察提示：看衣纹中连续的细线与透光的孔。', sources:['regional']},
      {label:'看设色', title:'颜色落在材料上，再进入光里。', text:'影人制作包含刻制与上彩。看同一块衣饰时，可以同时留意色面、描边与镂空，理解它们如何一起组织画面。', note:'本站朱红与青绿为数字配色，不对应传统行当分类。', sources:['regional']},
    ],
  },
  {
    id: 'voices', no: '03', name: '乡音戏班', en: 'THE VOICES BEHIND THE SCREEN',
    title: '幕上有影，幕后有人声。',
    intro: '把目光从影人移开，认识让一台戏成立的声音、协作与讲述。',
    label: '幕后的工作', graphic: 'voices',
    panels: [
      {label:'唱腔', title:'乡音，让一张影有了声情。', text:'江汉平原皮影戏的主要唱腔包括歌腔、渔鼓腔。观看时，除了人物动作，也可以留意唱句的起落、停顿和角色语气。', note:'本站环境音乐是原创配乐；传统唱腔请循资料观看。', sources:['regional','film']},
      {label:'戏班', title:'一人也可能身兼数艺。', text:'皮影表演结合操演、演唱与伴奏。艺人可能同时掌握多种技能，戏班规模也有差异。透过柜中的影人，还可以想一想幕后的这些工作怎样配合。', note:'UNESCO 的纪录片介绍中国皮影的整体传统。', sources:['unesco','film']},
      {label:'口传故事', title:'故事，也活在艺人的讲述里。', text:'江汉皮影的一些剧本只保留剧目条文，艺人依故事线索展开情节与人物。口头叙事因此也是这门戏的重要组成部分。', note:'观看提示：留意艺人如何用语气与节奏串起人物和情节。', sources:['regional']},
    ],
  },
  {
    id: 'people', no: '04', name: '传艺的人', en: 'THE PEOPLE WHO CARRY IT',
    title: '记住手艺，也记住人的名字。',
    intro: '两份传承人档案，留下不同的学艺经历与保存手艺的方式。',
    label: '人物档案', graphic: 'people',
    panels: [
      {label:'刘年华', title:'刘年华：从学戏，到一身多艺。', text:'官方档案记载，刘年华于1961年随祖父到潜江皮影队学艺。他掌握演唱与乐器演奏，也从事皮影雕刻和传徒。', note:'国家级代表性传承人 · 江汉平原皮影戏。此处为档案摘要。', sources:['artist']},
      {label:'汤先成', title:'汤先成：把刀下经验整理成书。', text:'汤先成从家人指导中学习汤格皮影雕刻。官方档案记载，他在2006年完成《汤格皮影》的撰写，将制作经验加以整理、保存。', note:'国家级代表性传承人 · 学习线索：汤格皮影的雕刻与技艺整理。', sources:['carver']},
      {label:'如何传艺', title:'从一个人的手，到另一个人的手。', text:'家庭、戏班和师徒关系，是皮影技艺传递的途径。唱、奏、刻与演的经验，在共同生活和反复练习中积累，也在相互切磋中延续。', note:'传承人的名字，是继续查找真实作品与记录的入口。', sources:['unesco','artist','carver']},
    ],
  },
  {
    id: 'legacy', no: '05', name: '留住一门戏', en: 'A LIVING TRADITION',
    title: '一门戏的以后，还有观众。',
    intro: '带走几个名字、几条线索，下一次看戏时，多看见一点。',
    label: '参观后记', graphic: 'legacy',
    panels: [
      {label:'被记下', title:'2006 · 江汉平原皮影戏。', text:'国家级名录中的项目编号为Ⅳ-91，类别为传统戏剧。名录记录的不只是一种影偶造型，还有与表演相连的地方传统。', note:'查看原始项目档案，可以继续找到相关传承人。', sources:['regional']},
      {label:'被看见', title:'2011 · 中国皮影戏。', text:'中国皮影戏进入人类非物质文化遗产代表作名录。它承载的文化历史、口头传统与地方生活，和幕上的影像一起被讲述。', note:'通过官方纪录片，继续认识不同地区的表演。', sources:['unesco','film']},
      {label:'继续认识', title:'从观众的位置，接着看下去。', text:'记住“江汉平原皮影戏”这个名称，认识一位艺人，读一份原始资料。以后遇到真正的演出，再听听唱腔、看看幕后的人。', note:'本馆图像与影人为主题数字创作，不能替代实物、唱腔与现场演出。', sources:['regional','artist','carver']},
    ],
  },
];

export const MUSEUM_ALIASES = {stories:'voices', light:'people', compose:'legacy'};
export const museumRoomId = id => MUSEUM_ALIASES[id] || id;
