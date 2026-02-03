import * as fs from 'fs-extra';
import * as path from 'path';
import { ExportConfig } from './Common';
import { ReactParser } from './parser/ReactParser';
import { XMLGenerator } from './generator/XMLGenerator';
import { ResourceInfo, UINode } from './models/UINode';
import { ObjectType } from './models/FGUIEnum';

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
            if (res.data && res.type === 'image') {
                if (res.isBase64) {
                    const base64Parts = res.data.split(',');
                    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
                    // Clean possible whitespace or garbage
                    const buffer = Buffer.from(base64Data.trim(), 'base64');
                    await fs.writeFile(path.join(imgPath, res.name), buffer);
                } else {
                    await fs.writeFile(path.join(imgPath, res.name), res.data);
                }
            }
        }

        // 5. Generate Component XMLs (Handles sub-components like Buttons)
        await this.generateSubComponents(nodes, packagePath);

        // 6. Generate XML Files using standardized Generator
        const componentXml = this._generator.generateComponentXml(nodes, this._buildId);
        const packageXml = this._generator.generatePackageXml(this._resources, this._buildId, this._cfg.packName);
        
        await fs.writeFile(path.join(packagePath, 'package.xml'), packageXml);
        await fs.writeFile(path.join(packagePath, 'main.xml'), componentXml);
        
        console.log(`✅ Success! Standardized FGUI Package generated at: ${packagePath}`);
    }

    private async generateSubComponents(nodes: UINode[], packagePath: string): Promise<void> {
        for (const node of nodes) {
            if (node.type === ObjectType.Button) {
                const buttonXml = `<?xml version="1.0" encoding="utf-8"?>
<component size="${node.width},${node.height}" extention="Button">
  <controller name="button" pages="0,up,1,down,2,over,3,selectedOver" selected="0"/>
  <displayList>
    <graph id="n1" name="bg" xy="0,0" size="${node.width},${node.height}" type="rect" fillColor="${node.styles.background || '#426B1F'}">
      <gearColor controller="button" pages="0,1,2,3" values="${node.styles.background || '#426B1F'},#333333,${node.styles.background || '#426B1F'},#333333"/>
    </graph>
    <text id="n2" name="title" xy="0,0" size="${node.width},${node.height}" fontSize="${node.styles['font-size'] || node.styles.fontSize || 12}" color="${node.styles.color || '#ffffff'}" align="center" vAlign="middle" autoSize="none" text="${node.text || ''}">
      <relation target="" sidePair="width-width,height-height"/>
    </text>
  </displayList>
  <Button downEffect="scale" downEffectValue="0.95"/>
</component>`;
                
                const fileName = `${node.name}.xml`;
                await fs.writeFile(path.join(fileName.includes('..') ? 'error.xml' : path.join(packagePath, fileName)), buttonXml);
                
                // Add to resources so it's registered in package.xml
                const resId = this.getNextResId();
                this._resources.push({
                    id: resId,
                    name: node.name, 
                    type: 'component'
                });
                
                node.src = resId;
            }
        }
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
        const uniqueSrcMap = new Map<string, string>(); 

        nodes.forEach(node => {
            if (node.src && node.type !== ObjectType.Button) {
                if (uniqueSrcMap.has(node.src)) {
                    node.src = uniqueSrcMap.get(node.src);
                    return;
                }

                const resId = this.getNextResId();
                const isBase64 = node.src.startsWith('data:image');
                const extMatch = node.src.match(/data:image\/(png|jpeg|jpg)/);
                const ext = isBase64 ? (extMatch ? extMatch[1] : 'png') : 'svg';
                const fileName = isBase64 ? `img_${resId}.${ext}` : `icon_${resId}.svg`;
                
                const res: ResourceInfo = {
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
        });
    }

    private parseCss(css: string): any {
        const styles: any = {};
        const rules = css.split(';');
        rules.forEach(rule => {
            const parts = rule.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            styles[key] = val.replace('px', '');
            // Also store camelCase for compatibility
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (camelKey !== key) styles[camelKey] = styles[key];
        });
        return styles;
    }
}
