// Pruebas del núcleo: se compilan con `pxt build` (no se incluyen al
// importar la extensión). Si alguna falla, el micro:bit/simulador entra en
// panic 098 y la consola muestra el mensaje; si pasan todas, muestra ✓.

function check(condition: boolean, msg: string) {
    control.assert(condition, msg)
}

// ----- Parser -----
check(steambitBluetooth.isValidLabel("A"), "label A")
check(steambitBluetooth.isValidLabel("temp_1"), "label temp_1")
check(steambitBluetooth.isValidLabel("abcdefghijklmnop"), "label 16")
check(!steambitBluetooth.isValidLabel("abcdefghijklmnopq"), "label 17")
check(!steambitBluetooth.isValidLabel(""), "label empty")
check(!steambitBluetooth.isValidLabel("a b"), "label space")
check(!steambitBluetooth.isValidLabel("año"), "label ñ")

let cmd = steambitBluetooth.parseCommand("C|A|1")
check(cmd != null && cmd[0] == "A" && cmd[1] == "1", "parse C|A|1")
cmd = steambitBluetooth.parseCommand("C|M|hola mundo\r")
check(cmd != null && cmd[1] == "hola mundo", "parse strips CR")
cmd = steambitBluetooth.parseCommand("C|A|")
check(cmd != null && cmd[1] == "", "parse empty value")
check(steambitBluetooth.parseCommand("D|A|1") == null, "ignore D")
check(steambitBluetooth.parseCommand("C|A") == null, "too few parts")
check(steambitBluetooth.parseCommand("C|A|1|2") == null, "too many parts")
check(steambitBluetooth.parseCommand("C|a b|1") == null, "bad label")
check(steambitBluetooth.parseCommand("") == null, "empty line")
check(steambitBluetooth.parseCommand("basura") == null, "garbage")

check(steambitBluetooth.toNumber("42") == 42, "num 42")
check(steambitBluetooth.toNumber("-7.5") == -7.5, "num -7.5")
check(steambitBluetooth.toNumber("") == 0, "num empty")
check(steambitBluetooth.toNumber("hola") == 0, "num text")

check(steambitBluetooth.cleanValue("a|b\nc\r") == "abc", "clean value")

// ----- Estado de etiquetas -----
steambitBluetooth.handleLine("C|A|1")
check(steambitBluetooth.lastText("A") == "1", "store A")
steambitBluetooth.handleLine("C|A|0")
check(steambitBluetooth.lastText("A") == "0", "overwrite A")
steambitBluetooth.handleLine("C|A|1|x")
check(steambitBluetooth.lastText("A") == "0", "invalid line keeps A")
check(steambitBluetooth.lastText("Z") == "", "never received")
steambitBluetooth.handleLine("C|_sync|1")
check(steambitBluetooth.lastText("_sync") == "", "reserved not stored")

// ----- Al recibir: un handler a la vez, el último valor gana -----
let received: number[] = []
steambitBluetooth.addReceiveHandler("K", function (value: number) {
    received.push(value)
    basic.pause(50)
})
steambitBluetooth.handleLine("C|K|1")
steambitBluetooth.handleLine("C|K|2")
steambitBluetooth.handleLine("C|K|3")
basic.pause(300)
check(received.length == 2 && received[0] == 1 && received[1] == 3, "receive coalesced")

// ----- Joystick -----
steambitBluetooth.handleLine("C|joy|U")
check(steambitBluetooth.joystickDirection() == "U", "dpad U")
steambitBluetooth.handleLine("C|jx|50")
steambitBluetooth.handleLine("C|jy|80")
check(steambitBluetooth.joystickAxis("x") == 50, "axis x")
check(steambitBluetooth.joystickAxis("y") == 80, "axis y keeps x")
check(steambitBluetooth.wheelSpeed(true) == 100, "left wheel clamped")
check(steambitBluetooth.wheelSpeed(false) == 30, "right wheel")
steambitBluetooth.handleLine("C|jr|-150")
check(steambitBluetooth.joystickAxis("r") == -100, "rotation clamped")
steambitBluetooth.handleLine("C|btnA|1")
check(steambitBluetooth.joystickButton("A"), "btnA down")
check(!steambitBluetooth.joystickButton("B"), "btnB up")
check(steambitBluetooth.lastText("jx") == "", "joystick not stored as label")

