import * as fs from 'fs-extra';
import * as path from 'path';
import { ExportConfig } from './Common';
import { ReactParser } from './parser/ReactParser';
import { XMLGenerator } from './generator/XMLGenerator';
import { ResourceInfo, UINode } from './models/UINode';

export default class UIPackage {
    private _cfg: ExportConfig;
    private _buildId: string;
    private _resources: ResourceInfo[] = [];
    private _nextResId: number = 0;
    
    private _parser = new ReactParser();
    private _generator = new XMLGenerator();

    constructor(cfg: ExportConfig) {
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }

    private getNextResId(): string {
        return 'res' + (this._nextResId++).toString(36);
    }

    public async exportPackage(): Promise<void> {
        console.log(`🚀 Transforming React into FGUI (Architecture V2): ${this._cfg.packName}`);
        
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        
        // 1. Extract Styles
        const styleMap = this.extractStyles(code);
        
        // 2. Parse Source into Semantic Tree
        const nodes = this._parser.parse(code, styleMap);
        
        // 3. Process Resources (Identify & Prepare for export)
        this.processResources(nodes);
        
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        const imgPath = path.join(packagePath, 'img');
        await fs.ensureDir(packagePath);
        await fs.ensureDir(imgPath);
        
        // 4. Write Binary Resources (PNG/SVG)
        for (const res of this._resources) {
            if (res.data) {
                if (res.isBase64) {
                    const base64Parts = res.data.split(',');
                    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
                    await fs.writeFile(path.join(imgPath, res.name), Buffer.from(base64Data, 'base64'));
                } else {
                    await fs.writeFile(path.join(imgPath, res.name), res.data);
                }
            }
        }

        // 5. Generate XML Files using standardized Generator
        const componentXml = this._generator.generateComponentXml(nodes, this._buildId);
        const packageXml = this._generator.generatePackageXml(this._resources, this._buildId, this._cfg.packName);
        
        await fs.writeFile(path.join(packagePath, 'package.xml'), packageXml);
        await fs.writeFile(path.join(packagePath, 'main.xml'), componentXml);
        
        console.log(`✅ Success! Standardized FGUI Package generated at: ${packagePath}`);
    }

    private extractStyles(code: string): Record<string, any> {
        const styleMap: Record<string, any> = {};
        const styledRegex = /const\s+(Styled\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        let sMatch;
        while ((sMatch = styledRegex.exec(code)) !== null) {
            styleMap[sMatch[1]] = this.parseCss(sMatch[3]);
        }
        return styleMap;
    }

    private processResources(nodes: UINode[]): void {
        nodes.forEach(node => {
            if (node.src) {
                const resId = this.getNextResId();
                const isBase64 = node.src.startsWith('data:image');
                const ext = isBase64 ? (node.src.match(/data:image\/(png|jpeg|jpg)/)?.[1] || 'png') : 'svg';
                const fileName = isBase64 ? `img_${node.id}.${ext}` : `icon_${node.id}.svg`;
                
                const res: ResourceInfo = {
                    id: resId,
                    name: fileName,
                    type: 'image',
                    data: node.src,
                    isBase64: isBase64
                };
                
                this._resources.push(res);
                // Update node src to point to internal resource ID for the generator
                node.src = resId; 
            }
        });
    }

    private parseCss(css: string): any {
        const styles: any = {};
        const rules = css.split(';');
        rules.forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const prop = parts[0].trim().toLowerCase(), val = parts[1].trim();
            if (['width', 'height', 'left', 'top'].includes(prop)) styles[prop] = val.replace('px', '');
            else if (['color', 'background'].includes(prop)) styles[prop] = val;
            else if (prop === 'font-size') styles['fontSize'] = val.replace('px', '');
        });
        return styles;
    }
}
