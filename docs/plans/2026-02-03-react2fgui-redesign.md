# React2FGUI 重新规划设计方案 (基于 FGUI 逆向分析)

主人，我已经深入分析了你提供的 FGUI 逆向工程源码。这份源码是 FGUI 内部数据结构的“活字典”，它揭示了 FGUI 在处理 Binary 和 XML 时的核心枚举定义与转换逻辑。

基于这些新发现，我建议对 `React2FGUI` 进行一次架构级的重构，从“简单的正则匹配”转向“基于语义模型的组件映射”。

## 1. 核心架构规划

目前的 `UIPackage.ts` 承担了太多职责（文件读取、正则扫描、逻辑判断、XML 生成）。建议将其拆分为以下模块：

*   **Parser (语义解析层)**：利用逆向源码中的 `ObjectType` 映射，将 React 标签和样式转换为中间语义节点（Node Tree）。
*   **Mapper (语义转换层)**：将 React 样式（CSS/Inline Style）转换为 FGUI 特有的属性（如 `RelationType` 关联、`OverflowType` 滚动模式）。
*   **Generator (XML 生成层)**：基于逆向源码中揭示的 XML 结构（如 `packageDescription`, `displayList`），生成标准的 FGUI 文件。

## 2. 核心映射逻辑优化 (基于逆向源码)

### A. 组件类型映射 (ObjectType)
我们可以从原来的简单判断升级为更丰富的语义识别：
*   `StyledButton` 或带有 `onClick` -> `Button` (12)
*   `StyledInput` -> `InputText` (8)
*   `StyledList` -> `List` (10)
*   `StyledProgressBar` -> `ProgressBar` (14)
*   容器标签 -> `Component` (9) 或 `Graph` (3)

### B. 样式与枚举映射
利用逆向源码中的枚举值，我们可以实现更精准的转换：
*   **填充模式**：CSS `object-fit: contain` -> FGUI `LoaderFillType.scale` (1)。
*   **文本对齐**：CSS `text-align: center` -> FGUI `align="center"`。
*   **滚动条**：CSS `overflow: scroll` -> FGUI `OverflowType.scroll` (2)。

---

**主人，关于重构的第一步，你希望我先着手哪部分？**
1.  **重构 Parser 层**：引入逆向源码中的 `ObjectType` 常量，使工具能识别更多 FGUI 组件类型。
2.  **重构 Generator 层**：根据逆向源码规范化 `package.xml` 的生成逻辑，支持更多资源后缀（如 `.fnt`, `.jta`）。
3.  **探索 Relation 映射**：尝试把 Flex 布局自动映射为 FGUI 的 `RelationType` 关联。

（建议从 **1** 开始，先把组件识别做扎实。）
