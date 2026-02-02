import UIPackage from "./UIPackage";
import { ExportConfig } from "./Common";

export default class React2FGUI {
    public static main(argv: string[]) {
        if (argv.length < 4) {
            console.info('Usage: react2fgui <reactFile> <outPath> <packName> <subCom>');
            process.exit(1);
        }

        const cfg: ExportConfig = {
            reactFile: argv[0],
            outPath: argv[1],
            packName: argv[2],
            subCom: argv[3]
        };

        const pack = new UIPackage(cfg);
        pack.exportPackage().catch(err => console.error(err));
    }
}

// Entry point
React2FGUI.main(process.argv.slice(2));
