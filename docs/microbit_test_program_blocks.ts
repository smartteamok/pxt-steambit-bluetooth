// STEAMbit — programa de prueba hecho SOLO con bloques de la extensión
// "STEAMbit bluetooth" (equivalente a microbit_test_program.ts, sin strings
// del protocolo). Pegar en la vista JavaScript de makecode.microbit.org y
// volver a Bloques: todo tiene que quedar en bloques, sin bloques grises.
//
// Requisitos del proyecto MakeCode (¡se pierden al crear un proyecto nuevo!):
//   1. Extensión "STEAMbit bluetooth" agregada (trae "bluetooth"; excluyente
//      con "radio").
//   2. ⚙ Configuración del proyecto → "No Pairing Required: Anyone can
//      connect via Bluetooth" ACTIVADO.
//
// Qué hace la extensión sola (antes había que programarlo):
//   - startUartService() antes que nada.
//   - Responder al saludo C|_sync|1 con los R| de las etiquetas usadas por
//     los bloques: temp y sonido (num, r), A (bool, w), M (text, w).
//   - Espaciar los envíos (100 ms entre mensajes).

steambitBluetooth.onAppConnected(function () {
    basic.showIcon(IconNames.Yes)
    basic.pause(1000)
    basic.clearScreen()
})
steambitBluetooth.onAppDisconnected(function () {
    basic.showIcon(IconNames.No)
})
// Interruptor A (valores 1/0): corazón encendido / apagado
steambitBluetooth.onReceive("A", function (value) {
    if (steambitBluetooth.isOn("A")) {
        basic.showIcon(IconNames.Heart)
    } else {
        basic.clearScreen()
    }
})
// Terminal M: el texto recibido desfila en la pantalla
steambitBluetooth.onReceive("M", function (value) {
    basic.showString(steambitBluetooth.textValue("M"))
})
input.onButtonPressed(Button.A, function () {
    if (steambitBluetooth.appConnected()) {
        steambitBluetooth.sendAppEvent("botonA")
    }
})
basic.showString("BT")
// Telemetría cada 1 s
basic.forever(function () {
    if (steambitBluetooth.appConnected()) {
        steambitBluetooth.sendNumber("temp", input.temperature())
        steambitBluetooth.sendNumber("sonido", input.soundLevel())
    }
    basic.pause(1000)
})
