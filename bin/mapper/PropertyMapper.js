"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyMapper = void 0;
const FGUIEnum_1 = require("../models/FGUIEnum");
/**
 * PropertyMapper: Translates CSS and React properties into FGUI-specific attributes.
 * Uses reverse-engineered rules from lib.js.
 */
class PropertyMapper {
    /**
     * Maps a UINode's raw styles and props into FGUI XML attributes.
     */
    mapAttributes(node) {
        // Log style keys for debugging if necessary
        const s = node.styles;
        const attr = {
            id: node.id,
            name: node.name,
            xy: `${node.x},${node.y}`,
            size: `${s.width || node.width},${s.height || node.height}`
        };
        // 1. Map Common Visual Properties
        if (s.opacity) {
            attr.alpha = s.opacity;
        }
        // 2. Type-specific Mapping
        switch (node.type) {
            case FGUIEnum_1.ObjectType.Text:
            case FGUIEnum_1.ObjectType.InputText:
                this.mapTextProperties(node, attr);
                break;
            case FGUIEnum_1.ObjectType.Image:
            case FGUIEnum_1.ObjectType.Loader:
                this.mapLoaderProperties(node, attr);
                break;
        }
        // 3. Map Visual Container Properties (for Graph OR Component/Group with visual styles)
        if (node.type === FGUIEnum_1.ObjectType.Graph || node.type === FGUIEnum_1.ObjectType.Component || node.type === FGUIEnum_1.ObjectType.Group) {
            this.mapGraphProperties(node, attr);
        }
        return attr;
    }
    mapTextProperties(node, attr) {
        const s = node.styles;
        attr.fontSize = s['font-size'] || s.fontSize || "12";
        attr.color = this.formatColor(s.color || "#000000");
        // Alignment mapping
        if (s['text-align'] || s.textAlign) {
            attr.align = (s['text-align'] || s.textAlign);
        }
        if (node.text) {
            attr.text = node.text;
        }
        // Vertical Alignment
        const justifyContent = s['justify-content'] || s.justifyContent;
        const alignItems = s['align-items'] || s.alignItems;
        if (justifyContent === 'center' || alignItems === 'center') {
            attr.vAlign = FGUIEnum_1.VertAlignType.middle;
        }
    }
    mapLoaderProperties(node, attr) {
        const s = node.styles;
        // FGUI Loader specific
        attr.fill = FGUIEnum_1.LoaderFillType.scaleFree.toString();
        const objectFit = s['object-fit'] || s.objectFit;
        if (objectFit === 'contain')
            attr.fill = FGUIEnum_1.LoaderFillType.scale.toString();
        else if (objectFit === 'cover')
            attr.fill = FGUIEnum_1.LoaderFillType.scaleNoBorder.toString();
    }
    mapGraphProperties(node, attr) {
        const s = node.styles;
        attr.type = "rect";
        const bgColor = s.background || s.backgroundColor;
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'none') {
            attr.fillColor = this.formatColor(bgColor);
        }
        if (s['border-radius'] || s.borderRadius) {
            attr.corner = (s['border-radius'] || s.borderRadius).toString().replace('px', '');
        }
        // 4. Map Stroke (lineSize, lineColor)
        const strokeColor = s['outline-color'] || s.outlineColor || s['border-color'] || s.borderColor;
        const strokeSize = s['outline-width'] || s.outlineWidth || s['border-width'] || s.borderWidth;
        if (strokeColor)
            attr.lineColor = this.formatColor(strokeColor);
        if (strokeSize)
            attr.lineSize = strokeSize.toString().replace('px', '');
        // Fallback to shorthand (e.g. "outline: 2px #E6E6E6 solid")
        const shorthand = s.outline || s.border;
        if (shorthand && shorthand !== 'none') {
            // Split by spaces that are NOT inside parentheses
            const parts = shorthand.toString().split(/\s+(?![^\(]*\))/g);
            if (parts) {
                parts.forEach(p => {
                    const lp = p.toLowerCase();
                    // Check for dimensions: "2px", "2.5px" or just "2" (unitless)
                    if (lp.endsWith('px') || lp.match(/^\d+(\.\d+)?$/)) {
                        const size = Math.round(parseFloat(lp)).toString();
                        if (!attr.lineSize)
                            attr.lineSize = size;
                    }
                    else if (lp.match(/^#|^rgb|^rgba|^[a-z]+$/i) && lp !== 'solid' && lp !== 'none' && lp !== 'dashed' && lp !== 'dotted') {
                        const color = this.formatColor(p);
                        if (color.startsWith('#') && color.length > 1 && !attr.lineColor) {
                            attr.lineColor = color;
                        }
                    }
                });
            }
        }
    }
    /**
     * Converts CSS colors (rgba, hex, name) to FGUI compatible hex.
     */
    formatColor(color) {
        if (!color)
            return "#000000";
        color = color.trim().toLowerCase();
        const namedColors = {
            black: "#000000",
            white: "#FFFFFF",
            red: "#FF0000",
            green: "#00FF00",
            blue: "#0000FF",
            gray: "#808080",
            grey: "#808080",
            yellow: "#FFFF00",
            cyan: "#00FFFF",
            magenta: "#FF00FF",
            silver: "#C0C0C0",
            maroon: "#800000",
            olive: "#808000",
            lime: "#00FF00",
            purple: "#800080",
            teal: "#008080",
            navy: "#000080",
            orange: "#FFA500",
            transparent: "#00000000"
        };
        if (namedColors[color]) {
            return namedColors[color];
        }
        // Hex short expansion #RGB -> #RRGGBB
        if (color.startsWith('#')) {
            if (color.length === 4) {
                const r = color[1];
                const g = color[2];
                const b = color[3];
                return `#${r}${r}${g}${g}${b}${b}`;
            }
            return color; // Return as is if already #RRGGBB or #AARRGGBB
        }
        if (color.startsWith('rgba')) {
            const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)/);
            if (matches) {
                const r = parseInt(matches[1]).toString(16).padStart(2, '0');
                const g = parseInt(matches[2]).toString(16).padStart(2, '0');
                const b = parseInt(matches[3]).toString(16).padStart(2, '0');
                if (matches[4]) {
                    const a = Math.round(parseFloat(matches[4]) * 255).toString(16).padStart(2, '0');
                    return `#${a}${r}${g}${b}`;
                }
                return `#${r}${g}${b}`;
            }
        }
        if (color.startsWith('rgb')) {
            const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (matches) {
                const r = parseInt(matches[1]).toString(16).padStart(2, '0');
                const g = parseInt(matches[2]).toString(16).padStart(2, '0');
                const b = parseInt(matches[3]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }
        }
        // Default fallback if parsing fails but it's not empty
        return color;
    }
}
exports.PropertyMapper = PropertyMapper;
