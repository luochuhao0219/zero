# 0.8 连续滚动与建筑入口

日期：2026 年 11 月 7 日。

2026-11-11 门内实景统一：左门洞改为直接使用实际三维展厅的入口相机、展柜、材质与灯光。展厅资源完整加载后，按门洞大小离屏绘制并缓存；窗口尺寸或清晰度变化才重绘。点击“进入历史馆”时从同一相机立即接续真实场景，取消旧照片到展厅的渐变替换，保留石拱、木门与墙牌的遮挡。入口取景确保第一柜在宽、窄屏的门叶之间可见，再平滑并入馆内原有参观路线。投影对应关系由 `tests/gallery-preview.test.mjs` 验证。

2026-11-11 内厅导览：左右石拱上方新增旧木墙牌，分别写“历史馆”“皮影戏台”；地面两个小按钮分别进入原有左馆与右侧完整穿幕路线。移除遮住入口的大卡片和大幅导览标题。墙牌作为内厅图像坐标中的独立纹理层显示，从长廊远处就能看见，跟随相机与门洞遮罩一起移动；地面按钮按同一照片取景定位，保留键盘与触摸操作。文字用现有字体现场绘制，底板复用 `aged-wood/color.jpg`；没有改写建筑原图或新增动态光源。“历史馆”为入口牌名，馆内五柜内容不变。

2026-11-11 封面衔接：当前开场与加载占位改用 `campus-entrance-connected.png`，门内木梁、吊灯、侧窗和远处双门与后续走廊保持同一方向。实际场景从第一帧就透过外门显示连接走廊，不在靠近时切换门内图片，避免吊灯重影；仍沿既有路径走完连接走廊才到达双门内厅。新版封面原图及完整生成提示词见 `assets/passage/campus-entrance-connected-notes.json`。

2026-11-11 连接走廊：外门后增加独立的单通道长廊，原有双门内厅位于长廊尽头的内侧拱门之后。外门先遮挡长廊，内侧拱门再遮挡双门，镜头穿过两层实体边界后才显示方向选择。首页点击“向下滚动，往光里走”可连续播放约 11 秒；滚动靠近门口也会接续自动行进，期间 Escape 可返回开头，后台暂停不会跳过走廊。完成后可以正常进入左馆或右侧完整穿幕路线。素材说明见 `assets/interior/connecting-corridor-notes.json`，自动路径检查见 `tests/foyer-entrance.test.mjs`，宽窄屏实拍见 `screenshots/art-polish/foyer-*`。

2026-11-10 首屏修正：移除旧校园远景的覆盖层、预加载及 2.5 秒自动切图。加载占位与实际开场统一使用 `campus-entrance.png`，占位取景按初始相机匹配；场景和合成程序的准备全部在离屏缓冲完成，正确路线的第一帧绘制后才显露画布。已检查首次载入、首页进入内厅和完整穿幕至戏台；88 项自动检查通过。后续双路线与戏台入场见 `DUAL-ROUTE.md` 和 `STAGE-ENTRANCE.md`，以下保留 0.8 版本记录。

开场移除道路中的独立戏棚。路线从校园道路走进真实建筑尺度的门廊，在有墙、窗、顶梁和地面的室内展演间遇到固定在背墙木龛中的影幕，再从影幕穿入灯市。这两处建筑是艺术化虚构，不是武汉大学某个地点的实景记录。

全站使用一条浏览器原生滚动轨道；桌面长度 1180svh，手机 1200svh。相机、场景遮罩、旁白和导航共同读取 0–1 的连续进度。游戏前的戏台展示、绕到幕后、返回幕前、留影结尾也随滚动前后移动，避免后半段切回普通段落。主动进入小游戏后，滚动叙事暂停，恢复直接抓取灯、影人和手杆的玩法；退出回到 85.5% 的开场位置。

## 视听实现

- 0–21%：校舍立面、独立近景枝叶与微量粒子；相机沿道路对准建筑门洞。室内图像通过匹配门洞的拱形遮罩显露。
- 10–40%：带天花、侧窗、石地板和内置木台的室内背景，独立影人轻摆。相机向墙上的影幕靠近，纸面开口逐渐展露灯市。
- 27–64.6%：复用夜市全景、摊位、人物景片、灯笼及蒸汽，沿街道前移。59–64.5% 以短暂暖光和透明度衔接实际三维戏台。
- 59–100%：三维戏台的前进、侧绕、幕后停留、回到开场位置和末尾抬高拉远，全由同一进度控制。环境待机动画继续提供生活气息。
- 未显示的三维场景停止绘制；进入游戏后介绍停止绘制。减少动态效果偏好关闭惯性、鼠标摆动和待机动画，主动滚动和游戏操作保留。
- 图片提供材质细节，相机与独立景片提供视差。校园和室内是分层图片场景；游戏中的戏台才是完整可绕行的三维结构。

