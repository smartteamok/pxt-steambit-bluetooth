/*
 * STEAMbit bluetooth — núcleo (sin bloques).
 *
 * Habla con la app STEAMbit por el servicio UART de Bluetooth con el
 * protocolo de texto `TIPO|etiqueta|valor\n` (solo LF):
 *   C  comando app → micro:bit (lo único que se procesa al recibir)
 *   D  dato micro:bit → app
 *   E  evento micro:bit → app
 *   R  declaración `R|etiqueta|num/bool/text|r/w/rw|unidad`
 * Joystick: `C|joy|U/D/L/R/S`, `C|jx|n`, `C|jy|n`, `C|jr|n` (−100..100),
 * `C|btnA|1/0`, `C|btnB|1/0`.
 * Saludo (D8): al terminar de conectar la app manda `C|_sync|1` y el
 * micro:bit responde con sus `R|`. Las etiquetas `_*` son reservadas.
 *
 * Este archivo no tiene anotaciones de bloques: se puede mover tal cual a
 * otra extensión (STEAMbit 8) junto con blocks.ts.
 */
namespace steambitBluetooth {
    // Eventos CODAL (codal-microbit-v2, inc/bluetooth/ExternalEvents.h).
    const MICROBIT_ID_BLE = 1000
    const BLE_EVT_ANY = 0
    const BLE_EVT_CONNECTED = 1
    const BLE_EVT_DISCONNECTED = 2

    const MAX_LABEL_LENGTH = 16
    const MAX_TX_QUEUE = 24
    const TX_IDLE_POLL_MS = 20
    const SYNC_LABEL = "_sync"

    // Tipos de dato de R| ordenados del más específico al más general.
    const DATA_TYPES = ["bool", "num", "text"]

    let initialized = false
    let connected = false
    let synced = false

    // Último valor recibido por etiqueta (se conserva al desconectar).
    let valueLabels: string[] = []
    let valueTexts: string[] = []

    // Joystick: cada eje llega en su propio mensaje, se guarda el último.
    let joyDirection = "S"
    let joyX = 0
    let joyY = 0
    let joyRotation = 0
    let joyButtonA = false
    let joyButtonB = false

    // Declaraciones que se mandan como R| al recibir _sync.
    let declLabels: string[] = []
    let declTypes: string[] = []
    let declAccess: string[] = []

    // Cola TX: una línea por entrada. Las de clave no vacía se reemplazan
    // en su lugar (el último dato de una etiqueta pisa al pendiente).
    let txLines: string[] = []
    let txKeys: string[] = []
    let txGapMs = 100

    let connectHandlers: (() => void)[] = []
    let disconnectHandlers: (() => void)[] = []

    // Handlers de "al recibir": uno a la vez por handler; si llega otro
    // valor mientras corre, se vuelve a ejecutar con el último.
    let rxLabels: string[] = []
    let rxHandlers: ((value: number) => void)[] = []
    let rxBusy: boolean[] = []
    let rxPending: boolean[] = []
    let rxPendingValue: number[] = []

