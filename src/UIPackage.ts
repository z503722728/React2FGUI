import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';
import { ExportConfig } from './Common';

interface Resource {
    id: string;
    name: string;
    type: 'image' | 'component';
    data?: string;
    isBase64?: boolean;
}

export default class UIPackage {
    private _cfg: ExportConfig;
    private _buildId: string;
    private _resources: Resource[] = [];
    private _nextResId: number = 0;

    constructor(cfg: ExportConfig) {
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }

    private getNextResId(): string {
        return 'res' + (this._nextResId++).toString(36);
    }

    public async exportPackage(): Promise<void> {
        console.log(`🚀 Transforming React into FGUI: ${this._cfg.packName}`);
        
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        const componentXml = this.parseReactToFgui(code);
        
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        const imgPath = path.join(packagePath, 'img');
        await fs.ensureDir(packagePath);
        await fs.ensureDir(imgPath);
        
        // 1. Write resources (SVGs and decoded Base64 images)
        for (const res of this._resources) {
            if (res.data) {
                if (res.isBase64) {
                    const base64Parts = res.data.split(',');
                    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
                    if (base64Data) {
                        await fs.writeFile(path.join(imgPath, res.name), Buffer.from(base64Data, 'base64'));
                    }
                } else {
                    await fs.writeFile(path.join(imgPath, res.name), res.data);
                }
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

    private parseReactToFgui(code: string): string {
        const component = xmlbuilder.create('component').att('size', '1440,1024');
        const displayList = component.ele('displayList');
        const styleMap: { [key: string]: any } = {};
        
        // 1. Extract Styled Components styles
        const styledRegex = /const\s+(Styled\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        let sMatch;
        while ((sMatch = styledRegex.exec(code)) !== null) {
            styleMap[sMatch[1]] = this.parseCss(sMatch[3]);
        }

        // 2. Scan for Styled Tags
        // We use a broader regex to capture attributes like src
        const jsxTagRegex = /<(Styled\w+)([^>]*?)(\/?)>/g;
        let tagMatch;
        let nodeIndex = 1;
        while ((tagMatch = jsxTagRegex.exec(code)) !== null) {
            const tagName = tagMatch[1];
            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';
            
            if (tagName === 'StyledShoppingcart') continue; 

            let styles = styleMap[tagName];
            if (!styles) {
                const possibleNames = [`${tagName}span`, `${tagName}div`, `${tagName}button`].map(n => n.toLowerCase());
                const foundKey = Object.keys(styleMap).find(k => possibleNames.includes(k.toLowerCase()));
                if (foundKey) styles = styleMap[foundKey];
            }
            styles = styles || {};

            const id = `n${nodeIndex++}`;
            const xy = `${styles.left || 0},${styles.top || 0}`;
            const size = `${styles.width || 100},${styles.height || 30}`;

            // --- BASE64 EXTRACTION FROM ATTRS ---
            const base64SrcMatch = tagAttrs.match(/src="data:image\/(png|jpeg|jpg);base64,([^"]+)"/);
            if (base64SrcMatch) {
                const ext = base64SrcMatch[1];
                const base64Content = base64SrcMatch[2];
                const resId = this.getNextResId();
                const fileName = `img_${id}.${ext}`;
                
                this._resources.push({
                    id: resId,
                    name: fileName,
                    type: 'image',
                    data: base64Content,
                    isBase64: true
                });

                displayList.ele('loader', {
                    id, name: tagName, xy, size,
                    url: `ui://${this._buildId}${resId}`,
                    fill: 'scaleFree'
                });
                continue;
            }

            // Handle content if not self-closing
            let content = "";
            if (!isSelfClosing) {
                const closeTag = `</${tagName}>`;
                const startPos = tagMatch.index + tagMatch[0].length;
                const endPos = code.indexOf(closeTag, startPos);
                if (endPos !== -1) {
                    content = code.substring(startPos, endPos);
                }
            }

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
                    id, name: tagName, xy, size,
                    url: `ui://${this._buildId}${resId}`,
                    fill: 'scaleFree'
                });
                continue;
            }

            // --- TEXT OR GRAPH ---
            const cleanText = content.replace(/<Styled\w+.*?>.*?<\/Styled\w+>/gs, '').replace(/<.*?>/gs, '').trim();

            if (tagName.toLowerCase().includes('button')) {
                displayList.ele('component', { id, name: tagName, xy, size, extention: 'Button' }).ele('Button', { title: cleanText });
            } else if (cleanText.length > 0) {
                displayList.ele('text', { id, name: tagName, xy, size, fontSize: styles.fontSize || '12', color: styles.color || '#000000', text: cleanText });
            } else {
                displayList.ele('graph', { id, name: tagName, xy, size, type: 'rect', fillColor: styles.background || '#cccccc' });
            }
        }
        return component.end({ pretty: true });
    }

    private parseCss(css: string): any {
        const styles: any = {};
        css.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const prop = parts[0].trim(), val = parts[1].trim();
            if (['width', 'height', 'left', 'top'].includes(prop)) styles[prop] = val.replace('px', '');
            else if (['color', 'background'].includes(prop)) styles[prop] = val;
            else if (prop === 'font-size') styles['fontSize'] = val.replace('px', '');
        });
        return styles;
    }
}
