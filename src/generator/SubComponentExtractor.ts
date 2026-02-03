import { UINode, ResourceInfo } from "../models/UINode";
import { ObjectType } from "../models/FGUIEnum";

/**
 * SubComponentExtractor: Walks the UINode tree and extracts Containers into proper FGUI Component References.
 */
export class SubComponentExtractor {
    private _newResources: ResourceInfo[] = [];
    private _nextCompId = 0;
    private _componentCache = new Map<string, ResourceInfo>();

    public extract(rootNodes: UINode[]): ResourceInfo[] {
        this._newResources = [];
        this._nextCompId = 0;
        this._componentCache.clear();

        for (const root of rootNodes) {
            this.processNodeRef(root);
        }

        return this._newResources;
    }

    private processNodeRef(node: UINode): void {
        if (!node.children || node.children.length === 0) return;

        // 1. Process children first (Bottom-Up extraction)
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            
            if (child.children && child.children.length > 0) {
                this.processNodeRef(child);
            }

            // 2. Evaluate if 'child' should be extracted
            if (child.type === ObjectType.Component || child.type === ObjectType.Group || child.type === ObjectType.Button) {
                const isComplex = child.children.length > 0;

                if (isComplex) {
                    // Extract!
                    const compRes = this.createSubComponentResource(child);
                    // Only add if not already in the list (referential check not needed due to map, but array needs it)
                    if (!this._newResources.find(r => r.id === compRes.id)) {
                        this._newResources.push(compRes);
                    }

                    // Transform 'child' into a Reference Node
                    const refNode: UINode = {
                        id: child.id,
                        name: child.name,
                        type: ObjectType.Component,
                        x: child.x,
                        y: child.y,
                        width: child.width,
                        height: child.height,
                        styles: child.styles,
                        customProps: child.customProps,
                        children: [],
                        src: compRes.id,
                        fileName: compRes.name + '.xml',
                        asComponent: true
                    };

                    node.children[i] = refNode;
                }
            }
        }
    }

    private createSubComponentResource(node: UINode): ResourceInfo {
        // Calculate Hash
        const hash = this.calculateStructuralHash(node);
        
        if (this._componentCache.has(hash)) {
            const cached = this._componentCache.get(hash)!;
            console.log(`[Dedupe] Reusing component ${cached.name} (${cached.id}) for ${node.name}`);
            return cached;
        }

        const id = `comp_` + node.name + `_` + (this._nextCompId++);
        const safeName = node.name.replace(/\s+/g, '');
        
        const cleanNode = this.stripParent(node);
        const compData = JSON.stringify(cleanNode);

        const newRes: ResourceInfo = {
            id: id,
            name: safeName,
            type: 'component',
            data: compData
        };

        this._componentCache.set(hash, newRes);
        return newRes;
    }

    private calculateStructuralHash(node: UINode): string {
        // We want to capture: Size, Styles, Content, Children Structure.
        // We exclude: id, name, parent, x, y (position doesn't matter for the definition, only size)
        
        const parts: any[] = [];
        
        // 1. Physical properties (Size)
        parts.push(node.width, node.height);
        
        // 2. Visual Properties
        // Sort style keys for consistency
        const styleKeys = Object.keys(node.styles || {}).sort();
        styleKeys.forEach(k => parts.push(k, node.styles[k]));
        
        // 3. Content
        if (node.text) parts.push('txt:', node.text);
        if (node.src) parts.push('src:', node.src);
        
        // 4. Children (Recursive)
        if (node.children) {
            node.children.forEach(c => parts.push(this.calculateStructuralHash(c)));
        }

        return JSON.stringify(parts);
    }

    private stripParent(node: UINode): UINode {
        const { parent, ...rest } = node;
        const newNode: UINode = { ...rest, children: [] };
        if (node.children) {
            newNode.children = node.children.map(c => this.stripParent(c));
        }
        return newNode;
    }
}
