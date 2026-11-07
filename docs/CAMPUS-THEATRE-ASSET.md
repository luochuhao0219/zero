# 校园戏棚修正

模式：内置 imagegen；透明图片生成后复制到项目，没有使用 CLI/API 备用模式。最终文件为 `assets/passage/campus-theatre.png`，原始输出保留在 `/Users/luochuhao/.codex/generated_images/01a1aef3-5aed-7ec0-acf3-b60064a4f5a7/exec-6b39e319-59aa-4232-adf6-8ebe186b462c.png`。

原开场只有孤立的发光幕布和镂花边框，缺少承托结构与地面接触。修正为完整小戏棚：绑绳将布面固定在木框上，棚顶有立柱和斜撑，裙布下接木台，石柱脚和台阶落到校园道路上。补充横向地面接触阴影，并让镜头逐渐对准略偏道路一侧的幕面。原镂花门框继续用于另一侧的夜市，游戏关卡未更改。

戏棚是一张细节透明景片，影人仍独立轻摆，穿幕开口仍由实时相机与合成遮罩驱动。它不是完整三维建筑，也不是校园实地照片。新增图片为 1536 × 1024 RGBA，保留原始 alpha，校验值见 `assets/passage/manifest.json`。

## 实际提示词

transparent_background: true

```text
Use case: photorealistic-natural.
Asset type: landscape 3:2 transparent PNG cutout for a cinematic 2.5D campus website. A complete small freestanding Chinese shadow-puppet theatre booth, naturally built from real wood and fabric, photographed straight-on from an adult's eye height, very slight view onto the two low front steps. The booth is a plausible portable cultural-event theatre placed outdoors, NOT a floating decorative picture frame.
Subject: four sturdy aged wooden posts actually connected to a low broad timber platform; two shallow, worn wood-and-stone steps descend to the ground in front. A gently sloping muted moss-brown canvas canopy is visibly supported by crossbeams and diagonal braces. Natural canopy sag, cloth seams, detailed wood joinery, worn grain. Under this roof, a rectangular glowing ivory shadow-play fabric screen is tautly LACED to a simple reddish-brown wooden inner frame, with visible small cloth ties along its sides. Thin restrained floral carving on the side uprights. The cloth screen is BLANK and evenly amber-backlit with fine weave and soft peripheral wrinkles, no puppet printed on it. The luminous rectangle occupies approximately the center 48 percent of image width and 43 percent of image height, centered horizontally and around y 48 percent. Dark burgundy fabric skirts cover the area BELOW the screen down to the timber deck, so there is no floating gap. A small warm practical lantern hangs under each outer canopy corner, realistic warm light spilling onto the wooden posts and steps.
Lighting: quiet BLUE HOUR, soft cool blue ambient fill on canopy and exterior timber, warm amber screen and lanterns. All wood retains rich visible midtone detail, NO solid black silhouettes. Match a realistic damp wooded Chinese university campus in evening light. Extremely convincing material detail and subtle weathering, film-production prop photography, no cartoon rendering, no simple block geometry.
Composition: entire roof, posts, platform, steps and feet fully visible, symmetric frontal view; booth fills most of the image with a modest truly transparent margin. Bottom edge of the booth has a subtle realistic SEMITRANSPARENT soft contact shadow extending outward on an invisible ground plane, suitable for compositing onto a photographed stone path. Actual alpha transparency outside the entire booth and between open structural members. No background, no sky, no trees, no campus buildings, no backdrop rectangle, no opaque floor patch, no checkerboard pattern. No text, no logos, no characters, no mannequins, no watermark. A real construction that feels firmly grounded, welcoming, modest and lived-in; not a palace gate, not an ornate fantasy portal.
```
