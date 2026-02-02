import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';
import { ExportConfig, ItemType } from './Common';

export default class UIPackage {
    private _cfg: ExportConfig;
    private _buildId: string;
    private _nextItemIndex: number = 0;
    private _components: any[] = [];

    constructor(cfg: ExportConfig) {
        this._cfg = cfg;
        // Simple hash mock for now
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }

    public async exportPackage(): Promise<void> {
        console.log(`Starting export for ${this._cfg.packName}...`);
        
        // 1. Read and parse React code
        const code = await fs.readFile(this._cfg.reactFile, 'utf-8');
        
        // 2. Mock generating main.xml
        const mainXml = this.createMockMainXml();
        
        // 3. Ensure output directory
        const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
        await fs.ensureDir(packagePath);
        
        // 4. Write package.xml
        const pkgDesc = xmlbuilder.create('packageDescription');
        pkgDesc.att('id', this._buildId);
        const resNode = pkgDesc.ele('resources');
        resNode.ele('component', { id: 'n0', name: 'main.xml', path: '/', exported: 'true' });
        
        await fs.writeFile(path.join(packagePath, 'package.xml'), pkgDesc.end({ pretty: true }));
        await fs.writeFile(path.join(packagePath, 'main.xml'), mainXml);
        
        console.log(`Export finished! Package: ${this._cfg.packName}`);
    }

    private createMockMainXml(): string {
        const component = xmlbuilder.create('component');
        component.att('size', '1440,1024');
        const displayList = component.ele('displayList');
        
        displayList.ele('text', {
            id: 'n1',
            name: 'title',
            xy: '100,100',
            size: '200,50',
            fontSize: '24',
            color: '#000000',
            text: 'Hello React2FGUI'
        });
        
        return component.end({ pretty: true });
    }
}
