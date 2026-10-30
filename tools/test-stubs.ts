// Stubs mínimos de la API de MakeCode para correr core.ts/blocks.ts/test.ts en Node (tools/run-tests.js).
declare var require: any; declare var process: any;
const __log: string[] = [];
const __fibers: (() => void)[] = [];
enum Delimiters { NewLine = 10 }
enum IconNames { Yes = 0 }
namespace serial { export function delimiters(d: Delimiters): string { return "\n" } }
namespace bluetooth {
    export function startUartService() { __log.push("startUartService") }
    export function onUartDataReceived(d: string, h: () => void) { __log.push("onUartDataReceived") }
    export function uartReadUntil(d: string): string { return "" }
    export function uartWriteString(s: string) { __log.push("TX " + s) }
}
namespace control {
    export function onEvent(src: number, v: number, h: () => void) { __log.push("onEvent " + src + "/" + v) }
    export function eventValue(): number { return 0 }
    export function inBackground(a: () => void) { __log.push("inBackground") }
    export function runInParallel(a: () => void) { __fibers.push(a) }
    export function assert(c: boolean, msg?: string) { if (!c) { console.log("ASSERTION FAILED: " + msg); process.exit(1) } }
}
namespace basic {
    export function pause(ms: number) { while (__fibers.length) __fibers.shift()() }
    export function showIcon(i: IconNames) { console.log("ALL TESTS PASSED (showIcon Yes)") }
}
