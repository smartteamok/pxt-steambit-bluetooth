# STEAMbit bluetooth — extensión MakeCode para micro:bit V2

![STEAMbit](docs/logo/steambit-logo.svg)

Bloques para usar la **app STEAMbit** por Bluetooth: leer lo que manda la app
(interruptores, botones, deslizables, terminal), mandarle datos (visores,
gráficas) y manejar un robot con la cruceta o el joystick 360°.
El alumno nunca escribe los mensajes del protocolo.

*[English](#english) · [Português](#português)*

> ## ⚠️ Antes de empezar: "No Pairing Required"
>
> En cada proyecto de MakeCode: **⚙ Configuración del proyecto → "No Pairing
> Required: Anyone can connect via Bluetooth" ACTIVADO**.
>
> Es una opción **por proyecto** que la extensión **no puede activar sola**, y
> **se pierde al crear un proyecto nuevo**. Sin ella, la app no puede
> conectarse.

## Requisitos

- **micro:bit V2** (la extensión no compila para V1: con Bluetooth no entra en
  su memoria).
- La extensión agrega **bluetooth**, que es incompatible con **radio**: no se
  pueden usar las dos en el mismo proyecto.

## Cómo agregarla

1. Abrí [makecode.microbit.org](https://makecode.microbit.org) y creá un
   proyecto nuevo.
2. **⚙ → Configuración del proyecto** → activá **No Pairing Required** →
   Guardar.
3. Caja de bloques → **Extensiones** → pegá
   `https://github.com/smartteamok/pxt-steambit-bluetooth` → Enter → elegí
   **STEAMbit bluetooth**.
4. Aparece la categoría **STEAMbit bluetooth** (violeta). Los bloques salen en
   el idioma del editor (español, inglés o portugués).

## Bloques

### Conexión

| Bloque | Tipo | Qué hace |
|---|---|---|
| `al conectarse la app` | evento | Corre cuando la app se conecta |
| `al desconectarse la app` | evento | Corre cuando se corta la conexión |
| `app conectada` | sí/no | Verdadero mientras la app está conectada |

### Proyecto (paneles de la app)

La **etiqueta** es la que elegiste en la app para cada componente: tocá la
flecha y elegí una letra **A–Z** (como la grilla de la app) o escribí una
etiqueta más larga, como `temp` (solo letras, números y `_`, hasta 16).

| Bloque | Tipo | Qué hace |
|---|---|---|
| `al recibir [A] (valor)` | evento | Corre cada vez que la app manda un valor con esa etiqueta. `valor` es un número |
| `valor de la app en [A]` | número | Último número recibido con esa etiqueta (0 si no llegó nada) |
| `texto de la app en [A]` | texto | Último texto recibido (para la terminal) |
| `[A] está activado` | sí/no | Verdadero si el último valor no es `0` ni vacío (interruptor con valores 1/0) |
| `enviar a la app [T] = (número)` | instrucción | Manda un número a visores, dígitos y gráficas |
| `enviar texto a la app [M] = ()` | instrucción | *(más)* Manda un texto (terminal) |
| `enviar sí/no a la app [L] = ()` | instrucción | *(más)* Manda 1/0 (indicador de estado) |
| `enviar evento [botonA] a la app` | instrucción | *(más)* Manda un evento (se ve en el Monitor) |
| `fijar pausa entre envíos en (100) ms` | instrucción | *(más)* Pausa mínima entre mensajes (ver abajo) |

Los valores se **conservan** al desconectarse (como en la app).

### Joystick

| Bloque | Tipo | Pantalla de la app |
|---|---|---|
| `cruceta en [adelante/atrás/izquierda/derecha/detenida]` | sí/no | Tracción diferencial |
| `joystick [x/y/giro]` | número −100..100 | Tracción omnidireccional |
| `velocidad rueda [izquierda/derecha]` | número −100..100 | Tracción omnidireccional |
| `botón [A/B] de la app presionado` | sí/no | Las dos |

- La **cruceta manda solo la dirección, sin velocidad**. Para motores con
  velocidad proporcional usá el **joystick 360°** (pantalla omnidireccional).
- `velocidad rueda`: izquierda = y + x + giro, derecha = y − x − giro,
  acotadas a −100..100. Robot de dos ruedas con 5 bloques:
  `para siempre` → motor izquierdo a `velocidad rueda izquierda` → motor
  derecho a `velocidad rueda derecha` (con el bloque de motor de tu robot).
- **Seguridad:** al cortarse el Bluetooth, la cruceta queda `detenida` y los
  ejes, botones y velocidades de rueda vuelven a **0**, así el robot se
  frena solo.

## Ejemplos

Interruptor `A` de la app que prende un corazón:

```blocks
steambitBluetooth.onReceive("A", function (value) {
    if (steambitBluetooth.isOn("A")) {
        basic.showIcon(IconNames.Heart)
    } else {
        basic.clearScreen()
    }
})
```

Temperatura a un visor de la app (etiqueta `temp`):

```blocks
basic.forever(function () {
    steambitBluetooth.sendNumber("temp", input.temperature())
    basic.pause(1000)
})
```

Cruceta con condicionales:

```blocks
basic.forever(function () {
    if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Forward)) {
        basic.showArrow(ArrowNames.North)
    } else if (steambitBluetooth.dpad(steambitBluetooth.DpadDirection.Stopped)) {
        basic.clearScreen()
    }
})
```

Programa de prueba completo (solo bloques), para recorrer la guía de prueba
de la app: [docs/microbit_test_program_blocks.ts](docs/microbit_test_program_blocks.ts).

## Qué hace la extensión sola

- Arranca el servicio UART de Bluetooth **antes** que el resto del programa.
- Cuando la app termina de conectar manda un saludo y el micro:bit le
  responde con la lista de **etiquetas que usan tus bloques**: así aparecen
  sugeridas en la app ("Del micro:bit"). Ojo: una etiqueta se anuncia recién
  cuando su bloque se ejecutó al menos una vez (si está dentro de un `si`
  que nunca se cumplió, todavía no se anuncia).
- **Espacia los envíos** (100 ms entre mensajes, probado sin pérdida de
  bytes). Los envíos no frenan tu programa: van a una cola. Si mandás la
  misma etiqueta más rápido de lo que sale, se manda el último valor.
  Sin conexión, los envíos se descartan.
- `al recibir` corre en paralelo: una `pausa` adentro no frena la recepción.
  Si llegan valores mientras todavía está corriendo, vuelve a correr una vez
  con el último.

## Cuidado al mezclar con los bloques `bluetooth`

- **No uses** `bluetooth al recibir datos` (`on data received`) ni los
  bloques `bluetooth uart escribir…`: el primero reemplaza al de la
  extensión (deja de recibir) y los segundos no respetan el espaciado.
- Para conectar/desconectar usá **`al conectarse la app` / `al desconectarse
  la app`**. Los bloques `al conectarse bluetooth` de MakeCode deberían
  convivir con la extensión (está diseñada para eso), pero no está probado
  en hardware.
- Etiquetas reservadas: las que empiezan con `_` (del sistema) y las del
  joystick: `joy`, `jx`, `jy`, `jr`, `btnA`, `btnB`.

## Problemas frecuentes

- **La app no encuentra el micro:bit** → revisá *No Pairing Required*, hacé
  reset simple (solo el botón de atrás) y cerrá otras apps Bluetooth.
- **No aparecen las etiquetas sugeridas** → el micro:bit tiene un programa
  viejo: volvé a descargarlo; verificá que el bloque con esa etiqueta se haya
  ejecutado.
- **El editor avisa que el proyecto es solo para micro:bit V2** → es
  esperado: la extensión es solo para V2.

## Desarrollo

```
pxt target microbit   # una vez
pxt install
pxt build             # compila core.ts, blocks.ts y test.ts
```

- `core.ts`: núcleo sin bloques (parser, estado, cola de envío). `blocks.ts`:
  bloques. Todo dentro del namespace `steambitBluetooth`, para poder
  integrarlo en "STEAMbit 8" sin reescribir.
- `test.ts`: pruebas del núcleo (si fallan, panic 098; si pasan, ✓).
- Traducciones en `_locales/es` y `_locales/pt`. Las claves base se regeneran
  con `pxt gendocs --locs`.

### Protocolo

Texto UTF-8, una línea por mensaje `TIPO|etiqueta|valor\n`: `C` comando
app → micro:bit, `D` dato y `E` evento micro:bit → app,
`R|etiqueta|num/bool/text|r/w/rw|unidad` declaración. Joystick:
`C|joy|U/D/L/R/S`, `C|jx|n`, `C|jy|n`, `C|jr|n` (−100..100),
`C|btnA|1/0`, `C|btnB|1/0`. Saludo de la app: `C|_sync|1`.

---

## English

Blocks for the **STEAMbit app** over Bluetooth, for **micro:bit V2**.

> **Before you start:** in every MakeCode project turn on **⚙ Project
> Settings → "No Pairing Required: Anyone can connect via Bluetooth"**. It is
> a per-project setting that an extension **cannot** turn on, and it is
> **lost when you create a new project**.

- Add it: **Extensions** → paste
  `https://github.com/smartteamok/pxt-steambit-bluetooth`.
- **Connection:** `on app connected`, `on app disconnected`, `app connected`.
- **Project:** `on app sends [A] (value)`, `app value [A]`, `app text [A]`,
  `[A] is on`, `send to app [T] = (n)`; under *more*: send text, send yes/no,
  send event, pause between sends. Labels: pick A–Z or type one like `temp`.
- **Joystick:** `app d-pad [forward/backward/left/right/stopped]` (direction
  only, no speed), `app joystick [x/y/rotation]` (−100..100),
  `wheel speed [left/right]`, `app button [A/B] pressed`. When Bluetooth
  drops, the d-pad goes to stopped and axes/buttons/wheels to 0.
- The extension starts the UART service first, answers the app's sync with
  the labels your blocks use, and spaces messages 100 ms apart.
- Don't mix with `bluetooth on data received` or `bluetooth uart write`
  blocks. Requires bluetooth, so it can't be used with radio.

## Português

Blocos para o **app STEAMbit** por Bluetooth, para **micro:bit V2**.

> **Antes de começar:** em cada projeto do MakeCode ative **⚙ Configurações
> do projeto → "No Pairing Required: Anyone can connect via Bluetooth"**. É
> uma opção por projeto que a extensão **não consegue** ativar sozinha, e
> **se perde ao criar um projeto novo**.

- Adicionar: **Extensões** → cole
  `https://github.com/smartteamok/pxt-steambit-bluetooth`.
- **Conexão:** `ao conectar o app`, `ao desconectar o app`, `app conectado`.
- **Projeto:** `ao receber [A] (valor)`, `valor do app em [A]`,
  `texto do app em [A]`, `[A] está ativado`, `enviar ao app [T] = (n)`; em
  *mais*: enviar texto, sim/não, evento e pausa entre envios. Etiquetas:
  escolha A–Z ou digite uma como `temp`.
- **Joystick:** `direcional em [frente/trás/esquerda/direita/parado]` (só
  direção, sem velocidade), `joystick [x/y/giro]` (−100..100),
  `velocidade da roda [esquerda/direita]`, `botão [A/B] do app pressionado`.
  Se o Bluetooth cair, o direcional fica parado e eixos/botões/rodas em 0.
- Não misture com os blocos `bluetooth ao receber dados` ou
  `bluetooth uart escrever`. Usa bluetooth, então não funciona junto com
  radio.

## Licencia

MIT

#### Metadatos (usados para búsqueda, renderizado)

* for PXT/microbit
