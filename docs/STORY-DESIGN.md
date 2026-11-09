# 0.6 叙事开场与交互设计

这次把原来的游戏放进完整网站：先认识影人，再通过光影实验理解“借光”，最后进入珞珈夜市亲手演一幕。项目以江汉平原皮影为文化参考，武大与珞珈意象属于校园数字创作，不将皮影表述为武汉大学独有的非遗。

## 访问顺序

1. **初见：借光，入戏。** 大幅行书标题与一件细节丰富的影人。鼠标移动时，薄片影人轻转，投影随光的位置变化。
2. **造影：薄如纸，自有乾坤。** 原生滚动驱动同一件影人的移位和近观。刻、染、动三个条目可以悬停、点击或键盘聚焦，展开说明，并将观察环移动到对应部位。
3. **借光：光一动，影就活了。** 深色空间中放一块亮纸幕。直接拖动光点，影子向相反方向移动；没有参数滑杆、确认或评分。这个小实验为游戏的投影机制做铺垫。
4. **入戏：珞珈的夜，等你开场。** 之前的夜市戏台作为章节预览，点击“接过手杆”进入专注操作的游戏画面。“返回网站”或 Esc 回到此处；页尾连接留影册。

顶部的“去玩”始终可以直接进入游戏。进入游戏时介绍区设为 inert 并暂停绘制，退出后恢复阅读和焦点访问。游戏中仍保留点灯、搭桥、对戏三幕和直接抓取、手杆旋转、撤销、留影。

## 参考与文化依据

- [Lusion](https://lusion.co/)：2026-11-06 实际查看首页及滚动后的画面，参考留白、大幅实时视觉主体、少量悬浮导航，以及让滚动驱动画面推进的组织方式。本项目重新设计构图、配色、文字、影人和交互，没有复制其源码、模型、图像或商业字体。
- [中国非物质文化遗产网：皮影戏（江汉平原皮影戏）](https://www.ihchina.cn/project_details/13398.html)：用于确认地区文化背景。江汉平原皮影流布于湖北中南部，本项目使用其文化背景，加入原创校园叙事。
- [UNESCO：Chinese shadow puppetry](https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421)：用于影人制作与表演的基本说明，包括皮料加工、刻制与敷彩、部件联缀，以及透光幕布后的操纵杆表演。网站的工艺说明是简化介绍，数字互动是艺术化演绎。

标题继续使用本地志莽行书，正文使用系统无衬线字体。保留暖纸色、朱砂、暗绿与夜市暖光之间的色彩关系。

## 图像资产与生成记录

- 模式：**内置 imagegen**，新图生成，透明背景；没有使用 CLI 生成路径。
- 项目资产：`assets/story/puppet-hero.png`
- 原始输出：`/Users/luochuhao/.codex/generated_images/01a1aef3-5aed-7ec0-acf3-b60064a4f5a7/exec-913c6eb0-9cc9-4341-9dca-9958f576f055.png`
- 规格：1024 × 1536，RGBA PNG，2,390,066 字节，含真实透明通道与镂空。
- SHA-256：`ded26da9353092ea7a82d1a310bd9c42ab157fd60021833b1ad5d2bd78919d47`
- 用途：开场薄片的颜色及透明度贴图，实时阴影的透明度来源，以及光影实验中的影人和剪影。
- 这是原创生成的影人插画，非馆藏扫描、实地摄影或某位传承人作品的复原。游戏中原有可分关节操作的程序影人继续保留。

实际提交的完整提示词：

```text
Use case: product-mockup. Asset type: high-resolution transparent PNG hero artwork for a premium interactive Chinese shadow-puppetry culture website, portrait 2:3 composition. One exquisite ORIGINAL translucent leather Chinese shadow puppet, full body visible, standing in elegant side profile facing left, one articulated arm reaching forward and the other lowered, long slim proportions. A graceful theatrical female warrior or noble figure, NOT any existing famous character, NOT a reproduction of a museum artifact. Elaborate tall filigree headdress with two long flowing pheasant-feather-like ornaments curving upwards, traditional crimson and muted jade costume, amber leather edges, delicate hand-cut floral and cloud perforations throughout sleeves and skirt, clearly visible little circular articulated shoulder, elbow and knee joints, tiny handmade imperfections and authentic stained leather texture. A slender dark wooden control rod may be visible below the torso, but no hands holding it. Sophisticated antique vermilion, deep cinnabar red, faded sage green and translucent honey-gold leather, intricate crisp detail. Warm light passing THROUGH the leather reveals its translucency, soft neutral studio fill, realistic front texture; subtle three-quarter thickness but overall a thin articulated flat puppet, not a solid human figurine. Center the entire figure with generous transparent breathing room on all sides, headdress and both shoes fully inside frame. Beautiful museum-object photography lighting and tactile material quality. Pure transparent alpha background including every cut-out perforation. No background, no floor, no frame, no scenery, no cast-shadow rectangle, no text, no logo, no watermark, no human model, no 3D plastic cartoon look. The image is an original illustrative digital creation for cultural storytelling, not a historical documentation photograph.
```

## 实现与响应

- 开场使用 Three.js 薄片平面、背面边层及带 alpha 的深度材质，实时计算灯光投影；纹理只在加载时上传，不逐帧重新生成图像。画布像素比例上限为 1.6。
- 页面保留浏览器原生滚轮和触摸滚动；章节进度只用于同步画面，不接管滚动速度。工艺区通过 sticky 画布保持影人连续。
- 光影实验使用 Canvas 2D，预先缓存剪影，只在光点变化、尺寸变化或平滑移动时重绘。触摸只有抓住光点才阻止页面滚动，方向键也可移动。
- 开场与游戏不在屏幕可见范围时暂停渲染；浏览器后台暂停绘制。进入游戏时也暂停开场，降低同时渲染的负担。
- 手机改为上下构图；段落高度随内容增长，游戏预览允许正常触摸滚页。进入游戏后才采用全屏操作布局。
- 系统“减少动态效果”模式关闭待机浮动、鼠标轻摆、磁性链接和内容入场过渡；保留用户主动的章节滚动与光点、物体操作。

当前回归以 `npm test` 的逻辑测试为准。
