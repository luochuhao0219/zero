# 三维材质来源

下载与核验日期：2026-11-06。素材来自 [Poly Haven](https://polyhaven.com/) 官方文件服务。已核查其 [资产许可说明](https://polyhaven.com/license)：这些贴图按 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 提供，可用于商业项目、修改及随项目分发。这里保留作者与原始链接，供后续参赛资料与素材声明使用。

网站运行只读取项目本地文件，不调用 Poly Haven API。开发时使用其公开 API 定位原始下载；Powered by Poly Haven。

## 文件

| 目录 | 官方素材及作者 | Color / Normal GL / Roughness | 原始覆盖面积 |
| --- | --- | --- | --- |
| `assets/materials/wood/` | [Wood Table Worn](https://polyhaven.com/a/wood_table_worn)，Dimitrios Savva（摄影）、Rico Cilliers（处理） | 2048² / 2048² / 1024² | 约 0.55 × 0.55 米 |
| `assets/materials/stone/` | [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor)，Amal Kumar | 2048² / 2048² / 2048² | 约 1.8 × 1.8 米 |
| `assets/materials/linen/` | [Rough Linen](https://polyhaven.com/a/rough_linen)，colormass（摄影）、Rico Cilliers（处理） | 均为 1024 × 1026 | 约 0.271 × 0.271 米 |

每个目录中三个文件依次命名为 `color.jpg`、`normal.jpg`、`roughness.jpg`。均为官方 JPEG 原文件，只更改了项目内文件名，没有重编码。九张图共 18,757,169 字节（约 17.89 MiB）。木材粗糙度采用 1K 以减少下载量，其他分辨率如表所示。

精确下载 URL、官方 MD5、下载文件 SHA-256、分辨率、作者和原始尺寸保存在 [`assets/materials/manifest.json`](../assets/materials/manifest.json)。所有文件 MD5 与官方文件清单相同；已解码检查尺寸并查看颜色贴图。

## Three.js 使用说明

- `color.jpg` 是基色，使用 `THREE.SRGBColorSpace`；`normal.jpg` 与 `roughness.jpg` 是数据，保持 `THREE.NoColorSpace`。法线采用 OpenGL 的 +Y 约定，通常不需要把 `normalScale.y` 取负。
- 三张贴图保持相同的 UV 旋转、缩放与偏移，设置 `RepeatWrapping`；远处重复纹理使用 mipmaps，并给可用设备设置 4～8 的 anisotropy。
- 木材颜色本来较深、偏棕红，RGB 均值约为 (83, 47, 21)。材质 tint 宜接近白色，避免再乘很暗的棕色而丢失木纹。木纹在图片中主要沿横向，可按木梁/木板的长轴旋转 UV。起点可用 `normalScale = (0.5, 0.5)`、`roughness = 0.85`，再按场景灯光调整。
- 石板以每 1.8 米重复一次为物理参考；18 米地面可从 `(10, 10)` 开始。原始图描述的是旧石板，不是水面。湿润区域可将粗糙度乘数降至约 0.25～0.45，结合环境反射和局部 clearcoat；不要用金属度模拟石头反光。
- 麻布颜色是浅蓝色。用于红色帷幕时可以只使用 `normal.jpg` 和 `roughness.jpg`，由材质的红色控制底色；不要直接用蓝色基色乘红色而得到暗紫。单片约 1 × 6 米帷幕可从 `(3, 16)` 重复与 `normalScale = (0.18, 0.18)` 开始；过高重复会在远景产生摩尔纹，应结合实际相机距离调整。
- 法线像素通常围绕 R/G≈128、B≈255；这些是切线空间法线，不能作为凹凸高度图。灰度粗糙度中白色更粗糙、黑色更光滑。

上述材质参数为本项目的接入建议，不是原作者提供的固定渲染参数。贴图只承担表面细节，物体轮廓、接触阴影、打光和景深仍需要场景本身实现。

## 内厅图像场景（当前版本，2026-11-08）

按用户反馈，内厅和展馆的建筑背景改为参考开场老房子制作的完整图像场景。以下五张图由内置 ImageGen 生成，是校园主题数字再创作，不是校园实拍照片，也不是历史场所复原。生成时参考项目现有 `campus-entrance.png`、`interior-gallery.png`；开场原图不变。

| 本地文件 | 实际尺寸 | 用途 |
| --- | --- | --- |
| `assets/interior/hall-photo.jpg` | 1672 × 941 | 宽屏双门内厅 |
| `assets/interior/hall-portrait.jpg` | 1030 × 1526 | 窄屏双门内厅，保留两个完整入口 |
| `assets/interior/workshop-photo.jpg` | 1672 × 941 | 上一版麻布展面，保留但不再加载 |
| `assets/interior/workshop-portrait.jpg` | 1024 × 1536 | 上一版窄屏工坊，保留但不再加载 |
| `assets/interior/theater-photo.jpg` | 1672 × 941 | 进入右廊游戏时的戏幕过渡 |

保留生成图原始像素尺寸，只转为质量 95 的 JPEG，五张合计约 3.6 MB；没有把放大插值标为原生 4K。完整提示词、参考关系和生成文件名见 [`assets/interior/generation-notes.json`](../assets/interior/generation-notes.json)。

本次新增 [`assets/interior/cabinets/corridor.png`](../assets/interior/cabinets/corridor.png)：原生 1672 × 941 PNG，约 2.9 MB。由内置 `image_gen.imagegen` 参考 `hall-photo.jpg` 生成，保持左门内的石廊、木玻璃展柜与灯光风格。五个展柜对应五部分讲解。图像是主题数字陈列，不是传统实物照片；完整提示词、原始输出和使用范围见 [`generation-notes.json`](../assets/interior/cabinets/generation-notes.json)。

`MuseumBackdrop` 将同一取景裁切用于建筑图像与柜号定位，沿同一长廊平滑移向各柜；每柜有固定主题和独立展签。进入左门先停在长廊全览，保留前后浏览与返回内厅。图像已包含光影，不再叠加旧模型的二次 HDR 调色或全屏模糊。自由编戏位于留影册独立窗口，右廊游戏保留原有实时互动。

左馆内容结构、资料范围与作品存储兼容说明见 [`MUSEUM-CONTENT.md`](MUSEUM-CONTENT.md)。

旧建筑建模文件和扫描贴图保留供回溯，当前内厅不再实例化 `MuseumArchitecture`，也不再加载其约 74 MB 的扫描图。下两节描述上一版建模方案，不代表当前内厅画面。

## 上一版内厅实拍表面（保留素材）

上一版内厅、门廊与展廊使用以下 Poly Haven 实拍材质。灰泥、砌石的基色与 OpenGL 法线为原生 4K；木纹为 2K；粗糙度和环境遮蔽为 1K，石墙还使用 1K 高度图。全部是官方原始 JPEG，未重新编码。

| 本地目录 | 官方素材及作者 | 当前用途 |
| --- | --- | --- |
| `assets/materials/aged-plaster/` | [Plastered Stone Wall](https://polyhaven.com/a/plastered_stone_wall)，Rob Tuytel | 旧灰泥墙、石拱和柱面，保留颗粒、剥蚀和细小凹陷 |
| `assets/materials/aged-masonry/` | [Stone Block Wall](https://polyhaven.com/a/stone_block_wall)，Amal Kumar | 门厅砌石与磨旧石板，保留不齐的接缝、边缘与粗糙度变化 |
| `assets/materials/aged-wood/` | [Fine Grained Wood](https://polyhaven.com/a/fine_grained_wood)，Rob Tuytel | 木门、嵌板、窗格与梁柱；木纹沿构件长轴铺设 |

上述素材均为 [CC0 1.0](https://polyhaven.com/license)。初始 14 张下载文件共 20,387,826 字节，另补充四张官方原生 4K 基色/法线，共 54,054,782 字节；逐张与官方 MD5 核对，下载 URL、SHA-256、分辨率、作者与实拍尺寸保存在 [`assets/materials/interior-scan-manifest.json`](../assets/materials/interior-scan-manifest.json)。灰泥高度图保留在素材集中，当前运行使用其法线，不增加墙面细分。网站仅加载本地文件，不在运行时请求 Poly Haven。

[`src/museum-finishes.js`](../src/museum-finishes.js) 在材质着色阶段降低石材基色的棕色饱和度、校准反射率，并保留墙脚较暗的旧痕；没有把光照烘进基色。木门用实体边框、后退嵌板、细缝、微弯门板和透明玻璃表现层次；石墙正面使用小幅真实位移。所有静态细节仍按房间和材质合并绘制。

灯具采用独立磨砂灯片与贴合边缘的铁框。室内保留窗外冷光与局部暖灯，降低强直射光和均匀发光；地面使用粗糙度控制的环境反射，移除需要重复渲染整个房间的低分辨率平面镜面反射。不加入全屏模糊、景深或泛光。高密度屏幕最高 2 倍渲染，总像素预算由 360 万提高到 640 万；首先减少多重采样，再逐级减轻阴影与分辨率负担。建筑阴影图提高到 4096²，并沿用按区域缓存的更新方式。

先前生成的 `assets/materials/plaster/color.png` 与其生成记录保留供回溯，当前内厅不再加载。它是 ImageGen 生成的灰泥贴图，不是校园实拍，也不属于 Poly Haven CC0 素材。开场老房子的原图保持原样。

## 上一版色彩与近景精修（回溯说明）

室内采用青灰石面、棕红旧漆、墨绿窗格和暖金灯光。门厅和首段展廊各增加固定的格窗投光，光照直接作用于石材法线，与暖灯形成局部冷暖对照；不会随相机移动重新定位。漆木沿用实拍木纹的法线和粗糙度，着色时按纹理明暗混合旧漆与露出的木质；石材去色仅作用于实拍基色，不再同时抹掉材质自身的冷暖色调。局部朱红、墨绿和旧金线脚保留原建筑尺度，开场建筑图不变。

门内的全屏阅读暗罩随步入淡出；所有室内视角共用同一套高光/暗部调色，以保持进门连续性。门牌绘制为 2048 × 560，展板按 2 倍像素绘制，等待中文字体加载后重绘，并开启各向异性过滤。门厅选择卡与展馆说明面板取消背景模糊。右侧房间替换为实体墙面、梁柱、织物褶皱和局部灯光，走近不再放大室内背景照片。