## 新素材

生成模式：内置 imagegen；没有使用 CLI/API 备用生成。两张原图直接复制到项目，未手工重绘图片。尺寸、格式和 SHA-256 见 assets/passage/manifest.json。

| 项目文件 | 用途 | 原始输出 |
| --- | --- | --- |
| assets/passage/campus-entrance.png | 建筑入口立面与道路 | /Users/luochuhao/.codex/generated_images/01a1aef3-5aed-7ec0-acf3-b60064a4f5a7/exec-cdacee82-0e3d-4019-99a3-6c29871467c0.png |
| assets/passage/interior-gallery.png | 室内展演间与背墙影幕 | /Users/luochuhao/.codex/generated_images/01a1aef3-5aed-7ec0-acf3-b60064a4f5a7/exec-db659f7e-73b5-4243-ae5e-bbc3c4c7a921.png |

旧 campus-theatre.png 与 luojia-dusk.png 留作版本素材，当前开场不加载；shadow-gate.png 只在另一侧夜市使用。

## 实际提示词

两次均为 transparent_background: false，无引用图片。

### 建筑入口

```text
Use case: photorealistic-natural. Asset type: high-detail landscape 3:2 cinematic environment matte for a scroll-through cultural website. Create an ORIGINAL FICTIONAL university campus inspired by the dignified early twentieth-century architecture of Wuhan University, not a real photograph or claimed exact location. Blue hour, subtle cool teal shadows and warm lamps. A worn gray stone campus path naturally leads forward INTO the open ground-floor entrance of an existing substantial academic building, whose pale weathered stone facade, dark green tiled roof and covered arcade occupy the middle distance. Mature camphor branches frame upper corners; moss, leaves and soft lamplight give it a lived-in quality. The PATH MUST END AT THE BUILDING'S ENTRANCE STEPS: the entrance is architectural, structurally part of the building, not a pavilion standing in the roadway. Straight-on one-point perspective, camera at adult eye height, clear approach. Wide arched doorway centered at approximately image x 52%, y 55%, opening occupies around 18% image width and 38% image height. Two old dark timber doors are already open against the stone jambs, revealing a dim warm covered corridor beyond. The opening is a single unobstructed dark arch with subtle amber light in depth. No curtain or puppet theatre outdoors; absolutely NO freestanding booth, floating screen or theatrical proscenium on the path. Inside can be a distant tiny warm light, but no prominent screen yet. Fine tactile stone and wood detail, plausible botanical detail, restrained cinematic color grade. The entire environment fills the image. No text, signs, readable lettering, logo, watermark, UI, frame or border. No close foreground people.
```

### 室内展演间

```text
Use case: photorealistic-natural. Asset type: high-detail landscape 3:2 environment matte for walking into a fictional campus cultural exhibition room. View from just inside the entrance of an old Chinese university academic building at blue hour. A REAL ENCLOSED ROOM: pale aged stone walls on both sides, visible exposed dark timber ceiling beams, a stone floor with clear one-point perspective, deep reveals of side windows with cool twilight outside. The room is modest, intimate and lived-in, not a palace. At the far end, a small shadow-puppetry demonstration stage is BUILT INTO a timber alcove against the back wall, firmly resting on a low wooden platform with two shallow steps. Its blank warm ivory fabric screen is stretched and visibly laced into a restrained red-brown wooden frame, burgundy skirt underneath, two simple warm hanging lamps, fine cloth weave and subtle wrinkles. The rectangular blank screen is centered near image x 50%, y 49%, occupying about 32% of image width and 33% image height. Leave the screen completely blank for an animated puppet overlay; no printed silhouette. Side walls have small shallow niches and a bench, subtle exhibition atmosphere with no labels. Wide clear central walking space from bottom foreground to screen, NO objects obstruct the path. Soft amber screen illumination on the adjacent wood and stone, cool blue ambient fill at the doorway, rich shadow detail, convincing cinematic photographic realism and material texture, no simplistic 3D blocks. This is original artistic fiction, not historical reconstruction or real documentary photography. No text, no captions, no people, no watermarks, no UI, no border. Fill the whole canvas edge to edge.
```

## 验证入口

- tests/browser-continuous.cjs：全程滚动、反向回退、进出游戏、手机触摸和减少动态效果。
- tests/browser-direct.cjs：真实鼠标三关通关与触摸首关，下载和持久化。
- tests/browser-motion.cjs：重演开场、镜头切换、连续拖动插值与横屏布局。
- 最终结果记录于 VERIFICATION.md 与 continuous-*.json，网站实拍为 screenshots/v8-*.png；v8-first-* 为修改前截图。

