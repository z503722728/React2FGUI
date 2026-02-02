# React2FGUI 🚀

> **A tool to convert Figma-exported React (Styled Components) directly into FairyGUI project packages.**

Inspired by `psd2fgui`, this tool bypasses the need for manual renaming and PSD middle-man files. It parses absolute-positioned React code and maps it to FGUI components.

## 🏗️ Architecture

1. **Parser**: Analyzes React/Styled-Components code to extract nodes, styles, and hierarchy.
2. **Mapper**: Maps CSS/HTML semantics to FGUI XML elements (`GButton`, `GTextField`, `GGraph`, etc.).
3. **Generator**: Produces FGUI-compatible `package.xml` and component `.xml` files.

## 🛠️ Usage (Planned)

```bash
node react2fgui.js input.tsx --out ./MyFguiProject
```

## 🎯 Target Support
- [ ] Absolute coordinate mapping
- [ ] Text styles (font, color, alignment)
- [ ] Rect/Shape mapping to GGraph
- [ ] Button/Input semantic detection based on Styled Component names
- [ ] Image/SVG extraction
