const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const fs = require('fs-extra');
const path = require('path');

const schemaModuleFile = path.join(__dirname, '..', 'data', 'zotero-schema.js');
const schemaModulePath = path.join(__dirname, '..', 'modules', 'zotero-schema');

(async () => {
    try {
        const { stdout } = await exec('git fetch && git rev-list --count HEAD..origin/master', { cwd: schemaModulePath });
        const commitsBehind = parseInt(stdout);
        if (commitsBehind > 0) {
            console.warn(`Zotero Schema submodule is ${commitsBehind} commits behind!`);
        }
    } catch (e) {
        console.error("Failed to check for Zotero Schema updates!\n\n\t" + e.stderr);
    }

    const schema = require(path.join(schemaModulePath, 'schema.json'));

    console.log(`Using Zotero Schema version ${schema.version}`);

    const schemaModule = `export default Object.freeze(${JSON.stringify(schema)});`;
    await fs.writeFile(schemaModuleFile, schemaModule);
})();
