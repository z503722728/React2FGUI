"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UIPackage_1 = __importDefault(require("./UIPackage"));
class React2FGUI {
    static main(argv) {
        if (argv.length < 4) {
            console.info('Usage: react2fgui <reactFile> <outPath> <packName> <subCom>');
            process.exit(1);
        }
        const cfg = {
            reactFile: argv[0],
            outPath: argv[1],
            packName: argv[2],
            subCom: argv[3]
        };
        const pack = new UIPackage_1.default(cfg);
        pack.exportPackage().catch(err => console.error(err));
    }
}
exports.default = React2FGUI;
// Entry point
React2FGUI.main(process.argv.slice(2));
