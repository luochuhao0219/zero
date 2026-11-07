# 文化与设计参考

## 文化依据

- 中国非物质文化遗产网，皮影戏（江汉平原皮影戏）：https://www.ihchina.cn/project_details/13398.html
  - 参考影人以薄片造型、关节与操纵杆表演，借光与幕形成戏剧的基本原理。
  - 本项目的影人服饰、校园景片与剧情为数字创作，不宣称是某位传承人的作品或完整复原。
- UNESCO，Chinese shadow puppetry：https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421
  - 0.6 介绍页参考影人刻制、敷彩、联缀和幕后操杆表演的基本过程；简化为“刻／染／动”与直接移动光源的小实验。

## 视觉与交互研究

- Lusion：https://lusion.co/ — 2026-11-06 实际查看首页，参考浅色外框、无衬线字级、大幅圆角三维画面、少量悬浮导航。该站使用 Aeonik；本项目没有复制或分发该商业字体。
  - 0.6 再次观察首页与滚动推进，参考实时视觉主体、鼠标响应和章节节奏；在本项目中实现为影人近观、工艺细节、光影实验和游戏入场。设计与生成图记录见 `STORY-DESIGN.md`。
- Choo-Choo World：https://choochooworld.com/ — 2026-11-06 实际进入游戏与操作教程，参考以可操作场景为核心、工具悬浮于画面、用直接手势控制物体的组织方式。
- My Little Storybook：https://exp-my-little-storybook.lusion.co/ — 参考风格化三维叙事。

上述作品未作为源码、模型、材质、音乐或游戏模板使用。

## 生成图像

- 夜市三张氛围贴图：`ATMOSPHERE-ASSETS.md`。
- 0.6 开场透明影人：`assets/story/puppet-hero.png`，内置 imagegen 原创生成，完整提示词与用途见 `STORY-DESIGN.md`。该图为数字演绎，不是馆藏图像或历史影像。

- 0.7 穿幕新增校园夜路、镂花门框、透明近景樟树：`assets/passage/`，均由内置 imagegen 制作，完整提示词及空间设计见 `PASSAGE-DESIGN.md`。原有非遗资料来源继续沿用。

## 字体

- Inter Tight 可变字体：https://github.com/google/fonts/tree/main/ofl/intertight
- 钟齐志莽行书（Zhi Mang Xing）：https://github.com/google/fonts/tree/main/ofl/zhimangxing 。用于中文标志、标题、关卡、主要按钮、戏台匾额与新生成留影的标题；依据用户偏好采用毛笔行书。
- 两款字体与各自的 SIL Open Font License 1.1 一同保存在 `assets/fonts/`，使用官方未修改字体文件。小字说明使用系统无衬线字体，不附带系统商业字体文件。

## 渲染库

- Three.js 0.180.0：https://threejs.org/
- WebGLRenderer：https://threejs.org/docs/pages/WebGLRenderer.html
- CanvasTexture：https://threejs.org/docs/pages/CanvasTexture.html
- 原始许可保留在 `vendor/THREE-LICENSE.txt`。
- 0.4 使用同版本官方插件：`RoundedBoxGeometry`（圆角建筑构件）、`BufferGeometryUtils`（合并静态网格）、`Reflector`（实时平面反射）、`EffectComposer` / `RenderPass` / `ShaderPass` / `UnrealBloomPass` / `OutputPass`（后期流水线、泛光和颜色输出）。依赖链在 `vendor/addons/`，沿用 Three.js 的 MIT 许可。`UnrealBloomPass` 是 Three.js 的后期模块名称，本项目没有使用 Unreal Engine。

## 表面材质

木材、石板、织物的基色／法线／粗糙度使用 Poly Haven CC0 贴图。详见 `MATERIAL-SOURCES.md` 和 `assets/materials/manifest.json`。建筑模型、影人及图案仍为代码生成，未使用《黑神话：悟空》的游戏资产。

## 比赛约束

依据用户提供的选手手册：游戏网站是允许的方向；不得使用预设样式库，非自编功能库需逐一注明用途；现有作品不可直接改装参赛。游戏框架具体模块的允许范围、AI 辅助使用范围，仍以主办方解释为准。本原型不将使用库本身宣称为原创技术难度。
# 校园戏棚补充素材

0.7.1 新增 `assets/passage/campus-theatre.png`，由内置 imagegen 原创生成，用作校园入口的完整戏棚透明景片。生成提示词、原始输出路径及使用边界见 `CAMPUS-THEATRE-ASSET.md`，尺寸与 SHA-256 见 `assets/passage/manifest.json`。


## 0.8 建筑入口与全站连续滚动

新增校园建筑入口、室内展演间两张内置 imagegen 素材；旧道路戏棚不再加载。实际提示词、原图路径、场景限制和连续镜头实现见 `CONTINUOUS-JOURNEY.md`，尺寸及校验值见 `assets/passage/manifest.json`。建筑与房间为艺术化虚构，无新增实景或历史事实主张。
