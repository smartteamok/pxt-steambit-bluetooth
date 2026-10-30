// Compila un programa que usa la extensión y lo decompila a bloques, como
// cuando se pega JavaScript en el editor y se vuelve a Bloques. Falla si
// queda algún bloque gris. Uso (desde la raíz del repo):
//     node tools/check-blocks.js docs/microbit_test_program_blocks.ts
// `pxt decompile` no sirve acá: exige el repo fuente de pxt-core y solo
// acepta dependencias empaquetadas; este script usa el Host normal de la CLI.
const fs = require("fs");
const path = require("path");
const Module = require("module");
const child = require("child_process");
const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || "docs/microbit_test_program_blocks.ts");
const dir = path.join(root, "built", "check-blocks");
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(input, path.join(dir, "main.ts"));
fs.writeFileSync(path.join(dir, "pxt.json"), JSON.stringify({
    name: "check-blocks", version: "0.0.0",
    dependencies: { core: "*", bluetooth: "*", "steambit-bluetooth": "file:../.." },
    files: ["main.ts"], preferredEditor: "blocksprj"
}, null, 4));
process.chdir(dir);
child.execSync("pxt install && pxt build", { stdio: "inherit" });

const real = fs.realpathSync(path.join(root, "node_modules/pxt-core/built/pxt.js"));
let src = fs.readFileSync(real, "utf8");
const before = 'new pxt.MainPackage(new SnippetHost("decompile-pkg", inPackages, dep, true))';
if (src.indexOf(before) < 0) throw new Error("pxt cambió: no se encontró el punto a parchear");
src = src.replace(before, "new pxt.MainPackage(new Host())");
const m = new Module(real, module);
m.filename = real;
m.paths = Module._nodeModulePaths(path.dirname(real));
m._compile(src, real);
process.on("exit", () => {
    const xml = fs.readFileSync(path.join(dir, "main.blocks"), "utf8");
    const types = xml.match(/type="[a-z_]+"/g) || [];
    const grey = types.filter(t => t.indexOf("typescript_") >= 0);
    console.log(`${types.length} bloques, ${grey.length} grises`);
    if (grey.length) process.exitCode = 1;
});
m.exports.mainCli(path.join(root, "node_modules/pxt-microbit"), ["decompile", "main.ts"]);
