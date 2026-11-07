# 0.7 穿幕之旅

网站改为一段可以向前穿行、也可以沿原路退回的连续旅程：珞珈夜路 → 发光影幕 → 镂空里的另一片天地 → 江汉灯市 → 接过手杆进入三关游戏。

0.7.1 更新：校园入口的悬空幕框已换为有绑绳、立柱、棚顶、台阶和地面阴影的小戏棚。幕面位置和镜头路径同步调整，生成素材记录见 `CAMPUS-THEATRE-ASSET.md`。下方三张原始素材保留，镂花门框仍用于夜市。

原有 0.6 代码入口和介绍文件保存在 docs/versions/0.6/，此前贴图继续保留。文化依据仍使用中国非遗网与 UNESCO，校园、门框和夜市都是艺术化数字场景，没有标注为历史照片、校园实景摄影或馆藏复原。

## 空间与输入

- 原生滚动提供行进距离；鼠标带来小幅视差环顾，向上滚动会退回之前的位置。顶部章节也能直达，右上角“去玩”仍可跳过旅程。
- 两个轻量 Three.js 场景分别呈现校园和夜市，通过与校园镜头位置同步的云形镂空遮罩连接。在穿幕前后只绘制当前世界，过渡期间才同时渲染两侧。
- 真实相机沿 Z 轴移动；不同深度的树叶、镂花门框、摊位、观众和灯笼产生不同速度的透视变化。使用图片景片，未将其表述为完整高精三维建筑或人物。
- 街巷远景使用环形贴图，摊位和观众使用原有透明图集的独立 UV 区域；灯笼使用实例化几何，减少重复绘制调用。蒸汽、光点和轻摆保持克制。
- 到达后接回原来的完整游戏。进入游戏暂停旅程渲染并让介绍退出焦点顺序，退出游戏回到“入戏”段落。页面隐藏及旅程不在视口时暂停旅程绘制。
- 手机使用正常触摸滚页。减少动态效果模式关闭鼠标摆动与待机动画，镜头只随用户主动滚动更新。
- 声音默认关闭。用户开启后，原创 Web Audio 合成的风声、细碎环境声与轻柔泛音随旅程交叉变化，没有使用唱段或真人声录音。

## 新图像资产

模式：内置 imagegen。图片生成后复制到项目 assets/passage/，原始输出保留。分辨率、alpha 与校验值见 assets/passage/manifest.json。

- assets/passage/luojia-dusk.png：校园夜路，1536 × 1024。
- assets/passage/shadow-gate.png：真实透明的镂花影幕门框，1536 × 1024。
- assets/passage/camphor-foreground.png：真实透明的近景樟树枝叶，1536 × 1024。

## 实际生成提示词

### 珞珈夜路

transparent_background: false

```text
Create a cinematic environment background asset for an interactive cultural website, landscape 3:2 composition, high fidelity atmospheric photorealistic game environment matte painting. First-person eye-height view walking along a Wuhan University-inspired wooded campus path at BLUE HOUR just after sunset. A dignified historic Republican-era Chinese university building with pale stone walls and muted dark-green glazed roof is visible far in the upper middle background above a gentle flight of stairs; this is an ORIGINAL FICTIONAL campus interpretation, not a real location photograph. Strong one-point perspective: a broad worn gray stone path starts across the entire bottom foreground and narrows toward a softly glowing quiet rectangular theatrical paper screen far away at the central vanishing point, positioned at about x 53%, y 56%. Rows of mature camphor trees and arching branches naturally frame both sides, with dark textured trunks close to the left and right image edges. A few tiny distant contemporary student silhouettes on the path, very small, subtle. Practical warm amber lamps beside the path, cool indigo and smoky teal shadows, blue twilight sky between leaves, faint ground mist and realistic moist stone reflections. A few fallen leaves, moss at the stone edges, lived-in campus atmosphere. Avoid making the setting a grand palace or fantasy temple. Sophisticated restrained film color grade, tangible stone and bark textures, luminous warm light in the depth, shadow detail retained. Crisp believable architectural and botanical detail, realistic depth, no oversharpening. The center of the image must remain an unobstructed path leading forward; put foreground foliage mainly along the left, right and upper borders. No close-up characters, no dominant giant lanterns, no modern cars, no readable lettering, no caption, no logo, no watermark, no UI, no border. The image fills the entire canvas edge to edge.
```

### 镂花门框

transparent_background: true

```text
Use case: stylized-concept. Asset type: transparent RGBA PNG, landscape 3:2, an original cinematic environment foreground asset for a walk-through Chinese shadow-puppetry website. A single exquisite antique Chinese shadow-theatre proscenium portal, viewed straight-on with accurate symmetric frontal proportions, warm weathered dark red hardwood, fine pierced cloud-scroll and floral carving with faded brass-gold edging, very tactile aged grain and hand-carved details. Two substantial vertical carved side pillars support an elegant curved lintel; small muted crimson fabric drapes hang on the far left and far right. The center is a large COMPLETELY EMPTY TRANSPARENT opening occupying roughly 60 percent of the width and 72 percent of the height, shaped as a tall rounded cloud arch, wide enough to walk through. The lowest center is open to the bottom edge so the viewer can walk forward. Ornamental cloud and floral tracery curls a little into the upper and side edges of the opening, with many delicate genuine transparent perforations. The frame itself stays fully within the image, with a narrow transparent margin on the outside. Realistic material photography / high-end game asset quality, calm warm amber rim light from behind and gentle cool blue frontal fill. No scene seen through the hole, no wall, no floor, no landscape, no rectangular colored backdrop, no checkered pattern, no paper filling the opening, no characters, no text, no signboard, no logo, no watermark. Both the central opening and outer background must be truly transparent alpha. Delicate historic atmosphere, refined proportions, not a fantasy dragon gate, not a 3D plastic cartoon. This is an original digital artistic design, not a reproduction of an existing artifact.
```

### 近景枝叶

transparent_background: true

```text
Use case: photorealistic-natural. Asset type: TRANSPARENT PNG foreground foliage layer for a cinematic first-person walk through a wooded Chinese university campus at blue hour. Landscape 3:2. Photograph-like cutout of real mature camphor tree branches framing ONLY the TOP and the two EXTREME SIDE borders. At the far left a partial textured dark tree trunk hugs the left edge, at the far right another very narrow dark trunk; natural thin branching limbs arch inward across the top 18 percent with small organically clustered glossy camphor leaves, some warm olive leaf tips. Very sparse lower side leaves. The ENTIRE center and entire bottom 65 percent of the canvas are a completely empty transparent opening. Leave at least the central 70 percent width unobstructed below the canopy. Realistic bark texture, delicate leaf silhouettes and natural irregular branching, subtle cool moon-blue rim light and faint amber lamplight, low-key exposure, very detailed believable photographic cutout, soft natural leaf transparency. No cartoon leaves, no vector shapes, no repetitive elliptical leaf pattern, no painted black strokes. No ground, no sky, no campus, no buildings, no text, no border, no watermark. Actual transparent alpha background throughout the opening and all gaps between leaves; no opaque glow or matte backdrop. All foliage belongs to one contiguous upper-edge framing composition with a very generous empty middle.
```

