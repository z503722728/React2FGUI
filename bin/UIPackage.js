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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const xmlbuilder = __importStar(require("xmlbuilder"));
/**
 * React2FGUI Parser - Styled Components to FGUI XML
 * Supports basic absolute positioning and styled text.
 */
class UIPackage {
    constructor(cfg) {
        this._nextItemIndex = 0;
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }
    exportPackage() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🚀 Transforming React into FGUI: ${this._cfg.packName}`);
            const code = yield fs.readFile(this._cfg.reactFile, 'utf-8');
            const componentXml = this.parseReactToFgui(code);
            const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
            yield fs.ensureDir(packagePath);
            // Generate package.xml
            const pkgDesc = xmlbuilder.create('packageDescription');
            pkgDesc.att('id', this._buildId);
            const resNode = pkgDesc.ele('resources');
            resNode.ele('component', { id: 'n0', name: 'main.xml', path: '/', exported: 'true' });
            yield fs.writeFile(path.join(packagePath, 'package.xml'), pkgDesc.end({ pretty: true }));
            yield fs.writeFile(path.join(packagePath, 'main.xml'), componentXml);
            console.log(`✅ Success! Package generated at: ${packagePath}`);
        });
    }
    parseReactToFgui(code) {
        const component = xmlbuilder.create('component');
        component.att('size', '1440,1024'); // Default canvas size
        const displayList = component.ele('displayList');
        // 1. Extract Styled Component definitions (very basic regex for demo)
        const styledRegex = /const\s+(\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        const styleMap = {};
        let match;
        while ((match = styledRegex.exec(code)) !== null) {
            const [_, name, tag, css] = match;
            styleMap[name] = this.parseCss(css);
        }
        // 2. Extract JSX nodes (basic scan)
        const jsxRegex = /<(\w+)([^>]*)>(.*?)<\/\1>/g;
        let nodeIndex = 1;
        while ((match = jsxRegex.exec(code)) !== null) {
            const [_, compName, attrs, content] = match;
            const styles = styleMap[compName] || {};
            const id = `n${nodeIndex++}`;
            if (compName.toLowerCase().includes('button')) {
                displayList.ele('component', {
                    id, name: compName, xy: `${styles.left || 0},${styles.top || 0}`,
                    size: `${styles.width || 100},${styles.height || 50}`,
                    extention: 'Button'
                }).ele('Button', { title: content.trim() });
            }
            else if (compName.toLowerCase().includes('span') || content.trim().length > 0) {
                displayList.ele('text', {
                    id, name: compName, xy: `${styles.left || 0},${styles.top || 0}`,
                    size: `${styles.width || 200},${styles.height || 30}`,
                    fontSize: styles.fontSize || '12',
                    color: styles.color || '#000000',
                    text: content.trim()
                });
            }
            else {
                displayList.ele('graph', {
                    id, name: compName, xy: `${styles.left || 0},${styles.top || 0}`,
                    size: `${styles.width || 100},${styles.height || 100}`,
                    type: 'rect',
                    fillColor: styles.background || '#cccccc'
                });
            }
        }
        return component.end({ pretty: true });
    }
    parseCss(css) {
        const styles = {};
        const rules = css.split(';');
        rules.forEach(rule => {
            const [prop, value] = rule.split(':').map(s => s.trim());
            if (!prop || !value)
                return;
            if (prop === 'width' || prop === 'height' || prop === 'left' || prop === 'top') {
                styles[prop] = value.replace('px', '');
            }
            else if (prop === 'color' || prop === 'background') {
                styles[prop] = value;
            }
            else if (prop === 'font-size') {
                styles['fontSize'] = value.replace('px', '');
            }
        });
        return styles;
    }
}
exports.default = UIPackage;
