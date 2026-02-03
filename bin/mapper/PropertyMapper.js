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
            case FGUIEnum_1.ObjectType.Graph:
                this.mapGraphProperties(node, attr);
                break;
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
        attr.fillColor = this.formatColor(s.background || s.backgroundColor || "#cccccc");
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
            const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (matches) {
                const r = parseInt(matches[1]).toString(16).padStart(2, '0');
                const g = parseInt(matches[2]).toString(16).padStart(2, '0');
                const b = parseInt(matches[3]).toString(16).padStart(2, '0');
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
