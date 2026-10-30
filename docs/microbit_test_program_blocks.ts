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
//   - Al desconectar: cruceta detenida, ejes y botones en 0.
//
// Joysticks: cruceta → flecha; joystick 360° → un punto en la matriz
// (x a la derecha, y hacia arriba); botones A/B → la letra. Las velocidades
// de rueda (izq/der) se mandan como telemetría para verlas en el Monitor.

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
let dibujando = false
basic.showString("BT")
// Telemetría cada 1 s
basic.forever(function () {
    if (steambitBluetooth.appConnected()) {
        steambitBluetooth.sendNumber("temp", input.temperature())
        steambitBluetooth.sendNumber("sonido", input.soundLevel())
        steambitBluetooth.sendNumber("izq", steambitBluetooth.wheelSpeed(steambitBluetooth.Wheel.Left))
        steambitBluetooth.sendNumber("der", steambitBluetooth.wheelSpeed(steambitBluetooth.Wheel.Right))
    }
    basic.pause(1000)
})
// Joysticks
basic.forever(function () {
    if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Forward)) {
        basic.showArrow(ArrowNames.North)
        dibujando = true
    } else if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Backward)) {
        basic.showArrow(ArrowNames.South)
        dibujando = true
    } else if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Left)) {
        basic.showArrow(ArrowNames.West)
        dibujando = true
    } else if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Right)) {
        basic.showArrow(ArrowNames.East)
        dibujando = true
    } else if (steambitBluetooth.joystick(steambitBluetooth.JoystickAxis.X) != 0 || steambitBluetooth.joystick(steambitBluetooth.JoystickAxis.Y) != 0) {
        basic.clearScreen()
        led.plot(Math.round(Math.map(steambitBluetooth.joystick(steambitBluetooth.JoystickAxis.X), -100, 100, 0, 4)), Math.round(Math.map(steambitBluetooth.joystick(steambitBluetooth.JoystickAxis.Y), 100, -100, 0, 4)))
        dibujando = true
    } else if (dibujando) {
        basic.clearScreen()
        dibujando = false
    }
    if (steambitBluetooth.buttonPressed(steambitBluetooth.AppButton.A)) {
        basic.showString("A")
    }
    if (steambitBluetooth.buttonPressed(steambitBluetooth.AppButton.B)) {
        basic.showString("B")
    }
})
