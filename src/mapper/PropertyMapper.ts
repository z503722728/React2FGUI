import { ObjectType, LoaderFillType, AlignType, VertAlignType } from "../models/FGUIEnum";
import { UINode } from "../models/UINode";

/**
 * PropertyMapper: Translates CSS and React properties into FGUI-specific attributes.
 * Uses reverse-engineered rules from lib.js.
 */
export class PropertyMapper {
    /**
     * Maps a UINode's raw styles and props into FGUI XML attributes.
     */
    public mapAttributes(node: UINode): Record<string, string> {
        // Log style keys for debugging if necessary
        const s = node.styles;
        
        const attr: Record<string, string> = {
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
            case ObjectType.Text:
            case ObjectType.InputText:
                this.mapTextProperties(node, attr);
                break;
            case ObjectType.Image:
            case ObjectType.Loader:
                this.mapLoaderProperties(node, attr);
                break;
            case ObjectType.Graph:
                this.mapGraphProperties(node, attr);
                break;
        }

        return attr;
    }

    private mapTextProperties(node: UINode, attr: Record<string, string>): void {
        const s = node.styles;
        attr.fontSize = s['font-size'] || s.fontSize || "12";
        attr.color = this.formatColor(s.color || "#000000");
        
        // Alignment mapping
        if (s['text-align'] || s.textAlign) {
            attr.align = (s['text-align'] || s.textAlign) as AlignType;
        }
        
        if (node.text) {
            attr.text = node.text;
        }
    }

    private mapLoaderProperties(node: UINode, attr: Record<string, string>): void {
        const s = node.styles;
        // FGUI Loader specific
        attr.fill = LoaderFillType.scaleFree.toString(); 
        
        const objectFit = s['object-fit'] || s.objectFit;
        if (objectFit === 'contain') attr.fill = LoaderFillType.scale.toString();
        else if (objectFit === 'cover') attr.fill = LoaderFillType.scaleNoBorder.toString();
    }

    private mapGraphProperties(node: UINode, attr: Record<string, string>): void {
        const s = node.styles;
        attr.type = "rect";
        attr.fillColor = this.formatColor(s.background || s.backgroundColor || "#cccccc");
    }

    /**
     * Converts CSS colors (rgba, hex, name) to FGUI compatible hex.
     */
    private formatColor(color: string): string {
        if (!color) return "#000000";
        color = color.trim().toLowerCase();

        const namedColors: Record<string, string> = {
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
