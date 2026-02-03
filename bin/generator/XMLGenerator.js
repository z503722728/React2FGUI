"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.XMLGenerator = void 0;
const xmlbuilder = __importStar(require("xmlbuilder"));
const FGUIEnum_1 = require("../models/FGUIEnum");
const PropertyMapper_1 = require("../mapper/PropertyMapper");
/**
 * XMLGenerator: Responsible for producing valid FGUI XML files.
 */
class XMLGenerator {
    constructor() {
        this._mapper = new PropertyMapper_1.PropertyMapper();
    }
    /**
     * Generates component XML from a list of UI nodes.
     * Recursively processes children if present in the 'nodes' tree.
     */
    generateComponentXml(nodes, buildId) {
        const component = xmlbuilder.create('component').att('size', '1440,1024');
        const displayList = component.ele('displayList');
        nodes.forEach(node => {
            this.generateNodeXml(node, displayList, buildId);
        });
        return component.end({ pretty: true });
    }
    /**
     * Generates XML for a single node and appends it to the parent XML element.
     */
    generateNodeXml(node, parentEle, buildId) {
        const attributes = this._mapper.mapAttributes(node);
        let eleName = 'graph';
        // Check if this node is a placeholder for an extracted component
        if (node.asComponent && node.src) {
            eleName = 'component';
            attributes.src = node.src;
            // Clear other unrelated attributes that might confuse FGUI or valid XML
            delete attributes.type;
            delete attributes.fillColor;
        }
        else {
            // Standard Mapping
            switch (node.type) {
                case FGUIEnum_1.ObjectType.Text:
                    eleName = 'text';
                    break;
                case FGUIEnum_1.ObjectType.Image:
                    eleName = 'image';
                    if (node.src) {
                        attributes.src = node.src;
                        delete attributes.fill;
                    }
                    break;
                case FGUIEnum_1.ObjectType.Loader:
                    eleName = 'loader';
                    if (node.src) {
                        attributes.url = `ui://${buildId}${node.src}`;
                    }
                    break;
                case FGUIEnum_1.ObjectType.Button:
                    // Only used if Button logic is manual/inline, but usually handled via sub-components now
                    eleName = 'component';
                    if (node.src)
                        attributes.src = node.src;
                    break;
                case FGUIEnum_1.ObjectType.InputText:
                    eleName = 'text';
                    attributes.input = "true";
                    break;
                case FGUIEnum_1.ObjectType.Component:
                case FGUIEnum_1.ObjectType.Graph:
                case FGUIEnum_1.ObjectType.Group:
                    eleName = 'graph';
                    // If it's a container that wasn't extracted (maybe empty or ignored), render as graph placeholder
                    // or group (if we implement groups).
                    if (node.children && node.children.length > 0) {
                        // FGUI is flat list per component.
                        // If we did NOT extract this component, we must flatten its children into the current display list.
                        // The Parser gives us children with coordinates relative to THIS node.
                        // So we need to offset them by THIS node's x/y before adding to displayList.
                        // Recursive Flattening for non-extracted containers
                        node.children.forEach(child => {
                            // Clone child to avoid mutating original tree potentially
                            const flattenedChild = { ...child };
                            flattenedChild.x = node.x + child.x;
                            flattenedChild.y = node.y + child.y;
                            this.generateNodeXml(flattenedChild, parentEle, buildId);
                        });
                        return; // Don't render the container graph itself, just its children
                    }
                    break;
            }
        }
        parentEle.ele(eleName, attributes);
    }
    /**
     * Generates package.xml description.
     */
    generatePackageXml(resources, buildId, packName) {
        const pkgDesc = xmlbuilder.create('packageDescription').att('id', buildId);
        const resNode = pkgDesc.ele('resources');
        // Main component is always present
        resNode.ele('component', { id: 'main_id', name: 'main.xml', path: '/', exported: 'true' });
        resources.forEach(res => {
            const resAttr = {
                id: res.id,
                name: res.name,
                path: res.type === 'image' ? '/img/' : '/',
                exported: 'true'
            };
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
exports.XMLGenerator = XMLGenerator;
