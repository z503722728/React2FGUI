# React2FGUI 🚀

> **A powerful tool to convert Figma-exported React (Inline Styles or Styled Components) directly into FairyGUI project packages.**

This tool automates the bridge between UI designers (Figma) and game developers (FairyGUI), bypassing manual renaming or PSD middle-man files.

## 🎯 Project Goal
Enable a "One-Click" workflow from Figma design to a fully functional FairyGUI `.fui` package.

## 🛠️ Prerequisites

This tool relies on the **Figma to Code (AI Export)** plugin to generate the source data.

1.  **Figma Plugin**: [Figma to Code (AI Export)](https://www.figma.com/community/plugin/1590340205277776745/figma-to-code-ai-export)
2.  **Export Configuration**: 
    To ensure compatible output, please use the following settings in the plugin:
    *   **Format**: `React (JSX)`
    *   **Styling Options**: 
        *   [x] Layer names
        *   [x] Color Variables
        *   [x] Embed Images
        *   [x] Embed Vectors

![Figma Export Configuration](./docs/img/figma_config.png)

## 🏗️ Architecture

1. **Parser (V2)**: Advanced semantic parser that supports both `styled-components` and standard React `style={{...}}` objects. It maintains a parent-stack to correctly calculate absolute coordinates for nested elements.
2. **Mapper**: Automatically maps React component semantics and CSS properties to FGUI elements and attributes:
    *   `button` / `Button` -> `GButton`
    *   `span` / Text content -> `GTextField`
    *   `div` / Containers -> `GGraph` (Rect) or `GComponent`
    *   `img` / `svg` -> `GImage` (with automatic Base64 extraction)
3. **Generator**: Produces FGUI-compatible `package.xml` and component `.xml` files, including automatic sub-component generation for buttons.

## 🚀 Usage

```bash
# Install dependencies
npm install

# Link the CLI tool (optional)
npm link

# Run conversion
# Syntax: node bin/cli.js <reactFile> <outPath> <packName> <mainComponentName>
node bin/cli.js .\Input\input.tsx .\Uproject\FGUIProject\assets TestCom Test
```

**Note**: The `bin/cli.js` entry point will automatically check for changes in `src/` and rebuild the project using `tsc` if necessary.

## 🎯 Features
- [x] **Absolute Positioning**: Accurate mapping of `left`, `top`, `width`, and `height` with hierarchy support.
- [x] **Smart Semantics**: Automatic detection of Buttons and Input fields.
- [x] **Base64 Image Extraction**: Automatically converts embedded Base64 strings into physical `.png` or `.svg` files.
- [x] **Automatic Rebuild**: The CLI tool auto-detects source changes and recompiles.
- [x] **Unique Naming**: Ensures all components in the FGUI display list have unique names.
- [x] **Sub-Component Generation**: Automatically creates separate `.xml` files for UI components like Buttons.

## 📄 Documentation & Rules
Detailed mapping rules can be found in [libs/FGUI_MAPPING_RULES.md](./libs/FGUI_MAPPING_RULES.md).

## 📄 License
MIT
