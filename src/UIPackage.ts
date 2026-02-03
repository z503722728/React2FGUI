import * as fs from 'fs-extra';
import * as path from 'path';
import { ExportConfig } from './Common';
import { ReactParser } from './parser/ReactParser';
import { XMLGenerator } from './generator/XMLGenerator';
import { SubComponentExtractor } from './generator/SubComponentExtractor';
import { ResourceInfo, UINode } from './models/UINode';
import { ObjectType } from './models/FGUIEnum';

export default class UIPackage {
    private _cfg: ExportConfig;
    private _buildId: string;
    private _resources: ResourceInfo[] = [];
    private _nextResId: number = 0;
    
    private _parser = new ReactParser();
    private _generator = new XMLGenerator();
    private _extractor = new SubComponentExtractor();

    constructor(cfg: ExportConfig) {
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }

    private getNextResId(): string {
        return 'res' + (this._nextResId++).toString(36);
    }

    public async exportPackage(): Promise<void> {
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
                } else {
                    await fs.writeFile(path.join(imgPath, res.name), res.data);
                }
            }
        }

        // 7. Write Sub-Component XMLs
        for (const res of this._resources) {
            if (res.type === 'component' && res.data) {
                // res.data contains the JSON string of the UINode tree for this component
                const compNode = JSON.parse(res.data) as UINode;
                
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

    private extractStyles(code: string): Record<string, any> {
        const styleMap: Record<string, any> = {};
        const styledRegex = /const\s+(Styled\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        let sMatch;
        while ((sMatch = styledRegex.exec(code)) !== null) {
            styleMap[sMatch[1]] = this.parseCss(sMatch[3]);
        }
        return styleMap;
    }

    private processResourcesRecursive(nodes: UINode[]): void {
        const uniqueSrcMap = new Map<string, string>(); 

        const visit = (node: UINode) => {
            if (node.src && node.type !== ObjectType.Button && node.type !== ObjectType.Component) {
                // Handle Images / Loaders
                if (uniqueSrcMap.has(node.src)) {
                    node.src = uniqueSrcMap.get(node.src);
                } else {
                    const resId = this.getNextResId();
                    const isBase64 = node.src.startsWith('data:image');
                    let ext = 'svg';
                    if (isBase64) {
                        const mimeMatch = node.src.match(/data:image\/([a-zA-Z0-9+.-]+);/);
                        if (mimeMatch) {
                            const mime = mimeMatch[1];
                            if (mime === 'svg+xml') ext = 'svg';
                            else if (mime === 'jpeg') ext = 'jpg';
                            else ext = mime;
                        } else {
                            ext = 'png';
                        }
                    } else if (node.src.endsWith('.png')) ext = 'png';
                    else if (node.src.endsWith('.jpg')) ext = 'jpg';

                    const fileName = isBase64 ? `img_${resId}.${ext}` : `icon_${resId}.${ext}`;
                    
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
            }

            if (node.children) {
                node.children.forEach(child => visit(child));
            }
        };

        nodes.forEach(root => visit(root));
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
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (camelKey !== key) styles[camelKey] = styles[key];
        });
        return styles;
    }
}
