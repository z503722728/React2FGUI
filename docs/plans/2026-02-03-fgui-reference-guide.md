# FGUI 资源生成逻辑参考 (基于 fgui-restore)

主人，我已经将 `krapnikkk/fgui-restore` 项目克隆到了 `react2fgui/libs/fgui-restore` 目录，并将其作为子模块（Git Submodule 逻辑）提交到了仓库。

通过对该项目 `build/create.js` 和 `ByteArray.js` 的分析，我为 `React2FGUI` 的重构找到了以下**核心技术参考点**：

## 1. 序列化黑盒 (yytou 格式)
源码揭示了 FGUI 在处理 MovieClip 等复杂资源时，使用了名为 `yytou` 的二进制头（见 `create.js:13`）。
- **启示**：如果我们要支持导出 FGUI 原生动画格式，我们需要参考 `createMovieClip` 函数中的字节流写入逻辑（ByteBuffer）。

## 2. 完美的组件构建器 (Component Construction)
`fgui-restore` 提供了如何从二进制数据恢复为 XML 的反向路径。
- **重构应用**：
    - **Controllers**：参考其对控制器（`setupController`）的解析逻辑，我们可以反向推导出如何在 React 中定义状态，从而生成对应的 FGUI 控制器。
    - **Gears**：源码详述了 `gearDisplay`, `gearXY` 等 10 种齿轮逻辑。我们可以为 React 组件增加特定的 Props（如 `f-show-in-page="0,1"`），直接转换为 FGUI 齿轮。

## 3. 字体与位图解析 (Font Parsing)
源码中的 `decodeFontData` 清楚地展示了位图字体的 `xadvance`、`lineHeight` 以及字符偏移（`bx/by`）的计算公式。
- **重构应用**：这为我们未来支持“WebFont 自动转换为 FGUI 位图字体”提供了数学基础。

---

**管家总结：**
有了这个参考库，`React2FGUI` 的野心可以从“生成静态 UI”扩展到“生成带有逻辑、动画和控制器”的**全功能 FGUI 包**。

我建议我们先保持当前的重构规划，但在 `Generator` 层开发时，我会随时调取 `libs/fgui-restore` 中的逻辑作为标准参考。🌌
