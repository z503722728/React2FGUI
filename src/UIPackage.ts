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

        // 2. Scan for All Tags (both Styled and standard ones like div)
        const allTagsRegex = /<(\w+)([^>]*?)(\/?)>/g;
        let tagMatch;
        let nodeIndex = 1;
        while ((tagMatch = allTagsRegex.exec(code)) !== null) {
            const fullTagName = tagMatch[1];
            const tagAttrs = tagMatch[2];
            const isSelfClosing = tagMatch[3] === '/';
            
            // Skip non-UI tags
            if (fullTagName === 'StyledShoppingcart' || fullTagName === 'ShoppingCart') continue; 
            if (fullTagName === 'React' || fullTagName === 'svg' || fullTagName === 'path' || fullTagName === 'g' || fullTagName === 'defs' || fullTagName === 'clipPath' || fullTagName === 'rect') continue;

            const isStyledTag = fullTagName.startsWith('Styled');
            let baseName = isStyledTag ? fullTagName : "";
            
            // Handle regular tags like <div data-svg-wrapper>
            if (!isStyledTag && !tagAttrs.includes('data-svg-wrapper')) {
                // If it's a plain div/span without specific FGUI-mapped attributes, we might skip or handle as generic
                if (fullTagName === 'div' || fullTagName === 'span' || fullTagName === 'button') {
                    // fall through
                } else {
                    continue;
                }
            }

            let styles = styleMap[fullTagName];
            if (!styles && isStyledTag) {
                const possibleNames = [`${fullTagName}span`, `${fullTagName}div`, `${fullTagName}button`].map(n => n.toLowerCase());
                const foundKey = Object.keys(styleMap).find(k => possibleNames.includes(k.toLowerCase()));
                if (foundKey) styles = styleMap[foundKey];
            }
            styles = styles || {};

            // Parse inline style if exists
            const inlineStyleMatch = tagAttrs.match(/style="([^"]+)"/);
            if (inlineStyleMatch) {
                const inlineStyles = this.parseCss(inlineStyleMatch[1].replace(/;/g, ';'));
                styles = { ...styles, ...inlineStyles };
            }

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
                    id, name: fullTagName, xy, size,
                    url: `ui://${this._buildId}${resId}`,
                    fill: 'scaleFree'
                });
                continue;
            }

            // Handle content if not self-closing
            let content = "";
            if (!isSelfClosing) {
                const closeTag = `</${fullTagName}>`;
                const startPos = tagMatch.index + tagMatch[0].length;
                const endPos = code.indexOf(closeTag, startPos);
                if (endPos !== -1) {
                    content = code.substring(startPos, endPos);
                }
            }

            // --- SVG EXTRACTION ---
            let svgData = "";
            const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
            if (svgMatch) {
                svgData = svgMatch[0];
            }

            if (svgData) {
                const resId = this.getNextResId();
                const fileName = `icon_${id}.svg`;
                
                this._resources.push({
                    id: resId,
                    name: fileName,
                    type: 'image',
                    data: svgData
                });

                displayList.ele('loader', {
                    id, name: fullTagName, xy, size,
                    url: `ui://${this._buildId}${resId}`,
                    fill: 'scaleFree'
                });
                continue;
            }

            // --- TEXT OR GRAPH ---
            // Only process if it was a Styled component or had text
            const cleanText = content.replace(/<[^>]+>.*?<\/[^>]+>/gs, '').replace(/<[^>]+>/gs, '').trim();

            if (fullTagName.toLowerCase().includes('button')) {
                displayList.ele('component', { id, name: fullTagName, xy, size, extention: 'Button' }).ele('Button', { title: cleanText });
            } else if (cleanText.length > 0) {
                displayList.ele('text', { id, name: fullTagName, xy, size, fontSize: styles.fontSize || '12', color: styles.color || '#000000', text: cleanText });
            } else if (isStyledTag) {
                displayList.ele('graph', { id, name: fullTagName, xy, size, type: 'rect', fillColor: styles.background || '#cccccc' });
            }
        }
        return component.end({ pretty: true });
    }

    private parseCss(css: string): any {
        const styles: any = {};
        // Handle both standard CSS and React inline style (key: value)
        const rules = css.includes(';') ? css.split(';') : css.split(',');
        rules.forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const prop = parts[0].trim().toLowerCase(), val = parts[1].trim().replace(/['"]/g, '');
            if (['width', 'height', 'left', 'top'].includes(prop)) styles[prop] = val.replace('px', '');
            else if (['color', 'background'].includes(prop)) styles[prop] = val;
            else if (prop === 'font-size') styles['fontSize'] = val.replace('px', '');
        });
        return styles;
    }
}
