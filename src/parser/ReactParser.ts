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
        // Extract the main component content first to ignore boilerplate
        const shoppingCartMatch = code.match(/export const ShoppingCart = \(\) => \{([\s\S]*?)\};/);
        const targetCode = shoppingCartMatch ? shoppingCartMatch[1] : code;

        const allTagsRegex = /<(\w+)([^>]*?)(\/?)>/g;
        let tagMatch;

        while ((tagMatch = allTagsRegex.exec(targetCode)) !== null) {
            const fullTagName = tagMatch[1];
            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';

            // Skip non-UI/system tags
            if (this.shouldSkipTag(fullTagName)) continue;

            const isStyledTag = fullTagName.startsWith('Styled');
            
            // 1. Initial Styles from map
            let styles = styleMap[fullTagName] || {};
            if (!styles && isStyledTag) {
                // Try fuzzy matching for common suffixes
                const possibleNames = [`${fullTagName}span`, `${fullTagName}div`, `${fullTagName}button`].map(n => n.toLowerCase());
                const foundKey = Object.keys(styleMap).find(k => possibleNames.includes(k.toLowerCase()));
                if (foundKey) styles = styleMap[foundKey];
            }

            // 2. Parse Inline Styles (Priority over CSS map)
            const inlineStyleMatch = tagAttrs.match(/style="([^"]+)"/);
            if (inlineStyleMatch) {
                const inlineStyles = this.parseInlineStyle(inlineStyleMatch[1]);
                styles = { ...styles, ...inlineStyles };
            }

            // 3. Capture Content
            let content = "";
            if (!isSelfClosing) {
                const closeTag = `</${fullTagName}>`;
                const startPos = tagMatch.index + tagMatch[0].length;
                const endPos = targetCode.indexOf(closeTag, startPos);
                if (endPos !== -1) {
                    content = targetCode.substring(startPos, endPos);
                }
            }

            // 4. Determine Object Type
            const type = this.determineObjectType(fullTagName, tagAttrs, content);

            // Robust Coordinate parsing: check styles, then attributes
            const getCoord = (key: string, def: string) => {
                const val = styles[key] || styles[key.toLowerCase()] || "";
                return val ? parseInt(val) : parseInt(def);
            };

            const node: UINode = {
                id: `n${this._nextId++}`,
                name: fullTagName,
                type: type,
                x: getCoord('left', "0"),
                y: getCoord('top', "0"),
                width: getCoord('width', "100"),
                height: getCoord('height', "30"),
                styles: styles,
                customProps: this.parseAttributes(tagAttrs),
                children: [] 
            };

            // Handle text content
            if (type === ObjectType.Text || type === ObjectType.InputText || type === ObjectType.Button) {
                // Strip all nested tags to get raw text
                node.text = content.replace(/<[^>]+>.*?<\/[^>]+>/gs, '').replace(/<[^>]+>/g, '').trim();
            }

            // Handle Graphic / Image content
            if (content.includes('<svg')) {
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

    private determineObjectType(name: string, attrs: string, content: string): ObjectType {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('button')) return ObjectType.Button;
        if (lowerName.includes('input')) return ObjectType.InputText;
        
        // Image/Loader: Has data-svg-wrapper, has src attribute, OR contains <svg>
        if (attrs.includes('data-svg-wrapper') || attrs.includes('src=') || content.includes('<svg')) {
            return ObjectType.Image;
        }
        
        // Text: Has text content AND doesn't look like a container
        const cleanText = content.replace(/<[^>]+>.*?<\/[^>]+>/gs, '').replace(/<[^>]+>/gs, '').trim();
        // Improvement: if it's a Styled tag but only contains text (no children tags), it's definitely a Text node
        if (name.startsWith('Styled') && cleanText.length > 0 && !content.includes('<Styled') && !content.includes('<div')) {
            return ObjectType.Text;
        }

        if (lowerName.includes('text') || lowerName.includes('span')) {
            return ObjectType.Text;
        }
        
        if (name.startsWith('Styled')) {
            // Container vs Graph
            if (!content.includes('<Styled') && !content.includes('<div') && !content.includes('<svg')) {
                return ObjectType.Graph;
            }
            return ObjectType.Component;
        }

        return ObjectType.Graph; 
    }

    private parseInlineStyle(styleStr: string): Record<string, string> {
        const styles: Record<string, string> = {};
        // Use a more robust split that handles spaces after colons
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim().replace(/['"]/g, '');
            // Convert camelCase to kebab-case if needed (e.g. fontSize -> font-size)
            const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            styles[kebabKey] = val.replace('px', '');
            if (kebabKey !== key) styles[key] = val.replace('px', '');
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
