import { ObjectType } from "../models/FGUIEnum";
import { UINode } from "../models/UINode";

/**
 * ReactParser: Parses React (Styled Components or Inline Styles) source code into a UINode tree.
 */
export class ReactParser {
    private _nextId = 1;

    /**
     * Parses source code and returns a list of root-level UI nodes.
     */
    public parse(code: string, styleMap: Record<string, any>): UINode[] {
        const nodes: UINode[] = [];
        // Extract the main component content first to ignore boilerplate
        // Match standard React component export pattern
        const componentMatch = code.match(/export const (\w+) = \(\) => \{([\s\S]*?)\};/) || code.match(/return \(([\s\S]*?)\);/);
        let targetCode = componentMatch ? (componentMatch[2] || componentMatch[1]) : code;
        
        // Basic cleanup of return wrapper if present
        targetCode = targetCode.trim();
        if (targetCode.startsWith('(') && targetCode.endsWith(')')) {
            targetCode = targetCode.substring(1, targetCode.length - 1);
        }

        // Regex to capture opening and closing tags separately to track hierarchy
        // Group 1: Slash (if closing)
        // Group 2: Tag Name
        // Group 3: Attributes
        // Group 4: Self-closing slash
        const tagRegex = /<\/?(\w+)([^>]*?)(\/?)>/g;
        let tagMatch;

        // Stack to track parent container coordinates for flattening
        const parentStack: { x: number, y: number, name: string }[] = [];

        while ((tagMatch = tagRegex.exec(targetCode)) !== null) {
            const isClosingTag = tagMatch[0].startsWith('</');
            const fullTagName = tagMatch[1];
            
            // Skip non-UI/system tags
            if (this.shouldSkipTag(fullTagName)) continue;

            if (isClosingTag) {
                // Pop from stack if it matches the current parent
                if (parentStack.length > 0 && parentStack[parentStack.length - 1].name === fullTagName) {
                    parentStack.pop();
                }
                continue;
            }

            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';
            const isStyledTag = fullTagName.startsWith('Styled');
            
            // 1. Initial Styles from map (for Styled Components)
            let styles = styleMap[fullTagName] || {};
            if (!styles && isStyledTag) {
                const possibleNames = [`${fullTagName}span`, `${fullTagName}div`, `${fullTagName}button`].map(n => n.toLowerCase());
                const foundKey = Object.keys(styleMap).find(k => possibleNames.includes(k.toLowerCase()));
                if (foundKey) styles = styleMap[foundKey];
            }

            // 2. Parse Inline Styles (React style={{...}})
            // Handles both style="width: 10px" (HTML string) and style={{width: 10}} (React object)
            let inlineStyleStr = "";
            const reactStyleMatch = tagAttrs.match(/style=\{\{(.*?)\}\}/s); // React object style
            const htmlStyleMatch = tagAttrs.match(/style="([^"]+)"/); // HTML string style

            if (reactStyleMatch) {
                // Convert React object style to CSS string format for parser
                // e.g. width: 1440, height: 1024 -> width:1440px; height:1024px;
                const styleObjStr = reactStyleMatch[1];
                styleObjStr.split(',').forEach(prop => {
                    const [key, val] = prop.split(':').map(s => s.trim());
                    if (key && val) {
                        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        const cssVal = !isNaN(Number(val)) && key !== 'opacity' && key !== 'fontWeight' ? `${val}px` : val.replace(/'/g, '');
                        inlineStyleStr += `${cssKey}:${cssVal};`;
                    }
                });
            } else if (htmlStyleMatch) {
                inlineStyleStr = htmlStyleMatch[1];
            }

            if (inlineStyleStr) {
                const inlineStyles = this.parseInlineStyle(inlineStyleStr);
                styles = { ...styles, ...inlineStyles };
            }

            // 3. Capture Content
            let content = "";
            if (!isSelfClosing) {
                // Improved matching for nested tags
                // We need to find the matching closing tag, respecting nesting
                let depth = 1;
                const startPos = tagMatch.index + tagMatch[0].length;
                let currentPos = startPos;
                
                // Simple fast-forward to find matching tag
                // Note: This is a lightweight parser, for complex nesting a real AST parser is better
                // But for this tool's scope, a balanced counter works for well-formed JSX
                while (depth > 0 && currentPos < targetCode.length) {
                    const nextOpen = targetCode.indexOf(`<${fullTagName}`, currentPos);
                    const nextClose = targetCode.indexOf(`</${fullTagName}>`, currentPos);
                    
                    if (nextClose === -1) break; // Malformed or end of file

                    if (nextOpen !== -1 && nextOpen < nextClose) {
                        depth++;
                        currentPos = nextOpen + 1;
                    } else {
                        depth--;
                        if (depth === 0) {
                            content = targetCode.substring(startPos, nextClose);
                        }
                        currentPos = nextClose + 1;
                    }
                }
            }

            // 4. Determine Object Type
            const type = this.determineObjectType(fullTagName, tagAttrs, content);

            // 5. Calculate Coordinates (Accumulate parent offsets)
            const getCoord = (key: string, def: string) => {
                const val = styles[key] || styles[key.toLowerCase()] || "";
                if (!val) return parseInt(def);
                return parseInt(val.toString().replace('px', ''));
            };

            let currentX = getCoord('left', "0");
            let currentY = getCoord('top', "0");

            // Add parent offsets
            if (parentStack.length > 0) {
                const parent = parentStack[parentStack.length - 1];
                currentX += parent.x;
                currentY += parent.y;
            }

            const id = `n${this._nextId++}`;
            const node: UINode = {
                id: id,
                // Append ID to name to ensure uniqueness in FGUI display list
                name: `${fullTagName}_${id}`,
                type: type,
                x: currentX,
                y: currentY,
                width: getCoord('width', "100"),
                height: getCoord('height', "30"),
                styles: styles,
                customProps: this.parseAttributes(tagAttrs),
                children: [] 
            };

            // Handle text/media content...
            if (type === ObjectType.Text || type === ObjectType.InputText || type === ObjectType.Button) {
                // Strip tags but preserve text content
                node.text = content.replace(/<[^>]+>/g, '').trim();
            } else if (content.includes('<svg')) {
                const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
                if (svgMatch) node.src = svgMatch[0];
            }

            // Handle Base64 in src (both React style src={...} and HTML src="...")
            const base64Match = tagAttrs.match(/src=["']?(data:image\/[^;]+;base64,[^"'}]+)["']?/);
            if (base64Match) {
                node.src = base64Match[1];
            }

            nodes.push(node);

            // Push to stack if it's a container that isn't self-closing
            // NOTE: We only push containers (Components/Graphs) to the stack to avoid offsetting relative to a text node
            if (!isSelfClosing && (type === ObjectType.Component || type === ObjectType.Graph || type === ObjectType.Group)) {
                parentStack.push({ x: currentX, y: currentY, name: fullTagName });
            }
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
        
        // Image/Loader
        if (attrs.includes('data-svg-wrapper') || attrs.includes('src=') || content.includes('<svg')) {
            return ObjectType.Image;
        }
        
        // Text detection
        const cleanText = content.replace(/<[^>]+>/g, '').trim();
        // If it has direct text and no complex children (like divs), it's text
        if ((lowerName.includes('text') || lowerName.includes('label') || attrs.includes('text=') || cleanText.length > 0) 
            && !content.includes('<div') && !content.includes('<img')) {
            return ObjectType.Text;
        }
        
        if (name.startsWith('Styled') || name === 'div') {
            // Container vs Graph (Shape)
            // If it's a container but empty or only has styling, treat as Graph (Rectangle)
            if (content.trim() === "") {
                return ObjectType.Graph;
            }
            return ObjectType.Component; // It's a container with children
        }

        return ObjectType.Graph; 
    }

    private parseInlineStyle(styleStr: string): Record<string, string> {
        const styles: Record<string, string> = {};
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim().replace(/['"]/g, '');
            // Convert camelCase to kebab-case
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