    /**
     * Inicia el servicio UART y registra los eventos BLE. Idempotente.
     */
    //% hidden=1
    export function init(): void {
        if (initialized) return
        initialized = true
        // Siempre primero: sin esto los uart* y onUartDataReceived no andan.
        bluetooth.startUartService()
        bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            handleLine(bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)))
        })
        // Escucha con valor ANY: registrar un evento con el mismo id y valor
        // borra al anterior (registerWithDal hace ignore + listen), pero
        // ignore(id, CONNECTED) no borra un listener ANY. Así un
        // bluetooth.onBluetoothConnected del alumno registrado después
        // convive con este.
        control.onEvent(MICROBIT_ID_BLE, BLE_EVT_ANY, function () {
            const value = control.eventValue()
            if (value == BLE_EVT_CONNECTED) setConnected(true)
            else if (value == BLE_EVT_DISCONNECTED) setConnected(false)
        })
        control.inBackground(txLoop)
    }

    // ----- Parser -----

    /**
     * true si la etiqueta cumple [A-Za-z0-9_]{1,16}.
     */
    //% hidden=1
    export function isValidLabel(label: string): boolean {
        if (!label || label.length > MAX_LABEL_LENGTH) return false
        for (let i = 0; i < label.length; i++) {
            const c = label.charCodeAt(i)
            const ok = (c >= 48 && c <= 57) || (c >= 65 && c <= 90)
                || (c >= 97 && c <= 122) || c == 95
            if (!ok) return false
        }
        return true
    }

    /**
     * Parsea una línea `C|etiqueta|valor`. Descarta \r y \n. Devuelve
     * [etiqueta, valor] o null si la línea no es un comando válido.
     */
    //% hidden=1
    export function parseCommand(line: string): string[] {
        if (!line) return null
        const clean = line.split("\r").join("").split("\n").join("")
        const parts = clean.split("|")
        if (parts.length != 3 || parts[0] != "C" || !isValidLabel(parts[1])) return null
        return [parts[1], parts[2]]
    }

    /**
     * Procesa una línea recibida por UART. Las inválidas se ignoran.
     */
    //% hidden=1
    export function handleLine(line: string): void {
        const cmd = parseCommand(line)
        if (!cmd) return
        const label = cmd[0]
        const value = cmd[1]
        if (label.charAt(0) == "_") {
            if (label == SYNC_LABEL) handleSync()
            return
        }
        if (handleJoystick(label, value)) return
        storeValue(label, value)
        dispatchReceive(label, toNumber(value))
    }

    /**
     * Convierte un valor del protocolo a número (0 si no es numérico).
     */
    //% hidden=1
    export function toNumber(text: string): number {
        if (!text) return 0
        const n = parseFloat(text)
        return isNaN(n) ? 0 : n
    }

    // ----- Valores de etiquetas -----

    function storeValue(label: string, value: string): void {
        const i = valueLabels.indexOf(label)
        if (i < 0) {
            valueLabels.push(label)
            valueTexts.push(value)
        } else {
            valueTexts[i] = value
        }
    }

    /**
     * Último valor recibido para la etiqueta ("" si nunca llegó).
     */
    //% hidden=1
    export function lastText(label: string): string {
        const i = valueLabels.indexOf(label)
        return i < 0 ? "" : valueTexts[i]
    }

    // ----- Joystick -----

    /**
     * true si la etiqueta es del joystick (no se guarda como valor común).
     */
    //% hidden=1
    export function isJoystickLabel(label: string): boolean {
        return label == "joy" || label == "jx" || label == "jy" || label == "jr"
            || label == "btnA" || label == "btnB"
    }

    function clampAxis(n: number): number {
        return Math.max(-100, Math.min(100, Math.round(n)))
    }

    function handleJoystick(label: string, value: string): boolean {
        if (label == "joy") joyDirection = value
        else if (label == "jx") joyX = clampAxis(toNumber(value))
        else if (label == "jy") joyY = clampAxis(toNumber(value))
        else if (label == "jr") joyRotation = clampAxis(toNumber(value))
        else if (label == "btnA") joyButtonA = value != "0" && value != ""
        else if (label == "btnB") joyButtonB = value != "0" && value != ""
        else return false
        return true
    }

    function resetJoystick(): void {
        joyDirection = "S"
        joyX = 0
        joyY = 0
        joyRotation = 0
        joyButtonA = false
        joyButtonB = false
    }

    /**
     * Última dirección de la cruceta: "U", "D", "L", "R" o "S" (detenida).
     */
    //% hidden=1
    export function joystickDirection(): string {
        return joyDirection
    }

    /**
     * Último valor de un eje: "x", "y" o "r" (giro). −100..100.
     */
    //% hidden=1
    export function joystickAxis(axis: string): number {
        if (axis == "x") return joyX
        if (axis == "y") return joyY
        if (axis == "r") return joyRotation
        return 0
    }

    /**
     * Velocidad de rueda para un robot de dos ruedas (−100..100):
     * izquierda = y + x + giro, derecha = y − x − giro, acotadas.
     */
    //% hidden=1
    export function wheelSpeed(left: boolean): number {
        const turn = joyX + joyRotation
        return clampAxis(left ? joyY + turn : joyY - turn)
    }

    /**
     * true si el botón "A" o "B" de la app está presionado.
     */
    //% hidden=1
    export function joystickButton(button: string): boolean {
        if (button == "A") return joyButtonA
        if (button == "B") return joyButtonB
        return false
    }

    // ----- Conexión -----

    /**
     * Actualiza el estado de conexión y despacha los handlers del alumno.
     * Al desconectar, joystick a detenida y ejes/botones a 0 (seguridad).
     */
    //% hidden=1
    export function setConnected(value: boolean): void {
        // handleSync ya pudo marcar la conexión: no borrar sus R| pendientes.
        if (value != connected) {
            connected = value
            synced = false
            txLines = []
            txKeys = []
            if (!value) resetJoystick()
        }
        // En paralelo: una pausa del alumno no demora el reset de seguridad
        // ni el próximo evento de conexión.
        const handlers = value ? connectHandlers : disconnectHandlers
        for (let i = 0; i < handlers.length; i++) control.runInParallel(handlers[i])
    }

    /**
     * true si la app está conectada.
     */
    //% hidden=1
    export function isConnected(): boolean {
        return connected
    }

    //% hidden=1
    export function addConnectHandler(handler: () => void): void {
        connectHandlers.push(handler)
    }

    //% hidden=1
    export function addDisconnectHandler(handler: () => void): void {
        disconnectHandlers.push(handler)
    }

    // ----- Al recibir -----

    //% hidden=1
    export function addReceiveHandler(label: string, handler: (value: number) => void): void {
        rxLabels.push(label)
        rxHandlers.push(handler)
        rxBusy.push(false)
        rxPending.push(false)
        rxPendingValue.push(0)
    }

    function dispatchReceive(label: string, value: number): void {
        for (let i = 0; i < rxLabels.length; i++) {
            if (rxLabels[i] == label) runReceiveHandler(i, value)
        }
    }

    function runReceiveHandler(i: number, value: number): void {
        if (rxBusy[i]) {
            rxPending[i] = true
            rxPendingValue[i] = value
            return
        }
        rxBusy[i] = true
        control.runInParallel(function () {
            rxHandlers[i](value)
            while (rxPending[i]) {
                rxPending[i] = false
                rxHandlers[i](rxPendingValue[i])
            }
            rxBusy[i] = false
        })
    }

    // ----- Declaraciones (R|) -----

    /**
     * Registra una etiqueta usada por un bloque. type: "num", "bool" o
     * "text"; access desde la app: "r" (la app lee) o "w" (la app escribe).
     * Si se usa de varias formas queda el tipo más general y acceso "rw".
     */
    //% hidden=1
    export function declare(label: string, type: string, access: string): void {
        if (!isValidLabel(label) || label.charAt(0) == "_" || isJoystickLabel(label)) return
        let i = declLabels.indexOf(label)
        if (i < 0) {
            declLabels.push(label)
            declTypes.push(type)
            declAccess.push(access)
            i = declLabels.length - 1
        } else {
            const mergedType = DATA_TYPES.indexOf(type) > DATA_TYPES.indexOf(declTypes[i]) ? type : declTypes[i]
            const mergedAccess = declAccess[i] == access ? access : "rw"
            if (mergedType == declTypes[i] && mergedAccess == declAccess[i]) return
            declTypes[i] = mergedType
            declAccess[i] = mergedAccess
        }
        // Etiqueta nueva o cambiada después del saludo: avisar ya.
        if (synced) enqueue("R|" + label, registerLine(i))
    }

    function registerLine(i: number): string {
        return "R|" + declLabels[i] + "|" + declTypes[i] + "|" + declAccess[i] + "|\n"
    }

    function handleSync(): void {
        connected = true
        synced = true
        for (let i = 0; i < declLabels.length; i++) {
            enqueue("R|" + declLabels[i], registerLine(i))
        }
    }

    // ----- TX -----

    /**
     * Quita del valor los caracteres que rompen el protocolo (| \n \r).
     */
    //% hidden=1
    export function cleanValue(value: string): string {
        return value.split("|").join("").split("\n").join("").split("\r").join("")
    }

    /**
     * Envía `D|etiqueta|valor` y declara la etiqueta como leída por la app.
     * type: "num", "bool" o "text". Etiquetas inválidas o reservadas se
     * ignoran.
     */
    //% hidden=1
    export function sendDataLine(label: string, value: string, type: string): void {
        if (!isValidLabel(label) || label.charAt(0) == "_") return
        declare(label, type, "r")
        enqueue("D|" + label, "D|" + label + "|" + cleanValue(value) + "\n")
    }

    /**
     * Envía `E|nombre`. Los eventos no se reemplazan en la cola.
     */
    //% hidden=1
    export function sendEventLine(name: string): void {
        if (!isValidLabel(name) || name.charAt(0) == "_") return
        enqueue("", "E|" + name + "\n")
    }

    /**
     * Encola una línea para enviar a la app. Si key no es vacía y ya hay una
     * línea pendiente con esa clave, la reemplaza. Sin conexión se descarta.
     */
    //% hidden=1
    export function enqueue(key: string, line: string): void {
        if (!connected) return
        if (key) {
            const i = txKeys.indexOf(key)
            if (i >= 0) {
                txLines[i] = line
                return
            }
        }
        if (txLines.length >= MAX_TX_QUEUE) return
        txLines.push(line)
        txKeys.push(key)
    }

    /**
     * Copia de las líneas pendientes de envío (para pruebas).
     */
    //% hidden=1
    export function pendingLines(): string[] {
        return txLines.slice(0)
    }

    /**
     * Pausa mínima entre envíos por UART, en ms.
     */
    //% hidden=1
    export function setTxGap(ms: number): void {
        txGapMs = Math.max(0, ms)
    }

    function txLoop(): void {
        while (true) {
            if (txLines.length > 0) {
                const line = txLines.shift()
                txKeys.shift()
                bluetooth.uartWriteString(line)
                basic.pause(txGapMs)
            } else {
                basic.pause(TX_IDLE_POLL_MS)
            }
        }
    }

    // Arranca al cargar el programa, antes del código del alumno: así
    // startUartService va primero y los eventos BLE de la extensión quedan
    // registrados antes que los del alumno.
    init()
}
