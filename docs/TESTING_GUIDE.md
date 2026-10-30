# Guía de prueba física — STEAMbit + micro:bit V2

Recorrido completo para validar la app contra hardware real, usando
[microbit_test_program.ts](microbit_test_program.ts).

## Preparación

1. **micro:bit V2** flasheado con el programa de prueba. En MakeCode el
   proyecto debe tener la extensión **bluetooth** y, en ⚙ Configuración del
   proyecto, **"No Pairing Required"** activado (se pierde al crear un
   proyecto nuevo).
2. **Teléfono físico** con la app (`flutter run`) y Bluetooth encendido.
   En Ajustes → Bluetooth no debe quedar ningún "BBC micro:bit" emparejado
   de pruebas anteriores (si hay, "Omitir dispositivo").
3. Al encender, el micro:bit muestra **"BT"** = programa corriendo. Reset
   siempre **simple** (solo el botón trasero; A+B+reset entra a modo pairing
   y ahí el programa no corre).

## Prueba 1 — Conexión

- App → un proyecto → **"Vincular dispositivo"** → tiene que aparecer
  `BBC micro:bit [xxxxx]` a los pocos segundos → tocarlo.
- El micro:bit muestra ✓ un instante; el pill queda **"Conectado"** en verde.
- Si no aparece: reset simple con el sheet abierto; cerrar otras apps BLE
  (solo acepta una conexión); verificar *No Pairing Required*.

## Prueba 2 — Telemetría cruda (Monitor)

- **Pulsación larga sobre el pill** → Monitor.
- Esperado: las 4 líneas `R|...` (respuesta al saludo `C|_sync|1` que la
  app manda al conectar, D8) y luego `D|temp|...` y `D|sonido|...` cada ~1 s.
- Líneas en coral = corruptas/inválidas (no debería haber ninguna).

## Prueba 3 — Panel de componentes

| Componente | Etiqueta | Config | Verificación |
|---|---|---|---|
| Visor de dígitos | `temp` | unidad `C` | muestra la temperatura |
| Gráfica en tiempo real | `sonido` | mín 0, máx 255, alerta encima de 150 | aplaudir → pico en la curva y tarjeta en coral |
| Interruptor | `A` | valores 1/0 | ON → corazón en el micro:bit; OFF → se apaga |
| Terminal | `M` | — | el texto enviado desfila en el micro:bit |

- Al elegir etiqueta, `temp`/`sonido`/`A`/`M` aparecen sugeridas
  ("Del micro:bit") porque el programa las declara con `R|`. Si no
  aparecen, el micro:bit tiene un programa viejo que no responde a
  `_sync`: reflashear `microbit_test_program.ts`.
- **Botón físico A** del micro:bit → `E|botonA` visible en el Monitor.

## Prueba 4 — Joysticks

- Home → Joysticks → **Tracción diferencial** (vincular desde ahí si hace
  falta, el pill está arriba a la derecha).
- Cruceta: el micro:bit muestra la **flecha** de la dirección; al soltar,
  pantalla limpia. Botones A/B: muestran la letra.
- El programa de prueba responde a la cruceta (`C|joy|...`) y botones; los
  ejes del modo omnidireccional (`C|jx/jy/jr`) se validan con un robot real
  o con la futura extensión MakeCode.

## Prueba 5 — Reconexión automática

- Con la app conectada, apagar el micro:bit 5 s y volver a encenderlo.
- Esperado: el pill pasa a "Conectando…" y vuelve solo a "Conectado";
  la telemetría se reanuda sin tocar nada.

## Prueba 6 — Exportar CSV

- Detalle del proyecto → menú ⋮ → **Exportar CSV** → compartir.
- El archivo abre en Excel/Numbers con columnas `etiqueta,valor,timestamp`.

## Notas de sensores para demos

- **`sonido`** (micrófono V2) es la señal recomendada para gráficas y
  umbrales: responde al instante a un aplauso.
- `input.lightLevel()` no se usa en el programa de prueba: el sensor de luz
  reutiliza la matriz de LEDs y su comportamiento es poco confiable para
  demos en el V2.
