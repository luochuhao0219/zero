# 夜市氛围贴图 — 0.5

2026-11-06，按用户提出的“用贴图增加烟火气”制作。使用内置 **imagegen** 工具生成，未使用 CLI/API 回退。以下 PNG 原图均已复制到项目内，运行时不依赖外部图片服务。场景是艺术化的珞珈山下夜市意象，不是武汉大学校园或某条历史街巷的实景记录；不使用《黑神话：悟空》的素材。

| 文件（相对项目根目录） | 用途 |
| --- | --- |
| `assets/atmosphere/night-market-panorama.png` | 店铺、夜食摊与街坊组成的环形远景；底部透明渐变在着色器中与实际石板地面衔接 |
| `assets/atmosphere/stall-neighbors-atlas.png` | 带 alpha 的蒸笼摊和茶桌两组景片，分布在戏台两侧；通过 UV 分区取图，未另行裁切原文件 |
| `assets/atmosphere/spectators-atlas.png` | 带 alpha 的四个背向观众，作为六位近景观众；UV 取图并保留各自完整身体与凳子 |

接入代码为 `src/neighborhood.js`。贴图只在加载时上传，人物轻摆、灯笼摇动与蒸汽升腾均在运行中独立更新，不逐帧重画图片。观众是环境布景，点选和判定仍由原有游戏物体负责。减少动态效果模式下，环境动画固定，鼠标及触摸操作保留。离镜头过近的灯笼平滑隐去，避免竖屏时遮住说明。

灯笼、柔光和蒸汽的简单遮罩由代码绘制，不是额外下载的素材。地面材质来源见 `MATERIAL-SOURCES.md`。新增 PNG 体积及校验值列于同目录下的 `../assets/atmosphere/manifest.json`。

## 完整生成提示词

### 夜市全景

`transparent_background: false`

```text
Use case: historical-scene. Asset type: game environment panoramic matte-painting texture, landscape 3:1 ultrawide, high resolution. Create a photorealistic, cinematic but welcoming Chinese neighborhood night-market courtyard in Wuhan, inspired by the everyday lanes below Luojia Hill, NOT a specific documented historic reconstruction. The viewpoint is standing in the middle of an open stone-paved square looking straight across at a long continuous street frontage, lens level, very wide panoramic elevation, no strong central vanishing point. Warm lived-in evening atmosphere: varied weathered timber and grey plaster storefronts with uneven tiled roofs, glowing open noodle and tea shops, small canvas food stalls, bamboo steamers with delicate steam, red paper lanterns and warm bare bulbs hanging in loose irregular strings, pedestrians and vendors in understated everyday clothes gathered at the far shops, a few bicycles and stools. The main building row spans the lower-middle half across the full width, buildings same apparent distance left to right. Keep the upper 35% nearly empty, gently graduated very dark blue-green night sky, subtle haze, no moon. Keep the bottom 18% largely empty dark warm-grey paving with soft amber reflections, no large foreground objects or people. Rough, tactile, slightly imperfect details, believable natural light, nuanced shadow; rich amber highlights with dark teal ambient shade. Wide setting, distant small anonymous people, detailed shop life rather than monumental architecture. No stage, no theater curtain, no gate arch in the middle, no central hero, no visible readable lettering, no legible signs, no watermark, no UI, no border. The left and right edges should have similar continuous night sky and street elevation for subtle panoramic wrapping. Not fantasy, not futuristic, not theme-park red-and-gold overload, not illustration, not cartoon.
```

### 蒸笼摊与茶桌

`transparent_background: true`

```text
Use case: photorealistic-natural. Asset type: transparent PNG game billboard texture, landscape 3:2. Two isolated small groupings on a completely transparent alpha background, separated by a generous empty transparent vertical gap; each group entirely inside its half with a clear transparent margin. At left, a rustic wooden night-market steamed-bun stall, compact worn wooden counter with round bamboo steamers, chipped kettle, muted beige canvas canopy, one small warm red paper lantern at its upper left, a middle-aged Chinese vendor partly seen behind it and one customer at the side, three-quarter front view. At right, a small open-air tea table with three Chinese neighbors sitting on worn wooden stools, a thermos and tea cups, one person leaning forward in conversation and one standing beside them holding a bowl, three-quarter front view. Warm amber light from above and from the left, deep muted blue-green shadows, realistic weathered wood and woven cloth, modest everyday dark earth-tone clothing, candid small-town evening atmosphere, detailed and anatomically plausible faces/hands at natural distance, no posing for camera. Perspective camera height around 2 meters, both groupings same approximate scale. Ground contact visible but NO rectangular floor patch, NO landscape, NO sky, NO background, NO opaque halo, NO cast shadow rectangle. All bodies, feet, canopy and props fully visible and uncropped. High detail photographic texture suitable for mapping onto two small planes in a 3D scene. No readable text, signs, watermark, labels or UI. No large plumes of static steam; steam is animated separately by the game.
```

### 看戏的观众

`transparent_background: true`

```text
Use case: photorealistic-natural. Asset type: transparent PNG atlas of four separate background spectators for a Chinese night-market shadow-play game, landscape 3:2. Four equally spaced columns, separated by generous completely transparent gaps, exactly one isolated person per column, no labels. All people are seen FROM BEHIND or a very slight rear three-quarter angle, watching a performance away from the camera. Left to right: (1) elderly Chinese man in a charcoal jacket seated on a low wooden stool, (2) young Chinese woman in a muted brown coat standing with a cloth tote, (3) Chinese man in a dark blue work jacket standing, (4) Chinese school-age child in a muted ochre jacket seated on a short stool. Heads, bodies, feet and stools all fully in frame, no cropping. Preserve realistic relative height: standing adults tallest, seated man shorter, seated child shortest; align all feet/stool bases on the same baseline near the bottom of the canvas. Relaxed natural poses, slight variation in shoulders and head angles. Nearly silhouetted soft dark clothing with subtle warm amber rim light from the performance in front of them and slight cool night fill. Photorealistic textured fabric and plausible anatomy; no detailed visible faces, no theatrical costumes, no weapons, no fantasy. Completely transparent alpha background, including between arms, legs and stool legs. No landscape, no sky, no floor patch, no rectangular backdrop, no opaque glow or fog, no cast shadow rectangle, no watermark, no text.
```
