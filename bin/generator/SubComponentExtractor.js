"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubComponentExtractor = void 0;
const FGUIEnum_1 = require("../models/FGUIEnum");
/**
 * SubComponentExtractor: Walks the UINode tree and extracts Containers into proper FGUI Component References.
 */
class SubComponentExtractor {
    constructor() {
        this._newResources = [];
        this._nextCompId = 0;
    }
    extract(rootNodes) {
        this._newResources = [];
        this._nextCompId = 0;
        // Process all roots
        // Note: We typically don't extract the ROOT itself if it's the main component, 
        // effectively we process its children. But if the root itself is a semantic block inside our main view,
        // we might handle it. For now, let's process the root's children recursively.
        for (const root of rootNodes) {
            this.processNodeRef(root);
        }
        return this._newResources;
    }
    /**
     * Recursively process nodes.
     * Use a specialized function to handle the children list so we can replace nodes in place.
     */
    processNodeRef(node) {
        var _a;
        if (!node.children || node.children.length === 0)
            return;
        // 1. Process children first (Bottom-Up extraction)
        // This ensures nested components (Input inside Tomato) are extracted first,
        // so 'Tomato' will contain a reference to 'Input', not the raw Input nodes.
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            // Recurse first
            if (child.children && child.children.length > 0) {
                this.processNodeRef(child);
            }
            // 2. Evaluate if 'child' should be extracted
            // Automated Stuctural Rule: If it's a Component (Div with children), extract it.
            // Exception: If it's the *only* child and just a wrapper, maybe skip? 
            // For now, strict 'div with content' rule.
            // Also skip Button types here if we want them inline, but usually buttons are better as components too.
            // Let's stick to the plan: Containers -> Components.
            if (child.type === FGUIEnum_1.ObjectType.Component || child.type === FGUIEnum_1.ObjectType.Group || child.type === FGUIEnum_1.ObjectType.Button) {
                // Heuristic: Is it complex enough?
                // If it only has 1 child and no background, it might be a useless wrapper.
                const hasBackground = child.styles.background || ((_a = child.customProps['data-layer']) === null || _a === void 0 ? void 0 : _a.includes('Button'));
                const isComplex = child.children.length > 0;
                if (isComplex) {
                    // Extract!
                    const compRes = this.createSubComponentResource(child);
                    this._newResources.push(compRes);
                    // Transform 'child' into a Reference Node
                    // We modify 'child' in-place or replace it in the array.
                    // Replacing is cleaner for type consistency.
                    const refNode = {
                        id: child.id,
                        name: child.name,
                        type: FGUIEnum_1.ObjectType.Component, // It remains a component type in placement
                        x: child.x,
                        y: child.y,
                        width: child.width,
                        height: child.height,
                        styles: child.styles,
                        customProps: child.customProps,
                        children: [], // No children, it's a black box reference now
                        src: compRes.id, // Link to the new resource
                        asComponent: true // Mark for XML generator to treat as <component src="...">
                    };
                    node.children[i] = refNode;
                }
            }
        }
    }
    createSubComponentResource(node) {
        const id = `comp_` + node.name + `_` + (this._nextCompId++);
        const safeName = node.name.replace(/\s+/g, '');
        // Strip parent references to avoid circular JSON
        const cleanNode = this.stripParent(node);
        // Note: We don't stringify here if we change ResourceInfo, but for now we keep string data interface
        const compData = JSON.stringify(cleanNode);
        return {
            id: id,
            name: safeName,
            type: 'component',
            data: compData
        };
    }
    stripParent(node) {
        // Destructure to exclude parent, then recurse on children
        const { parent, ...rest } = node;
        const newNode = { ...rest, children: [] };
        if (node.children) {
            newNode.children = node.children.map(c => this.stripParent(c));
        }
        return newNode;
    }
}
exports.SubComponentExtractor = SubComponentExtractor;
