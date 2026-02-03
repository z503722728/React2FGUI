"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactParser = void 0;
const FGUIEnum_1 = require("../models/FGUIEnum");
/**
 * ReactParser: Parses React (Styled Components or Inline Styles) source code into a UINode tree.
 * Uses a recursive approach to perform correct parenting and valid nested coordinate calculation.
 */
class ReactParser {
    constructor() {
        this._nextId = 1;
    }
    /**
     * Parses source code and returns a list of root-level UI nodes.
     * The nodes will have their 'children' property populated.
     */
    parse(code, styleMap) {
        // Extract the main component content first to ignore boilerplate
        const componentMatch = code.match(/export const (\w+) = \(\) => \{([\s\S]*?)\};/) || code.match(/return \(([\s\S]*?)\);/);
        let targetCode = componentMatch ? (componentMatch[2] || componentMatch[1]) : code;
        targetCode = targetCode.trim();
        // Remove outer parentheses if present (common in returns)
        if (targetCode.startsWith('(') && targetCode.endsWith(')')) {
            targetCode = targetCode.substring(1, targetCode.length - 1);
        }
        console.log(`[ReactParser] Target Code Length: ${targetCode.length}`);
        // console.log(`[ReactParser] Target Code Start: ${targetCode.substring(0, 100)}...`);
        // We wrap the code in a mock root to handle multiple top-level elements if necessary
        // although standard React usually has one root.
        return this.parseNodes(targetCode, styleMap);
    }
    /**
     * Recursively parses nodes from the string.
     */
    parseNodes(html, styleMap, parent) {
        const nodes = [];
        // Match tag start/end or content
        // This simple regex approach relies on manual parsing loop for nesting
        let lastIndex = 0;
        // console.log(`[ReactParser] Parsing nodes from index 0, total length ${html.length}`);
        while (true) {
            // Find next tag start
            const openTagStart = html.indexOf('<', lastIndex);
            if (openTagStart === -1)
                break; // No more tags
            // Check for closing tag that might appear before next opening tag (shouldn't happen in valid valid XML at this level if we handled recursion right, but safeguards)
            if (html.startsWith('</', openTagStart)) {
                // This is a closing tag for our parent, we should stop parsing here ideally?
                // Actually, parseNodes is called with the *inner content* of the parent.
                // So we shouldn't encounter the parent's closing tag here if we sliced correctly.
                // However, finding a closing tag here implies we are done with current block or malformed.
                lastIndex = openTagStart + 1;
                continue;
            }
            const tagMatch = html.substring(openTagStart).match(/^<(\w+)([^>]*?)(\/?)>/);
            if (!tagMatch) {
                lastIndex++;
                continue;
            }
            const currentTagStr = tagMatch[0];
            const tagName = tagMatch[1];
            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';
            // Allow skipping non-UI tags?
            if (this.shouldSkipTag(tagName)) {
                const skipStart = openTagStart;
                // If it's not self-closing, we must skip to its closing tag
                if (!isSelfClosing) {
                    const closeIndex = this.findMatchingCloseTag(html, tagName, skipStart + currentTagStr.length);
                    if (closeIndex !== -1) {
                        const closeTag = `</${tagName}>`;
                        lastIndex = closeIndex + closeTag.length;
                    }
                    else {
                        lastIndex = skipStart + currentTagStr.length;
                    }
                }
                else {
                    lastIndex = skipStart + currentTagStr.length;
                }
                continue;
            }
            // Real Node Processing
            // 1. Text Content before this tag? (between lastIndex and openTagStart)
            // const textContent = html.substring(lastIndex, openTagStart).trim();
            // 2. Identify Node
            let innerContent = "";
            let nextSearchIndex = openTagStart + currentTagStr.length;
            if (!isSelfClosing) {
                const closeIndex = this.findMatchingCloseTag(html, tagName, nextSearchIndex);
                if (closeIndex !== -1) {
                    innerContent = html.substring(nextSearchIndex, closeIndex);
                    nextSearchIndex = closeIndex + `</${tagName}>`.length;
                }
                else {
                    innerContent = html.substring(nextSearchIndex);
                    nextSearchIndex = html.length;
                }
            }
            // 3. Create UINode
            // console.log(`[ReactParser] Found Node: ${tagName}, Children: ${!isSelfClosing}`);
            const node = this.createNode(tagName, tagAttrs, innerContent, styleMap, parent);
            // 4. Recurse for children if it's a container type
            // Note: We don't recurse into Text elements or pure Inputs usually
            if (!isSelfClosing && node.type !== FGUIEnum_1.ObjectType.Text && node.type !== FGUIEnum_1.ObjectType.InputText && node.type !== FGUIEnum_1.ObjectType.Image) {
                // Recurse
                const children = this.parseNodes(innerContent, styleMap, node);
                node.children = children;
            }
            nodes.push(node);
            lastIndex = nextSearchIndex;
        }
        return nodes;
    }
    findMatchingCloseTag(html, tagName, startIndex) {
        let depth = 1;
        let position = startIndex;
        const openTagRegex = new RegExp(`<${tagName}\\b`);
        const closeTag = `</${tagName}>`;
        while (depth > 0 && position < html.length) {
            const nextClose = html.indexOf(closeTag, position);
            if (nextClose === -1)
                return -1;
            // Check for next open tag before the close tag
            // We scan manually to ensure we find the *first* occurrence of either
            const slice = html.substring(position, nextClose);
            const nextOpenMatch = slice.match(openTagRegex);
            if (nextOpenMatch) {
                depth++;
                position = position + nextOpenMatch.index + 1; // Advance just past the <
            }
            else {
                depth--;
                if (depth === 0)
                    return nextClose;
                position = nextClose + 1; // Advance past this close tag
            }
        }
        return -1;
    }
    createNode(tagName, attrs, innerContent, styleMap, parent) {
        const id = `n${this._nextId++}`;
        // Resolve Styles
        let styles = styleMap[tagName] || {};
        const isStyledTag = tagName.startsWith('Styled');
        if (Object.keys(styles).length === 0 && isStyledTag) {
            const possibleNames = [`${tagName}div`, `${tagName}span`, `${tagName}img`];
            for (const p of possibleNames) {
                const foundKey = Object.keys(styleMap).find(k => k.toLowerCase() === p.toLowerCase());
                if (foundKey) {
                    styles = styleMap[foundKey];
                    break;
                }
            }
        }
        // Inline Styles
        let inlineStyleStr = "";
        const reactStyleMatch = attrs.match(/style=\{\{(.*?)\}\}/s);
        const htmlStyleMatch = attrs.match(/style="([^"]+)"/);
        if (reactStyleMatch) {
            const styleObjStr = reactStyleMatch[1];
            styleObjStr.split(',').forEach(prop => {
                const [key, val] = prop.split(':').map(s => s.trim());
                if (key && val) {
                    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    const cssVal = !isNaN(Number(val)) && key !== 'opacity' && key !== 'fontWeight' ? `${val}px` : val.replace(/'/g, '');
                    inlineStyleStr += `${cssKey}:${cssVal};`;
                }
            });
        }
        else if (htmlStyleMatch) {
            inlineStyleStr = htmlStyleMatch[1];
        }
        if (inlineStyleStr) {
            styles = { ...styles, ...this.parseInlineStyle(inlineStyleStr) };
        }
        // Determine Type
        const type = this.determineObjectType(tagName, attrs, innerContent);
        // --- Metadata Extraction (for Images/SVG wrappers) ---
        let extractedSrc = "";
        let extractedWidth;
        let extractedHeight;
        if (type === FGUIEnum_1.ObjectType.Image) {
            // Check attrs first
            const base64Match = attrs.match(/src=["']?(data:image\/[^;]+;base64,[^"'}]+)["']?/);
            const srcMatch = attrs.match(/src=["']?([^"'\s}]+)["']?/);
            if (base64Match)
                extractedSrc = base64Match[1];
            else if (srcMatch)
                extractedSrc = srcMatch[1];
            // If still missing, check innerContent (e.g. <img src="__IMG_..." width="126" height="48" />)
            if (!extractedSrc || extractedSrc.includes('{')) { // Skip React state/var if possible
                const innerImgMatch = innerContent.match(/<img[^>]+src=["']?([^"'\s}]+)["']?/);
                if (innerImgMatch) {
                    extractedSrc = innerImgMatch[1];
                    const wMatch = innerContent.match(/width=["'](\d+)["']/);
                    const hMatch = innerContent.match(/height=["'](\d+)["']/);
                    if (wMatch)
                        extractedWidth = wMatch[1];
                    if (hMatch)
                        extractedHeight = hMatch[1];
                }
            }
            if (!extractedSrc && innerContent.includes('<svg')) {
                const svgMatch = innerContent.match(/<svg[\s\S]*?<\/svg>/);
                if (svgMatch)
                    extractedSrc = svgMatch[0];
            }
        }
        // Coordinates Helper
        const getCoord = (key, def) => {
            const val = styles[key] || styles[key.toLowerCase()] || "";
            if (!val) {
                if (key === 'width' && extractedWidth)
                    return parseInt(extractedWidth);
                if (key === 'height' && extractedHeight)
                    return parseInt(extractedHeight);
                return parseInt(def);
            }
            return parseInt(val.toString().replace('px', ''));
        };
        const dataLayerMatch = attrs.match(/data-layer="([^"]+)"/);
        const namePart = dataLayerMatch ? dataLayerMatch[1].replace(/\s+/g, '') : tagName;
        const finalName = `${namePart}_${id}`;
        const node = {
            id,
            name: finalName,
            type,
            x: getCoord('left', "0"),
            y: getCoord('top', "0"),
            width: getCoord('width', "100"),
            height: getCoord('height', "30"),
            styles,
            src: extractedSrc,
            customProps: this.parseAttributes(attrs),
            children: [],
            parent: parent
        };
        // Content handling
        if (type === FGUIEnum_1.ObjectType.Text || type === FGUIEnum_1.ObjectType.InputText || type === FGUIEnum_1.ObjectType.Button) {
            node.text = innerContent.replace(/<[^>]+>/g, '').trim();
        }
        return node;
    }
    shouldSkipTag(name) {
        const skip = ['React', 'Fragment'];
        if (['path', 'g', 'defs', 'clipPath', 'rect', 'circle', 'line', 'polyline', 'polygon'].includes(name))
            return true;
        return skip.includes(name);
    }
    determineObjectType(name, attrs, content) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('button'))
            return FGUIEnum_1.ObjectType.Button;
        if (lowerName.includes('input'))
            return FGUIEnum_1.ObjectType.InputText;
        if (lowerName === 'img')
            return FGUIEnum_1.ObjectType.Image;
        // Image/SVG Detection (Highest priority after explicit tags)
        const isImage = attrs.includes('data-svg-wrapper') ||
            attrs.includes('src="data:image/') ||
            attrs.includes('src=\'data:image/') ||
            attrs.includes('src="__IMG_') ||
            attrs.includes('__IMG_') ||
            (name !== 'div' && content.includes('<svg')) ||
            (name === 'div' && content.trim().startsWith('<svg'));
        if (isImage) {
            return FGUIEnum_1.ObjectType.Image;
        }
        if (name.startsWith('Styled') || name === 'div' || name === 'span' || name.match(/^h[1-6]$/) || name === 'p') {
            // Check if it should be Text
            // If it has no child tags (simple text)
            const hasTags = /<[a-z][\s\S]*>/i.test(content);
            if (!hasTags && content.trim().length > 0) {
                return FGUIEnum_1.ObjectType.Text;
            }
            // Check if it's effectively empty or just text
            if (content.trim() === "" && !attrs.includes('data-layer')) {
                return FGUIEnum_1.ObjectType.Graph;
            }
            return FGUIEnum_1.ObjectType.Component;
        }
        const cleanText = content.replace(/<[^>]+>/g, '').trim();
        // Fix: Don't assume it's text if it has *any* children tags, not just div/img
        // We detect if there's an opening tag <Something
        const hasChildrenTags = /<\w+/.test(content);
        if ((lowerName.includes('text') || lowerName.includes('label') || attrs.includes('text=') || (cleanText.length > 0 && !hasChildrenTags))) {
            return FGUIEnum_1.ObjectType.Text;
        }
        return FGUIEnum_1.ObjectType.Graph;
    }
    parseInlineStyle(styleStr) {
        const styles = {};
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2)
                return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim().replace(/['"]/g, '');
            const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            styles[kebabKey] = val.replace('px', '');
            if (kebabKey !== key)
                styles[key] = val.replace('px', '');
        });
        return styles;
    }
    parseAttributes(attrsStr) {
        const props = {};
        const matches = attrsStr.matchAll(/(\w+-\w+|\w+)="([^"]*)"/g);
        for (const match of matches) {
            props[match[1]] = match[2];
        }
        return props;
    }
}
exports.ReactParser = ReactParser;
