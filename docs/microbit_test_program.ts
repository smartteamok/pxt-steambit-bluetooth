// STEAMbit — programa de prueba integral para micro:bit V2 (MakeCode).
// Pegar en la vista JavaScript de makecode.microbit.org.
//
// Requisitos del proyecto MakeCode (¡se pierden al crear un proyecto nuevo!):
//   1. Extensión "bluetooth" agregada (excluyente con "radio").
//   2. ⚙ Configuración del proyecto → "No Pairing Required: Anyone can
//      connect via Bluetooth" ACTIVADO.
//
// Convención de etiquetas (DECISIONS.md D7): los comandos app → micro:bit
// usan letras A–Z elegidas en la app (acá: A = interruptor, M = terminal);
// la telemetría micro:bit → app usa etiquetas declaradas con R| (temp,
// sonido), que la app ofrece como sugerencias al estar conectado.
//
// Sincronización (DECISIONS.md D8): al terminar de conectar, la app manda
// C|_sync|1 y el micro:bit responde con sus R|. Los R| enviados apenas se
// conecta pueden perderse si el teléfono todavía no se suscribió.

// PRIMERO: iniciar el servicio UART (obligatorio antes de usar cualquier
// función uart* o registrar onUartDataReceived — ver referencia MakeCode)
bluetooth.startUartService()

let linea = ""
let partes: string[] = []
let conectado = false

// Declara los registros (pausas cortas para no desbordar el buffer TX)
function declarar() {
    bluetooth.uartWriteString("R|temp|num|r|C\n")
    basic.pause(50)
    bluetooth.uartWriteString("R|sonido|num|r|\n")
    basic.pause(50)
    bluetooth.uartWriteString("R|A|bool|w|\n")
    basic.pause(50)
    bluetooth.uartWriteString("R|M|text|w|\n")
}

bluetooth.onBluetoothConnected(function () {
    conectado = true
    basic.showIcon(IconNames.Yes)
    basic.pause(1000)
    basic.clearScreen()
})

bluetooth.onBluetoothDisconnected(function () {
    conectado = false
    basic.showIcon(IconNames.No)
})

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    linea = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    partes = linea.split("|")
    if (partes[0] != "C") {
        return
    }
    // Saludo de la app (D8): responder con las declaraciones
    if (partes[1] == "_sync") {
        declarar()
        return
    }
    //Label A: seleccionar en app
    if (partes[1] == "A") {
        if (partes[2] == "1") {
            basic.showIcon(IconNames.Heart)
        } else {
            basic.clearScreen()
        }
    } else if (partes[1] == "M") {  //Label M: seleccionar en app
        basic.showString(partes[2])
    } else if (partes[1] == "joy") {
        if (partes[2] == "U") {
            basic.showArrow(ArrowNames.North)
        } else if (partes[2] == "D") {
            basic.showArrow(ArrowNames.South)
        } else if (partes[2] == "L") {
            basic.showArrow(ArrowNames.West)
        } else if (partes[2] == "R") {
            basic.showArrow(ArrowNames.East)
        } else {
            basic.clearScreen()
        }
    } else if (partes[1] == "btnA" && partes[2] == "1") {
        basic.showString("A")
    } else if (partes[1] == "btnB" && partes[2] == "1") {
        basic.showString("B")
    }
})

input.onButtonPressed(Button.A, function () {
    if (conectado) {
        bluetooth.uartWriteString("E|botonA\n")
    }
})

basic.showString("BT")

// Telemetría cada 1 s (pausa entre mensajes para no desbordar el buffer TX)
basic.forever(function () {
    if (conectado) {
        bluetooth.uartWriteString("D|temp|" + input.temperature() + "\n")
        basic.pause(100)
        bluetooth.uartWriteString("D|sonido|" + input.soundLevel() + "\n")
    }
    basic.pause(900)
})