// ----- Conexión, saludo y declaraciones -----
// El _sync de arriba ya marcó la conexión (recibir el saludo implica estar
// conectado): arrancar desde desconectado.
steambitBluetooth.setConnected(false)
steambitBluetooth.declare("temp", "num", "r")
steambitBluetooth.declare("A", "bool", "w")
steambitBluetooth.declare("A", "num", "w")
steambitBluetooth.declare("joy", "text", "w")
steambitBluetooth.declare("_x", "num", "r")
steambitBluetooth.enqueue("D|temp", "D|temp|20\n")
check(steambitBluetooth.pendingLines().length == 0, "no TX while disconnected")

steambitBluetooth.setConnected(true)
check(steambitBluetooth.isConnected(), "connected")
steambitBluetooth.handleLine("C|_sync|1")
let lines = steambitBluetooth.pendingLines()
check(lines.length == 2, "two R lines")
check(lines[0] == "R|temp|num|r|\n", "R temp")
check(lines[1] == "R|A|num|w|\n", "R A merged to num")

steambitBluetooth.declare("A", "text", "r")
lines = steambitBluetooth.pendingLines()
check(lines.length == 2 && lines[1] == "R|A|text|rw|\n", "R A updated in place")
steambitBluetooth.declare("sonido", "num", "r")
lines = steambitBluetooth.pendingLines()
check(lines.length == 3 && lines[2] == "R|sonido|num|r|\n", "late declaration sent")

steambitBluetooth.enqueue("D|temp", "D|temp|20\n")
steambitBluetooth.enqueue("D|temp", "D|temp|21\n")
steambitBluetooth.enqueue("", "E|botonA\n")
steambitBluetooth.enqueue("", "E|botonA\n")
lines = steambitBluetooth.pendingLines()
check(lines.length == 6, "data coalesced, events kept")
check(lines[3] == "D|temp|21\n", "latest data wins")

steambitBluetooth.sendDataLine("mal nombre", "1", "num")
steambitBluetooth.sendDataLine("_res", "1", "num")
steambitBluetooth.sendEventLine("no valido")
check(steambitBluetooth.pendingLines().length == 6, "invalid labels not sent")
steambitBluetooth.sendDataLine("msg", "a|b", "text")
lines = steambitBluetooth.pendingLines()
check(lines.length == 8 && lines[6] == "R|msg|text|r|\n", "send declares first")
check(lines[7] == "D|msg|ab\n", "text sanitized")

// Seguridad: al desconectar, joystick detenido y valores conservados.
steambitBluetooth.handleLine("C|joy|L")
steambitBluetooth.handleLine("C|jx|40")
steambitBluetooth.handleLine("C|jy|-60")
steambitBluetooth.handleLine("C|jr|20")
steambitBluetooth.handleLine("C|btnA|1")
check(steambitBluetooth.wheelSpeed(true) == 0 && steambitBluetooth.wheelSpeed(false) == -100, "wheels before cut")
steambitBluetooth.setConnected(false)
check(!steambitBluetooth.isConnected(), "disconnected")
check(steambitBluetooth.joystickDirection() == "S", "dpad reset")
check(steambitBluetooth.joystickAxis("x") == 0 && steambitBluetooth.joystickAxis("y") == 0
    && steambitBluetooth.joystickAxis("r") == 0, "axes reset")
check(!steambitBluetooth.joystickButton("A"), "buttons reset")
check(steambitBluetooth.wheelSpeed(true) == 0 && steambitBluetooth.wheelSpeed(false) == 0, "wheels stop")
check(steambitBluetooth.lastText("A") == "0", "labels kept")
check(steambitBluetooth.pendingLines().length == 0, "TX cleared")

basic.showIcon(IconNames.Yes)
