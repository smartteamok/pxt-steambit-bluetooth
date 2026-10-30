# Plan — Extensión MakeCode de la app (bloques de proyectos y joysticks)

> Plan autocontenido para implementar en un **repo separado**
> (`/Users/marianobat/dev/pxt-steambit-bluetooth` → GitHub `smartteamok/pxt-steambit-bluetooth`).
> Revisado el 2026-10-30 a partir de una revisión externa (Grok) contrastada
> con el código de la app.
>
> **Nombre: "STEAMbit bluetooth"** (por ahora). Repo `smartteamok/pxt-steambit-bluetooth`,
> categoría del editor "STEAMbit bluetooth", namespace `steambitBluetooth`.
> **Más adelante se integra en la extensión "STEAMbit 8"**: mantener el núcleo
> (parser, estado, TX) separado de las anotaciones de bloques, en archivos
> propios (`core.ts`, `blocks.ts`), sin globals fuera del namespace, para poder
> moverlo sin reescribir. Logos de marca en `docs/logo/`.

Diseño orientado a **condicionales**: los bloques de lectura devuelven el
último valor recibido, así se usan dentro de `para siempre` + `si` para
manejar actuadores y motores. El alumno nunca escribe strings del protocolo.

Requiere en la app la decisión **D8** (saludo `C|_sync|1`), ya implementada.

### Estructura del repo
`pxt.json` (deps: `core`, `bluetooth`; target microbit fijado), `main.ts`
(núcleo + bloques), `test.ts`, `README.md` (es/en/pt; **destacar "No Pairing
Required"**, que una extensión no puede activar), `_locales/es/…-strings.json`,
`_locales/pt/…-strings.json`, `icon.png`. Compilación local con la CLI `pxt`
(ya instalada: `pxt target microbit`, `pxt build`); iteración visual
importando la URL de GitHub en makecode.microbit.org.

### Núcleo (sin bloques)
- `init()` perezoso, llamado por todo bloque: `bluetooth.startUartService()`
  **primero**, luego handlers UART/conexión.
- Parser espejo de la app: separa por `|`, descarta `\r`, valida etiqueta
  `[A-Za-z0-9_]{1,16}`, ignora líneas inválidas sin romper. Solo procesa `C|`.
- Estado: diccionario etiqueta → último valor (string); estado joystick
  (`dir`, `jx`, `jy`, `jr`, `btnA`, `btnB`); se conserva el último valor de
  cada eje (llegan en mensajes separados).
- **Seguridad**: al desconectar, joystick a "detenida" y ejes/botones a 0
  (los valores de etiquetas se conservan, como los muestra la app).
- **TX espaciado**: mínimo entre `uartWriteString` (empezar en 50 ms; ajustar
  con hardware — con 100 ms está probado que no se pierden bytes).
- **Declaraciones automáticas**: cada etiqueta usada por un bloque se registra
  con su tipo/acceso (enviar número → `num|r`, leer texto → `text|w`, etc.) y
  se envía `R|` al responder `C|_sync|1` (D8). El alumno no programa `R|`.
- **Dueña de los eventos BLE**: la extensión registra connected/disconnected y
  despacha a los handlers del alumno. Spike en E0: verificar en el editor si un
  `bluetooth.onBluetoothConnected` del alumno pisa el de la extensión; si sí,
  el README lo advierte y se usan los bloques propios.
- Handlers de `al recibir` ejecutados con `control.runInParallel` para que una
  pausa del alumno no frene la recepción.

### Bloques (namespace `steambitBluetooth`, color `#796EB0`)
Selector de etiqueta: bloque sombra oculto con **grilla A–Z** que devuelve
string; acepta encastrar un texto (`"temp"`) para etiquetas de sensores.

| Grupo | Bloque | Tipo | Protocolo |
|---|---|---|---|
| Conexión | `al conectarse la app` / `al desconectarse la app` | evento | eventos BLE |
| Conexión | `app conectada` | sí/no | estado |
| Proyecto | `valor de la app en [A]` | número | último `C\|A\|v` (0 si nunca llegó) |
| Proyecto | `texto de la app en [A]` | texto | último `C\|A\|v` |
| Proyecto | `[A] está activado` | sí/no | último valor ≠ `"0"` y no vacío (switch con valores 1/0 por defecto) |
| Proyecto | `enviar a la app [T] = (número)` | instrucción | `D\|T\|n` |
| Proyecto | `al recibir [A] (valor)` | evento | dispatch de `C\|A\|v` |
| Proyecto (avanzado) | `enviar texto [T] = ()`, `enviar sí/no [T] = ()`, `enviar evento [nombre]` | instrucción | `D\|…`, `E\|…` |
| Joystick | `cruceta en [adelante/atrás/izquierda/derecha/detenida]` | sí/no | `C\|joy\|U/D/L/R/S` (solo modo diferencial) |
| Joystick | `joystick [x/y/giro]` | número −100..100 | `jx`/`jy`/`jr` (solo modo omni) |
| Joystick | `velocidad rueda [izquierda/derecha]` | número −100..100 | mezcla `y±x` acotada |
| Joystick | `botón [A/B] de la app presionado` | sí/no | `btnA`/`btnB` |

La cruceta no lleva velocidad (la app manda solo dirección); para motores
proporcionales se usa el joystick 360°. Esto va explícito en el README.

### Fases y aceptación
| Fase | Contenido | Aceptación |
|---|---|---|
| E0 | repo + `pxt.json`, núcleo, bloques de conexión, `test.ts` del parser, spike de eventos BLE y de TX | `pxt build` limpio; la app conecta y recibe los `R|` vía `_sync` |
| E1 | bloques de proyecto + declaraciones automáticas | el programa de prueba de la app rehecho **solo con bloques** pasa `docs/TESTING_GUIDE.md` |
| E2 | bloques de joystick + seguridad al desconectar | robot de dos ruedas manejable con ≤6 bloques; al cortar BLE, motores en 0 |
| E3 | `_locales` es/pt, README con ejemplos, tag v1.0.0 | importable por URL; bloques en el idioma del editor |

### Contexto portable (para la otra sesión)
Protocolo: texto UTF-8, `TIPO|etiqueta|valor\n`, solo LF. `D` dato mb→app,
`C` comando app→mb, `E` evento mb→app, `R|et|num/bool/text|r/w/rw|unidad`
declaración. Joystick: `C|joy|U/D/L/R/S`, `C|jx|n`, `C|jy|n`, `C|jr|n`
(−100..100), `C|btnA|1/0`, `C|btnB|1/0`; la app regula a ~10 msg/s y solo
ante cambio. D7: en la app las etiquetas se eligen en grilla A–Z; las
declaradas por el micro:bit se sugieren. D8: la app manda `C|_sync|1` al
terminar de conectar; etiquetas `_*` reservadas. Lecciones de hardware:
`startUartService()` siempre primero; espaciar envíos; "No Pairing Required"
es por proyecto y se pierde al crear uno nuevo.
