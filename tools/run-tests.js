// Ejecuta test.ts en Node con stubs mínimos de la API de MakeCode
// (bluetooth, control, basic). El simulador de micro:bit necesita navegador
// y `pxt run` no carga bluetooth, así que esta es la forma de correr las
// pruebas del núcleo sin hardware. Uso (desde la raíz del repo, después de
// `pxt target microbit`):
//     node tools/run-tests.js
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/pxt-core/pxtcompiler/ext-typescript/lib/typescript.js"));
const src = ["tools/test-stubs.ts", "core.ts", "blocks.ts", "test.ts"]
    .map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
eval(ts.transpile(src, { target: ts.ScriptTarget.ES2017 }));
