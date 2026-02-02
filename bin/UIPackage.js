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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const xmlbuilder = __importStar(require("xmlbuilder"));
class UIPackage {
    constructor(cfg) {
        this._nextItemIndex = 0;
        this._components = [];
        this._cfg = cfg;
        // Simple hash mock for now
        this._buildId = 'r2f' + Math.random().toString(36).substring(2, 7);
    }
    exportPackage() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Starting export for ${this._cfg.packName}...`);
            // 1. Read and parse React code
            const code = yield fs.readFile(this._cfg.reactFile, 'utf-8');
            // 2. Mock generating main.xml
            const mainXml = this.createMockMainXml();
            // 3. Ensure output directory
            const packagePath = path.join(this._cfg.outPath, this._cfg.packName);
            yield fs.ensureDir(packagePath);
            // 4. Write package.xml
            const pkgDesc = xmlbuilder.create('packageDescription');
            pkgDesc.att('id', this._buildId);
            const resNode = pkgDesc.ele('resources');
            resNode.ele('component', { id: 'n0', name: 'main.xml', path: '/', exported: 'true' });
            yield fs.writeFile(path.join(packagePath, 'package.xml'), pkgDesc.end({ pretty: true }));
            yield fs.writeFile(path.join(packagePath, 'main.xml'), mainXml);
            console.log(`Export finished! Package: ${this._cfg.packName}`);
        });
    }
    createMockMainXml() {
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
exports.default = UIPackage;
