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
const xmlbuilder = __importStar(require("xmlbuilder"));
class UIPackage {
    constructor(cfg) {
        this._resources = [];
        this._nextResId = 0;
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }
    getNextResId() {
        return 'res' + (this._nextResId++).toString(36);
    }
    async exportPackage() {
        console.log(`🚀 Transforming React into FGUI: ${this._cfg.packName}`);
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        const componentXml = this.parseReactToFgui(code);
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        const imgPath = path.join(packagePath, 'img');
        await fs.ensureDir(packagePath);
        await fs.ensureDir(imgPath);
        // 1. Write resources (SVGs)
        for (const res of this._resources) {
            if (res.data) {
                await fs.writeFile(path.join(imgPath, res.name), res.data);
            }
        }
        // 2. Generate package.xml
        const pkgDesc = xmlbuilder.create('packageDescription').att('id', this._buildId);
        const resNode = pkgDesc.ele('resources');
        // Add component itself
        resNode.ele('component', { id: 'main_id', name: 'main.xml', path: '/', exported: 'true' });
        // Add external resources
        this._resources.forEach(res => {
            resNode.ele(res.type, { id: res.id, name: res.name, path: '/img/', exported: 'true' });
        });
        await fs.writeFile(path.join(packagePath, 'package.xml'), pkgDesc.end({ pretty: true }));
        await fs.writeFile(path.join(packagePath, 'main.xml'), componentXml);
        console.log(`✅ Success! Package generated at: ${packagePath}`);
    }
    parseReactToFgui(code) {
        const component = xmlbuilder.create('component').att('size', '1440,1024');
        const displayList = component.ele('displayList');
        const styleMap = {};
        // 1. Extract Styled Components styles
        const styledRegex = /const\s+Styled(\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        let sMatch;
        while ((sMatch = styledRegex.exec(code)) !== null) {
            styleMap[sMatch[1]] = this.parseCss(sMatch[3]);
        }
        // 2. Scan for Styled Tags
        const jsxTagRegex = /<Styled(\w+)/g;
        let tagMatch;
        let nodeIndex = 1;
        while ((tagMatch = jsxTagRegex.exec(code)) !== null) {
            const name = tagMatch[1];
            if (name === 'Shoppingcart')
                continue;
            const styles = styleMap[name] || {};
            const id = `n${nodeIndex++}`;
            const xy = `${styles.left || 0},${styles.top || 0}`;
            const size = `${styles.width || 100},${styles.height || 30}`;
            const startPos = tagMatch.index;
            const openTagEnd = code.indexOf('>', startPos);
            const closeTag = `</Styled${name}>`;
            const endPos = code.indexOf(closeTag, openTagEnd);
            if (endPos === -1)
                continue;
            const content = code.substring(openTagEnd + 1, endPos);
            // --- SVG EXTRACTION ---
            const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
            if (svgMatch) {
                const svgData = svgMatch[0];
                const resId = this.getNextResId();
                const fileName = `icon_${id}.svg`;
                this._resources.push({
                    id: resId,
                    name: fileName,
                    type: 'image',
                    data: svgData
                });
                displayList.ele('loader', {
                    id, name, xy, size,
                    url: `ui://${this._buildId}${resId}`,
                    fill: 'scaleFree'
                });
                continue;
            }
            // --- TEXT OR GRAPH ---
            const cleanText = content.replace(/<Styled\w+.*?>.*?<\/Styled\w+>/gs, '').replace(/<.*?>/gs, '').trim();
            if (name.toLowerCase().includes('button')) {
                displayList.ele('component', { id, name, xy, size, extention: 'Button' }).ele('Button', { title: cleanText });
            }
            else if (cleanText.length > 0) {
                displayList.ele('text', { id, name, xy, size, fontSize: styles.fontSize || '12', color: styles.color || '#000000', text: cleanText });
            }
            else {
                displayList.ele('graph', { id, name, xy, size, type: 'rect', fillColor: styles.background || '#cccccc' });
            }
        }
        return component.end({ pretty: true });
    }
    parseCss(css) {
        const styles = {};
        css.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2)
                return;
            const prop = parts[0].trim(), val = parts[1].trim();
            if (['width', 'height', 'left', 'top'].includes(prop))
                styles[prop] = val.replace('px', '');
            else if (['color', 'background'].includes(prop))
                styles[prop] = val;
            else if (prop === 'font-size')
                styles['fontSize'] = val.replace('px', '');
        });
        return styles;
    }
}
exports.default = UIPackage;
