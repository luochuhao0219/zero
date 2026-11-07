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
