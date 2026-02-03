"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const ReactParser_1 = require("./parser/ReactParser");
const XMLGenerator_1 = require("./generator/XMLGenerator");
const SubComponentExtractor_1 = require("./generator/SubComponentExtractor");
const FGUIEnum_1 = require("./models/FGUIEnum");
class UIPackage {
    constructor(cfg) {
        this._resources = [];
        this._nextResId = 0;
        this._parser = new ReactParser_1.ReactParser();
        this._generator = new XMLGenerator_1.XMLGenerator();
        this._extractor = new SubComponentExtractor_1.SubComponentExtractor();
        this._imagePlaceholderMap = new Map();
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }
    getNextResId() {
        return 'res' + (this._nextResId++).toString(36);
    }
    async exportPackage() {
        console.log(`🚀 Transforming React into FGUI (Architecture V2 - Recursive): ${this._cfg.packName}`);
        let code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        // 1. Extract Styles
        const { styles: styleMap, duplicates } = this.extractStyles(code);
        // 1.5 Generate Merged Code for Verification
        code = this.generateMergedCode(code, duplicates);
        const mergedPath = this._cfg.reactFile.replace('.tsx', '_merged.tsx');
        await fs.writeFile(mergedPath, code);
        console.log(`📝 Generated Merged Source: ${mergedPath}`);
        // 2. Pre-process Images (Dedupe & Placeholder)
        code = this.extractImages(code);
        // 3. Parse Source into Hierarchical Tree
        const rootNodes = this._parser.parse(code, styleMap);
        // 3. Process Resources (Images) on the full tree
        this.processResourcesRecursive(rootNodes);
        // 4. Extract Sub-Components (The smart part)
        // This modifies rootNodes in-place (replacing containers with refs) and returns new component resources
        const componentResources = this._extractor.extract(rootNodes);
        this._resources.push(...componentResources);
        // 5. File System Setup
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        const imgPath = path.join(packagePath, 'img');
        await fs.ensureDir(packagePath);
        await fs.ensureDir(imgPath);
        // 6. Write Images
        for (const res of this._resources) {
            if (res.data && res.type === 'image') {
                if (res.isBase64) {
                    const commaIdx = res.data.indexOf(',');
                    const base64Data = commaIdx > -1 ? res.data.substring(commaIdx + 1) : res.data;
                    const buffer = Buffer.from(base64Data.trim(), 'base64');
                    await fs.writeFile(path.join(imgPath, res.name), buffer);
                }
                else {
                    await fs.writeFile(path.join(imgPath, res.name), res.data);
                }
            }
        }
        // 7. Write Sub-Component XMLs
        for (const res of this._resources) {
            if (res.type === 'component' && res.data) {
                // res.data contains the JSON string of the UINode tree for this component
                const compNode = JSON.parse(res.data);
                // We use the generator to build the XML for this sub-component
                const xmlContent = this._generator.generateComponentXml(compNode.children, this._buildId, compNode.width, compNode.height, compNode.styles);
                const fileName = res.name.endsWith('.xml') ? res.name : res.name + '.xml';
                await fs.writeFile(path.join(packagePath, fileName), xmlContent);
            }
        }
        // 8. Generate Main XML
        // Use the first root node's size for the main component if available, otherwise default
        const mainWidth = rootNodes.length > 0 ? rootNodes[0].width : 1440;
        const mainHeight = rootNodes.length > 0 ? rootNodes[0].height : 1024;
        const mainStyles = rootNodes.length > 0 ? rootNodes[0].styles : undefined;
        const mainXml = this._generator.generateComponentXml(rootNodes, this._buildId, mainWidth, mainHeight, mainStyles);
        const packageXml = this._generator.generatePackageXml(this._resources, this._buildId, this._cfg.packName);
        await fs.writeFile(path.join(packagePath, 'package.xml'), packageXml);
        await fs.writeFile(path.join(packagePath, 'main.xml'), mainXml);
        console.log(`✅ Success! Generated FGUI Package with ${componentResources.length} extracted sub-components.`);
        console.log(`📂 Output: ${packagePath}`);
    }
    extractStyles(code) {
        const rawStyleMap = {};
        // 1. Extract raw styles
        // 1. Extract raw styles
        const styledRegex = /const\s+(Styled\w+)\s+=\s+styled\.(\w+)\s*`([\s\S]*?)`/g;
        let sMatch;
        console.log(`[ExtractStyles] First 200 chars: ${code.substring(0, 200)}`);
        while ((sMatch = styledRegex.exec(code)) !== null) {
            const name = sMatch[1];
            const tag = sMatch[2];
            console.log(`[ExtractStyles] Found style: ${name} (tag: ${tag})`);
            const styleObj = this.parseCss(sMatch[3]);
            styleObj['_tag'] = tag; // Store the tag for deduplication
            rawStyleMap[name] = styleObj;
        }
        // 2. Deduplicate Styles
        // Map<Hash, CanonicalName>
        const styleHashMap = new Map();
        const finalStyleMap = {};
        const duplicatesMap = {}; // Original -> Canonical
        let totalStyles = 0;
        let uniqueStyles = 0;
        for (const [name, styleObj] of Object.entries(rawStyleMap)) {
            totalStyles++;
            // Create a deterministic hash string from the style object
            // We sort keys to ensure property order doesn't affect equality
            const sortedKeys = Object.keys(styleObj).sort();
            const styleString = sortedKeys.map(k => `${k}:${styleObj[k]}`).join(';');
            if (styleHashMap.has(styleString)) {
                // Duplicate found!
                const canonicalName = styleHashMap.get(styleString);
                duplicatesMap[name] = canonicalName;
                // We map the duplicate name to the SAME style object reference
                finalStyleMap[name] = finalStyleMap[canonicalName];
                console.log(`[StyleDedupe] Merging ${name} -> ${canonicalName}`);
            }
            else {
                // New unique style
                styleHashMap.set(styleString, name);
                finalStyleMap[name] = styleObj;
                uniqueStyles++;
            }
        }
        console.log(`[StyleDedupe] Processed ${totalStyles} styled components. Found ${uniqueStyles} unique styles. Merged ${totalStyles - uniqueStyles} duplicates.`);
        return { styles: finalStyleMap, duplicates: duplicatesMap };
    }
    extractImages(code) {
        let processedCode = code;
        let imgCount = 0;
        // 1. Extract Base64 Images (src="data:image...")
        const base64Regex = /src\s*=\s*['"](data:image\/[^'"]+)['"]/g;
        processedCode = processedCode.replace(base64Regex, (match, dataC) => {
            const hash = this.hashContent(dataC);
            const placeholder = `__IMG_${hash}`;
            if (!this._imagePlaceholderMap.has(placeholder)) {
                this._imagePlaceholderMap.set(placeholder, dataC);
                imgCount++;
            }
            return `src="${placeholder}"`;
        });
        // 2. Extract Inline SVGs (<svg...>...</svg>)
        // We capture the whole svg block
        const svgRegex = /(<svg[\s\S]*?<\/svg>)/g;
        processedCode = processedCode.replace(svgRegex, (match, svgContent) => {
            // Capture dimensions if present
            const widthMatch = svgContent.match(/width=["'](\d+)["']/);
            const heightMatch = svgContent.match(/height=["'](\d+)["']/);
            const w = widthMatch ? widthMatch[1] : "";
            const h = heightMatch ? heightMatch[1] : "";
            // Normalize whitespace for consistent hashing
            const normalizedSvg = svgContent.replace(/\s+/g, ' ').trim();
            const hash = this.hashContent(normalizedSvg);
            const placeholder = `__IMG_${hash}`;
            if (!this._imagePlaceholderMap.has(placeholder)) {
                // We keep the original content for later
                this._imagePlaceholderMap.set(placeholder, svgContent);
                imgCount++;
            }
            // Construct replacement img tag with dimensions if found
            let replacement = `<img src="${placeholder}"`;
            if (w)
                replacement += ` width="${w}"`;
            if (h)
                replacement += ` height="${h}"`;
            replacement += ` />`;
            return replacement;
        });
        console.log(`[ImageDedupe] Pre-processed ${imgCount} unique images/SVGs into placeholders.`);
        return processedCode;
    }
    hashContent(content) {
        let hash = 0;
        if (content.length === 0)
            return '0';
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        // Force positive and hex
        return (hash >>> 0).toString(16);
    }
    processResourcesRecursive(nodes) {
        // Map<Hash, ResourceID> to track unique images we've already assigned an ID
        // The Placeholder ID itself is a Hash, so we can just use the Placeholder as the key?
        // Actually, let's use the Placeholder as the Key for simplicity since it's 1:1 with content hash.
        // Map<Hash, {id: string, fileName: string}>
        const uniquePlaceholderMap = new Map();
        const visit = (node) => {
            if (!node.src) {
                if (node.children)
                    node.children.forEach(visit);
                return;
            }
            // Check if it's a placeholder
            if (node.src.startsWith('__IMG_')) {
                const placeholder = node.src;
                if (uniquePlaceholderMap.has(placeholder)) {
                    // Reuse existing Resource ID
                    const info = uniquePlaceholderMap.get(placeholder);
                    node.src = info.id;
                    node.fileName = info.fileName;
                }
                else if (this._imagePlaceholderMap.has(placeholder)) {
                    // New Resource
                    const rawContent = this._imagePlaceholderMap.get(placeholder);
                    const resId = this.getNextResId();
                    const isBase64 = rawContent.startsWith('data:image');
                    const isSvgStart = rawContent.trim().startsWith('<svg');
                    let ext = 'svg';
                    if (isBase64) {
                        const mimeMatch = rawContent.match(/data:image\/([a-zA-Z0-9+.-]+);/);
                        if (mimeMatch) {
                            const mime = mimeMatch[1];
                            if (mime === 'svg+xml')
                                ext = 'svg';
                            else if (mime === 'jpeg')
                                ext = 'jpg';
                            else
                                ext = mime;
                        }
                        else {
                            ext = 'png';
                        }
                    }
                    const fileName = (isBase64 || isSvgStart) ? `img_${resId}.${ext}` : `icon_${resId}.${ext}`;
                    const res = {
                        id: resId,
                        name: fileName,
                        type: 'image',
                        data: rawContent,
                        isBase64: isBase64
                    };
                    this._resources.push(res);
                    uniquePlaceholderMap.set(placeholder, { id: resId, fileName: 'img/' + fileName });
                    node.src = resId;
                    node.fileName = 'img/' + fileName;
                }
                else {
                    console.warn(`[RefRes] Warning: Image Reference ${placeholder} found but content missing in registry.`);
                }
            }
            else if (node.type !== FGUIEnum_1.ObjectType.Button && node.type !== FGUIEnum_1.ObjectType.Component) {
                // Legacy / Standard path handling (if not pre-processed)
                console.log(`[RefRes] Processing standard path: ${node.src}`);
            }
            if (node.children) {
                node.children.forEach(visit);
            }
        };
        nodes.forEach(visit);
    }
    generateMergedCode(code, duplicatesMap) {
        let mergedCode = code;
        for (const [duplicate, canonical] of Object.entries(duplicatesMap)) {
            // 1. Remove Definition
            // const Duplicate = styled.div`...`; 
            // We use a regex that matches the definition block
            const defRegex = new RegExp(`const\\s+${duplicate}\\s+=\\s+styled\\.(\\w+)\\s*\`[\\s\\S]*?\`;`, 'g');
            mergedCode = mergedCode.replace(defRegex, `// Merged ${duplicate} -> ${canonical}`);
            // 2. Replace Usages in JSX
            // Only replace the exact name to avoid accidentally matching parent components
            // Open tag
            const openTagRegex = new RegExp(`<${duplicate}(\\s|>)`, 'g');
            mergedCode = mergedCode.replace(openTagRegex, `<${canonical}$1`);
            // Close tag
            const closeTagRegex = new RegExp(`</${duplicate}>`, 'g');
            mergedCode = mergedCode.replace(closeTagRegex, `</${canonical}>`);
        }
        return mergedCode;
    }
    parseCss(css) {
        const styles = {};
        const rules = css.split(';');
        rules.forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2)
                return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            styles[key] = val.replace('px', '');
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (camelKey !== key)
                styles[camelKey] = styles[key];
        });
        return styles;
    }
}
exports.default = UIPackage;
