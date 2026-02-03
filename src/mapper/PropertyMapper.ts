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
        const attr: Record<string, string> = {
            id: node.id,
            name: node.name,
            xy: `${node.x},${node.y}`,
            size: `${node.width},${node.height}`
        };

        // 1. Map Common Visual Properties
        if (node.styles.opacity) {
            attr.alpha = node.styles.opacity;
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
        attr.fontSize = node.styles.fontSize || "12";
        attr.color = this.formatColor(node.styles.color || "#000000");
        
        // Alignment mapping
        if (node.styles.textAlign) {
            attr.align = node.styles.textAlign as AlignType;
        }
        
        if (node.text) {
            attr.text = node.text;
        }
    }

    private mapLoaderProperties(node: UINode, attr: Record<string, string>): void {
        // FGUI Loader specific
        attr.fill = LoaderFillType.scaleFree.toString(); // Default to scaleFree for absolute layouts
        
        const objectFit = node.styles.objectFit;
        if (objectFit === 'contain') attr.fill = LoaderFillType.scale.toString();
        else if (objectFit === 'cover') attr.fill = LoaderFillType.scaleNoBorder.toString();
    }

    private mapGraphProperties(node: UINode, attr: Record<string, string>): void {
        attr.type = "rect";
        attr.fillColor = this.formatColor(node.styles.background || node.styles.backgroundColor || "#cccccc");
    }

    /**
     * Converts CSS colors (rgba, hex, name) to FGUI compatible hex.
     */
    private formatColor(color: string): string {
        if (color.startsWith('rgba')) {
            // Simple extraction for now, can be improved with full RGBA to Hex logic from lib.js
            const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (matches) {
                const r = parseInt(matches[1]).toString(16).padStart(2, '0');
                const g = parseInt(matches[2]).toString(16).padStart(2, '0');
                const b = parseInt(matches[3]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }
        }
        return color;
    }
}
