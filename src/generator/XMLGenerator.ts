import * as xmlbuilder from 'xmlbuilder';
import { UINode, ResourceInfo } from '../models/UINode';
import { ObjectType } from '../models/FGUIEnum';
import { PropertyMapper } from '../mapper/PropertyMapper';

/**
 * XMLGenerator: Responsible for producing valid FGUI XML files.
 */
export class XMLGenerator {
    private _mapper = new PropertyMapper();

    /**
     * Generates component XML from a list of UI nodes.
     */
    public generateComponentXml(nodes: UINode[], buildId: string): string {
        const component = xmlbuilder.create('component').att('size', '1440,1024');
        const displayList = component.ele('displayList');

        nodes.forEach(node => {
            const attributes = this._mapper.mapAttributes(node);
            let eleName = 'graph';

            switch (node.type) {
                case ObjectType.Text:
                    eleName = 'text';
                    break;
                case ObjectType.Image:
                case ObjectType.Loader:
                    eleName = 'loader';
                    if (node.src) {
                        // In V2, node.src holds the internal resource ID (resId)
                        attributes.url = `ui://${buildId}${node.src}`;
                    }
                    break;
                case ObjectType.Button:
                    eleName = 'component';
                    if (node.src) {
                        attributes.src = node.src; // Points to the resId of the component
                    }
                    break;
                case ObjectType.Component:
                    // If we reach here, we'll use a graph as a placeholder since sub-component XMLs aren't generated yet
                    eleName = 'graph';
                    attributes.type = "rect";
                    attributes.fillColor = node.styles.background || "#eeeeee";
                    break;
                case ObjectType.InputText:
                    eleName = 'text'; 
                    attributes.input = "true";
                    break;
                case ObjectType.Graph:
                    eleName = 'graph';
                    break;
            }

            const element = displayList.ele(eleName, attributes);

            // Special sub-elements for top-level MainUI Buttons
            // (In FGUI, if a component is used as a Button inside another component, 
            // the <Button> tag is optional here unless overriding props)
        });

        return component.end({ pretty: true });
    }

    /**
     * Generates package.xml description.
     */
    public generatePackageXml(resources: ResourceInfo[], buildId: string, packName: string): string {
        const pkgDesc = xmlbuilder.create('packageDescription').att('id', buildId);
        const resNode = pkgDesc.ele('resources');

        // Main component is always present
        resNode.ele('component', { id: 'main_id', name: 'main.xml', path: '/', exported: 'true' });

        resources.forEach(res => {
            const resAttr: any = { 
                id: res.id, 
                name: res.name, 
                path: res.type === 'image' ? '/img/' : '/', 
                exported: 'true' 
            };
            
            // FGUI expects component names in package.xml to have the .xml extension
            if (res.type === 'component' && !res.name.endsWith('.xml')) {
                resAttr.name = res.name + '.xml';
            }

            resNode.ele(res.type, resAttr);
        });

        const publish = pkgDesc.ele('publish', { name: packName });
        publish.ele('atlas', { name: 'Default', index: 0 });

        return pkgDesc.end({ pretty: true });
    }
}
