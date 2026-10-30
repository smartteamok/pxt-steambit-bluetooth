# SmartTEAM — Decisiones de producto

Registro de decisiones tomadas con el responsable del proyecto. Complementa (y donde
difiere, **prevalece sobre**) la guía original `SmartTEAM_DEV_GUIDE.md`.

---

## 2026-07-04 — Definición inicial de producto

Contexto: se analizó la app a reemplazar (**Educabot Control**, capturas en
`Capturas app.pdf`) junto con la guía técnica. Usuarios objetivo: alumnos de 12–17
años en clase de robótica educativa. La app tendrá identidad visual propia (no debe
parecerse a Educabot), con las mismas funciones.

### D1. Construcción del panel: **manual** (como Educabot)

El alumno arma su panel componente por componente: elige un componente del catálogo,
le pone nombre y le asigna una **etiqueta** del protocolo, con parámetros según el
tipo (mín/máx, valor al activar/desactivar, unidad).

- Los mensajes `R|...` **no generan UI automáticamente**. Se usan solo para
  **sugerir/validar etiquetas** en el selector de etiqueta (las etiquetas anunciadas
  por el micro:bit aparecen como sugerencias; también las vistas en mensajes `D|`).
- Esto **modifica la Fase 2 de la guía**: en lugar de "UI generada dinámicamente",
  se construye un editor de panel + catálogo de componentes.
- Las etiquetas siguen la regla de la guía (§3.3): `[A-Za-z0-9_]`, máx. 16 caracteres.
  (Educabot usa una sola letra A–Z; nosotros no imponemos esa restricción.)

### D2. Modo Joysticks: **sí, en v1**

Control remoto del robot en pantalla completa horizontal, como fase propia
(ver plan actualizado). Dos variantes, calcadas funcionalmente de Educabot:

1. **Tracción diferencial**: cruceta de 4 direcciones + botones A y B.
2. **Tracción omnidireccional**: joystick 360° (traslación) + control de rotación
   independiente + botones A y B.

**Propuesta de protocolo joystick (a validar con hardware en su fase):**
un valor por mensaje, fácil de parsear en MakeCode:

| Control | Mensaje | Valores |
|---|---|---|
| Cruceta (diferencial) | `C\|joy\|U` / `D` / `L` / `R` / `S` | S = soltar/stop |
| Joystick 360° eje X | `C\|jx\|<n>` | −100..100 |
| Joystick 360° eje Y | `C\|jy\|<n>` | −100..100 |
| Rotación | `C\|jr\|<n>` | −100..100 |
| Botón A | `C\|btnA\|1` al presionar, `C\|btnA\|0` al soltar | |
| Botón B | `C\|btnB\|1` / `C\|btnB\|0` | |

Regulación de tráfico: enviar solo ante cambio de valor, con un máximo de ~10 msg/s
por control (throttle en la app, no en el micro:bit).

### D3. Identidad visual: **manual de marca del cliente** — ✅ recibido 2026-07-04

Design handoff completo en [design/DESIGN_HANDOFF.md](design/DESIGN_HANDOFF.md)
(+ prototipo interactivo `SmartTEAM App.dc.html`). Resumen del sistema:

- **Paleta STEAM**: violeta `#796EB0` (primario), cian `#35BFE9`, ámbar `#FFB800`,
  verde `#59BB6A` (éxito/ON), coral `#EF506D` (alertas), índigo ink `#160A60`
  (texto/fondos oscuros), page wash `#F3F7FD`. Fills planos, sin gradientes
  azul-violáceos (los del prototipo son opcionales).
- **Tipografías**: Livvic (títulos), Lexend Deca (cuerpo/UI), DM Sans 700
  (numérico/telemetría). Bundleadas en `assets/fonts/` para funcionar offline.
- **Radios grandes** (pills 999, cards 24, paneles 32), **sombras frías** con tinte
  índigo, espaciado base 8pt, motion bouncy ~200ms respetando reduced-motion.
- Iconografía línea estilo Lucide, **sin emoji**. Copy es rioplatense ("elegí", "armá").
- El handoff especifica las 9 pantallas con medidas; el prototipo HTML es
  referencia de look & feel, **no** código a copiar (se recrea en Flutter).

Nota: el README del handoff sugiere React Native como default genérico; prevalece
la decisión previa de la guía técnica: **Flutter**.

### D4. Idiomas: **español + inglés** desde el inicio

