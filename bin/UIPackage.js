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
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }
    getNextResId() {
        return 'res' + (this._nextResId++).toString(36);
    }
    async exportPackage() {
        console.log(`🚀 Transforming React into FGUI (Architecture V2 - Recursive): ${this._cfg.packName}`);
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        // 1. Extract Styles
        const styleMap = this.extractStyles(code);
        // 2. Parse Source into Hierarchical Tree
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
                const xmlContent = this._generator.generateComponentXml(compNode.children, this._buildId, compNode.width, compNode.height);
                const fileName = res.name.endsWith('.xml') ? res.name : res.name + '.xml';
                await fs.writeFile(path.join(packagePath, fileName), xmlContent);
            }
        }
        // 8. Generate Main XML
        // Use the first root node's size for the main component if available, otherwise default
        const mainWidth = rootNodes.length > 0 ? rootNodes[0].width : 1440;
        const mainHeight = rootNodes.length > 0 ? rootNodes[0].height : 1024;
        const mainXml = this._generator.generateComponentXml(rootNodes, this._buildId, mainWidth, mainHeight);
        const packageXml = this._generator.generatePackageXml(this._resources, this._buildId, this._cfg.packName);
        await fs.writeFile(path.join(packagePath, 'package.xml'), packageXml);
        await fs.writeFile(path.join(packagePath, 'main.xml'), mainXml);
        console.log(`✅ Success! Generated FGUI Package with ${componentResources.length} extracted sub-components.`);
        console.log(`📂 Output: ${packagePath}`);
    }
    extractStyles(code) {
        const styleMap = {};
        const styledRegex = /const\s+(Styled\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        let sMatch;
        while ((sMatch = styledRegex.exec(code)) !== null) {
            styleMap[sMatch[1]] = this.parseCss(sMatch[3]);
        }
        return styleMap;
    }
    processResourcesRecursive(nodes) {
        const uniqueSrcMap = new Map();
        const visit = (node) => {
            if (node.src && node.type !== FGUIEnum_1.ObjectType.Button && node.type !== FGUIEnum_1.ObjectType.Component) {
                // Handle Images / Loaders
                if (uniqueSrcMap.has(node.src)) {
                    node.src = uniqueSrcMap.get(node.src);
                }
                else {
                    const resId = this.getNextResId();
                    const isBase64 = node.src.startsWith('data:image');
                    let ext = 'svg';
                    if (isBase64) {
                        const mimeMatch = node.src.match(/data:image\/([a-zA-Z0-9+.-]+);/);
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
                    else if (node.src.endsWith('.png'))
                        ext = 'png';
                    else if (node.src.endsWith('.jpg'))
                        ext = 'jpg';
                    const fileName = isBase64 ? `img_${resId}.${ext}` : `icon_${resId}.${ext}`;
                    const res = {
                        id: resId,
                        name: fileName,
                        type: 'image',
                        data: node.src,
                        isBase64: isBase64
                    };
                    this._resources.push(res);
                    uniqueSrcMap.set(node.src, resId);
                    node.src = resId;
                }
            }
            if (node.children) {
                node.children.forEach(child => visit(child));
            }
        };
        nodes.forEach(root => visit(root));
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
