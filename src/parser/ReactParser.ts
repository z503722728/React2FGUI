import { ObjectType } from "../models/FGUIEnum";
import { UINode } from "../models/UINode";

/**
 * ReactParser: Parses React (Styled Components) source code into a UINode tree.
 */
export class ReactParser {
    private _nextId = 1;

    /**
     * Parses source code and returns a list of root-level UI nodes.
     * Note: In this phase, we flatten the tree but capture semantic info.
     */
    public parse(code: string, styleMap: Record<string, any>): UINode[] {
        const nodes: UINode[] = [];
        const allTagsRegex = /<(\w+)([^>]*?)(\/?)>/g;
        let tagMatch;

        while ((tagMatch = allTagsRegex.exec(code)) !== null) {
            const fullTagName = tagMatch[1];
            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';

            // Skip non-UI/system tags
            if (this.shouldSkipTag(fullTagName)) continue;

            const isStyledTag = fullTagName.startsWith('Styled');
            
            // 1. Initial Styles from map
            let styles = styleMap[fullTagName] || {};
            if (!styles && isStyledTag) {
                const possibleNames = [`${fullTagName}span`, `${fullTagName}div`, `${fullTagName}button`].map(n => n.toLowerCase());
                const foundKey = Object.keys(styleMap).find(k => possibleNames.includes(k.toLowerCase()));
                if (foundKey) styles = styleMap[foundKey];
            }

            // 2. Parse Inline Styles
            const inlineStyleMatch = tagAttrs.match(/style="([^"]+)"/);
            if (inlineStyleMatch) {
                const inlineStyles = this.parseInlineStyle(inlineStyleMatch[1]);
                styles = { ...styles, ...inlineStyles };
            }

            // 3. Determine Object Type
            const type = this.determineObjectType(fullTagName, tagAttrs);

            // 4. Capture Content
            let content = "";
            if (!isSelfClosing) {
                const closeTag = `</${fullTagName}>`;
                const startPos = tagMatch.index + tagMatch[0].length;
                const endPos = code.indexOf(closeTag, startPos);
                if (endPos !== -1) {
                    content = code.substring(startPos, endPos);
                }
            }

            const node: UINode = {
                id: `n${this._nextId++}`,
                name: fullTagName,
                type: type,
                x: parseInt(styles.left || "0"),
                y: parseInt(styles.top || "0"),
                width: parseInt(styles.width || "100"),
                height: parseInt(styles.height || "30"),
                styles: styles,
                customProps: this.parseAttributes(tagAttrs),
                children: [] // Nested hierarchy can be improved in future phases
            };

            // Handle text or specific content
            if (type === ObjectType.Text || type === ObjectType.InputText) {
                node.text = content.replace(/<[^>]+>/g, '').trim();
            } else if (content.includes('<svg')) {
                const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
                if (svgMatch) node.src = svgMatch[0];
            }

            // Special case for Base64 in src
            const base64Match = tagAttrs.match(/src="(data:image\/[^;]+;base64,[^"]+)"/);
            if (base64Match) {
                node.src = base64Match[1];
            }

            nodes.push(node);
        }

        return nodes;
    }

    private shouldSkipTag(name: string): boolean {
        const skip = ['StyledShoppingcart', 'ShoppingCart', 'React', 'svg', 'path', 'g', 'defs', 'clipPath', 'rect'];
        return skip.includes(name);
    }

    private determineObjectType(name: string, attrs: string): ObjectType {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('button')) return ObjectType.Button;
        if (lowerName.includes('input')) return ObjectType.InputText;
        if (attrs.includes('data-svg-wrapper') || attrs.includes('src=')) return ObjectType.Image;
        if (lowerName.includes('text') || lowerName.includes('span')) return ObjectType.Text;
        return ObjectType.Component;
    }

    private parseInlineStyle(styleStr: string): Record<string, string> {
        const styles: Record<string, string> = {};
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim().replace(/['"]/g, '');
            styles[key] = val.replace('px', '');
        });
        return styles;
    }

    private parseAttributes(attrsStr: string): Record<string, any> {
        const props: Record<string, any> = {};
        const matches = attrsStr.matchAll(/(\w+-\w+|\w+)="([^"]*)"/g);
        for (const match of matches) {
            props[match[1]] = match[2];
        }
        return props;
    }
}