Infraestructura i18n (`flutter_localizations` + ARB) desde el primer widget.
Español como idioma base, inglés como segundo. Selector de idioma en la app
(Educabot lo tiene; lo mantenemos).

### D5. Proyectos guardados localmente

Como en Educabot: múltiples proyectos persistidos en el dispositivo (nombre, color,
icono, descripción, lista de componentes configurados). Sin cuentas ni backend
(fuera de alcance v1, según guía §1).

---

## 2026-07-04 — Checklist §8 verificado (Fase 1, BLE real)

Verificado contra documentación oficial antes de codificar:

- **UUIDs UART** (runtime docs de Lancaster University, coinciden con la guía §6):
  servicio `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`; **TX `6E400003-…` con
  INDICATE** (micro:bit → app; la app se suscribe); **RX `6E400002-…` con WRITE**
  (app → micro:bit). ⚠️ Hay fuentes de terceros con TX/RX invertidos: la
  implementación resuelve las características **por propiedades**, no por nombre.
- **flutter_blue_plus 2.3.10**: `startScan`/`onScanResults`, `device.connect()`,
  `discoverServices`, `setNotifyValue(true)` (cubre notify e indicate),
  `onValueReceived`, `write`, `connectionState`, `adapterState`,
  `cancelWhenDisconnected`. minSdk Android **21**. **No pide permisos runtime**:
  se piden con `permission_handler` (BLUETOOTH_SCAN/CONNECT en Android 12+;
  ubicación en ≤11, detectado con `device_info_plus`).
- **MTU**: Android negocia 512 por defecto; iOS 135–255. Las escrituras se
  fragmentan a `mtu-3` igualmente; la lectura ya se reensambla con `LineBuffer`.
- **Escaneo**: el micro:bit no anuncia el servicio UART en el advertisement →
  no sirve filtrar por servicio; se escanea abierto y se filtra por nombre
  (`BBC micro:bit [xxxxx]`) del lado de la app.
- Pendiente del lado micro:bit (lo maneja el docente): proyecto MakeCode con
  *No pairing required* + bloques `bluetooth.*` según §4 de la guía.

### D9 (2026-10-30). Rebrand: SmartTEAM → **STEAMbit**

STEAMbit reemplaza a la marca SmartTEAM entera (confirmado por el responsable).

- Logos extraídos del PDF de marca ("Logo STEAMbit 2") a SVG limpios en
  `assets/logo/`: `steambit-logo.svg` (versión full color, badge con fondo
  propio — se usa en headers índigo y en el controller cian),
  `steambit-logo-bylogos.svg` (con el respaldo "By Logos", para piezas
  grandes) y `steambit-icon.svg` (marca "Sb" cian, usada como AppIcon y en el
  hero del home). Se eliminaron los SVG de SmartTEAM.
- AppIcon iOS/Android y los íconos web se generan del ícono "Sb" sobre el
  azul de su marco (`#3B4985`).
- Textos visibles renombrados (título, nombre bajo el ícono, permiso de
  Bluetooth, web, CSV). **No** se renombraron: el paquete Dart `smartteam`,
  la carpeta del repo, el archivo de la guía original ni el bundle id
  `com.colex.smartteam` (cambiarlo es gratis solo antes de publicar: decidir
  antes de subir a las tiendas).
- La paleta del design system (D3) no cambia: los colores del logo STEAMbit
  son la misma familia STEAM.

### D8 (2026-10-30). Saludo de sincronización y etiquetas reservadas

Detectado al diseñar la extensión MakeCode:

- **Saludo `C|_sync|1`**: la app lo manda apenas termina de conectar (con la
  suscripción a TX ya activa). El micro:bit responde reenviando sus `R|`.
  Motivo: los `R|` enviados en `onBluetoothConnected` llegan antes de que iOS
  termine `discoverServices`/`setNotifyValue` y se pierden (las sugerencias
  de etiquetas no aparecían).
- **Etiquetas que empiezan con `_` son reservadas** del sistema: la app no
  las sugiere y la UI nunca las genera.
- **Al conectar/desconectar se resetea el filtro de repetidos** de
  `sendAxis`: tras un corte, el mismo valor de slider/joystick se reenvía
  (el micro:bit pudo resetear su estado).
- **Al salir de la pantalla de joystick** la app manda detener (`C|joy|S` o
  `jx/jy/jr = 0`).

