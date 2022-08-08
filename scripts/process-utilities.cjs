const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const fs = require('fs-extra');
const path = require('path');

const dateFormatsModuleFile = path.join(__dirname, '..', 'data', 'dateFormats.js');
const utilitiesPath = path.join(__dirname, '..', 'modules', 'zotero-utilities');

(async () => {
    try {
        const { stdout } = await exec('git fetch && git rev-list --count HEAD..origin/master', { cwd: utilitiesPath });
        const commitsBehind = parseInt(stdout);
        if (commitsBehind > 0) {
            console.warn(`Zotero Utilities submodule is ${commitsBehind} commits behind!`);
        }
    } catch (e) {
        console.error("Failed to check for Zotero Utilities updates!\n\n\t" + e.stderr);
    }

    const { version } = require(path.join(utilitiesPath, 'package.json'));
    
    console.log(`Using Zotero Utilities version ${version}`);

    const dateFormats = require(path.join(utilitiesPath, 'resource', 'dateFormats.json'));
    const dateFormatsModule = `export default Object.freeze(${JSON.stringify(dateFormats)});`;
    await fs.writeFile(dateFormatsModuleFile, dateFormatsModule);
})();