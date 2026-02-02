import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';
import { ExportConfig } from './Common';

/**
 * React2FGUI Parser - Styled Components to FGUI XML
 * Supports basic absolute positioning and styled text.
 */
export default class UIPackage {
    private _cfg: ExportConfig;
    private _buildId: string;
    private _nextItemIndex: number = 0;

    constructor(cfg: ExportConfig) {
        this._cfg = cfg;
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }

    public async exportPackage(): Promise<void> {
        console.log(`🚀 Transforming React into FGUI: ${this._cfg.packName}`);
        
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        const componentXml = this.parseReactToFgui(code);
        
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        await fs.ensureDir(packagePath);
        
        // Generate package.xml
        const pkgDesc = xmlbuilder.create('packageDescription');
        pkgDesc.att('id', this._buildId);
        const resNode = pkgDesc.ele('resources');
        resNode.ele('component', { id: 'n0', name: 'main.xml', path: '/', exported: 'true' });
        
        await fs.writeFile(path.join(packagePath, 'package.xml'), pkgDesc.end({ pretty: true }));
        await fs.writeFile(path.join(packagePath, 'main.xml'), componentXml);
        
        console.log(`✅ Success! Package generated at: ${packagePath}`);
    }

    private parseReactToFgui(code: string): string {
        const component = xmlbuilder.create('component');
        component.att('size', '1440,1024'); // Default canvas size
        const displayList = component.ele('displayList');

        // 1. Extract Styled Component definitions (very basic regex for demo)
        const styledRegex = /const\s+(\w+)\s+=\s+styled\.(\w+)`([\s\S]*?)`/g;
        const styleMap: { [key: string]: any } = {};
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
            } else if (compName.toLowerCase().includes('span') || content.trim().length > 0) {
                displayList.ele('text', {
                    id, name: compName, xy: `${styles.left || 0},${styles.top || 0}`,
                    size: `${styles.width || 200},${styles.height || 30}`,
                    fontSize: styles.fontSize || '12',
                    color: styles.color || '#000000',
                    text: content.trim()
                });
            } else {
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

    private parseCss(css: string): any {
        const styles: any = {};
        const rules = css.split(';');
        rules.forEach(rule => {
            const [prop, value] = rule.split(':').map(s => s.trim());
            if (!prop || !value) return;
            if (prop === 'width' || prop === 'height' || prop === 'left' || prop === 'top') {
                styles[prop] = value.replace('px', '');
            } else if (prop === 'color' || prop === 'background') {
                styles[prop] = value;
            } else if (prop === 'font-size') {
                styles['fontSize'] = value.replace('px', '');
            }
        });
        return styles;
    }
}
