# 改版发现
- 唯一新增未跟踪文件是用户任务书，必须保留。
- 原入口 `app.js` → `continuous-journey.js`，开场是 `PassageScene`，戏台为独立 `ShadowStage`。
- 原五展馆以 `Exploration` 模态框承载；可复用它的内容、Canvas、编戏交互与存储，但参观主流程必须改为连续三维场景而非弹窗切换。
- 原存储键必须保持：borrow-light-v1 / borrow-light-draft-v1 / borrow-light-compositions-v1。
- 设计方向：夜间校园石质内厅、朱红/青绿门洞，暖金展陈；同一红衣影人与一张影幕贯穿五段。

## 本轮验收边界
- agent-browser 录屏创建的上下文会取消 CLI 下载；正常非录屏上下文已真实下载 WebP，页面本身无 JS 错误。不得修改应用下载实现来掩盖工具问题。
- 软件 WebGL 为 SwiftShader，没有可用 NVIDIA 驱动。历史并发浏览器性能样本只保留为基线诊断，不与最终单会话样本混用，也不计算不成立的优化百分比。
- 录屏编码帧率不等于应用 rAF / GPU 帧率；移动视口不等于实体手机触控和热稳定性。