### D7 (2026-07-05). Etiquetas en la app: letras A–Z + sugerencias del micro:bit

Confirmado con el responsable tras las pruebas físicas:

- El selector de etiqueta de la app queda **como está**: grilla de letras
  A–Z, **sin entrada de texto libre**.
- Las etiquetas **declaradas por el micro:bit** (mensajes `R|`) o vistas en
  su telemetría se ofrecen como sugerencias al estar conectado, y pueden ser
  multi-letra (`temp`, `sonido`).
- Convención de aula resultante: comandos app → micro:bit con letras (el
  alumno las elige en la app y las compara en MakeCode); telemetría
  micro:bit → app con etiquetas declaradas legibles.
- El protocolo sigue admitiendo `[A-Za-z0-9_]` máx. 16 en ambas direcciones;
  esta es una decisión de UI, no de protocolo.

### D6 — ✅ resuelta 2026-07-04: uso educativo → `License.nonprofit`

Confirmado por el responsable del proyecto: la app es de **uso educativo**, que
está cubierto explícitamente por el tier gratuito de flutter_blue_plus
("Educational institutions"). Queda `License.nonprofit` en `fbp_transport.dart`.
Si el modelo de distribución cambiara a comercial, reabrir con las opciones de abajo.

Contexto original:

`flutter_blue_plus` ≥2.0 dejó de ser BSD: es **doble licencia** — gratis para
uso personal/educativo/sin fines de lucro (`License.nonprofit`), **paga para uso
comercial**. Hoy el código usa `License.nonprofit` (constante única en
`fbp_transport.dart`). **Decidir según la naturaleza jurídica del uso**:

1. Si el uso califica como educativo/nonprofit → dejar como está.
2. Si es comercial → comprar licencia, o
3. bajar a `flutter_blue_plus 1.35.x` (BSD-3, sin parámetro de licencia, API
   casi idéntica) u otra librería BLE (p. ej. `bluetooth_low_energy`).

---

## 2026-07-04 — Paquetes de Fase 3, licencias verificadas

Leídas de los LICENSE en pub cache al instalar: `fl_chart 1.2` (MIT),
`csv 8.0` (MIT), `path_provider 2.1` (BSD-3), `share_plus 13.2` (BSD-3).
Todas compatibles con el uso educativo. No se adoptó `syncfusion_flutter_gauges`
(licencia comercial restrictiva): el gauge es un CustomPainter propio.

---

## Catálogo de componentes v1 (Fase 2/3)

Equivalencia con Educabot + agregados SmartTEAM:

| Componente | Dirección | Config | Protocolo |
|---|---|---|---|
| Interruptor | app → micro:bit | valor al activar / desactivar | `C\|et\|<v>` |
| Botón (momentáneo) | app → micro:bit | valor al presionar / soltar | `C\|et\|<v>` |
| Control deslizable | app → micro:bit | mín / máx | `C\|et\|<n>` |
| Visor circular (gauge) | micro:bit → app | mín / máx | `D\|et\|<n>` |
| Visor de dígitos | micro:bit → app | unidad | `D\|et\|<n>` |
| Indicador de estado | micro:bit → app | — (ON/OFF) | `D\|et\|<0/1>` |
| Terminal | bidireccional | — | `D\|et\|<txt>` / `C\|et\|<txt>` |
| Gráfica tiempo real | micro:bit → app | mín/máx, umbrales | `D\|et\|<n>` |

Umbrales con alerta y exportación CSV (Fase 3 de la guía) aplican a los componentes
numéricos de entrada (gauge, dígitos, gráfica).

---

## Plan por fases actualizado

| Fase | Contenido | Cambios vs guía |
|---|---|---|
| 0 | Protocolo puro Dart + tests (codec, line_buffer, modelos) | + encode de comandos joystick |
| 1 | BLE real: escaneo, conexión, reconexión, permisos | igual |
| 2 | Proyectos + editor manual de panel + catálogo de componentes | **reemplaza** "UI dinámica"; `R\|` solo sugiere etiquetas |
| 3 | Monitoreo IoT: gráfica, umbrales, CSV | igual |
| 4 | Joysticks (diferencial y omnidireccional, landscape) | **nueva** |
| 5 | Robustez de aula | era Fase 4 |

Transversal desde Fase 2: i18n es/en, manual de marca aplicado a todo el sistema visual.
