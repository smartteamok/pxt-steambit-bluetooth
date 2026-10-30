# SmartTEAM — Guía de Desarrollo

App multiplataforma (iOS + Android) para interactuar con micro:bit V2 por Bluetooth LE.
Documento técnico de referencia para implementar el proyecto con Claude Code.

---

## 0. Cómo usar este documento con Claude Code

- Trabajar **fase por fase**. No pasar a la siguiente sin cumplir sus *criterios de aceptación*.
- Antes de escribir código de BLE, completar el **Checklist de verificación (§8)**. Esos puntos NO se deben asumir: se confirman contra documentación oficial.
- La capa de protocolo (§3) es pura lógica Dart y se desarrolla y testea **sin hardware ni BLE**. Empezar por ahí.
- El acceso al hardware vive detrás de una interfaz (`MicrobitTransport`, §5) para poder mockear.

---

## 1. Objetivo y alcance

**Objetivo.** App educativa (alumnos de 11–16) que conecta con un micro:bit V2 por BLE y permite:
leer telemetría, escribir comandos/registros, ver monitoreo estilo IoT (gráficas, gauges, umbrales) y exportar datos. El micro:bit se programa en MakeCode; la app **descubre automáticamente** los registros que el alumno define.

**Dentro de alcance (v1).**
- Escaneo, conexión y reconexión BLE con un micro:bit.
- Protocolo de texto SmartTEAM sobre el servicio UART.
- Catálogo de registros con auto-descubrimiento → UI generada dinámicamente.
- Monitoreo: gráfica en tiempo real, indicadores, umbrales con alerta, exportar CSV.

**Fuera de alcance (v1).**
- Conexión simultánea a varios micro:bit.
- Cuentas de usuario / backend en la nube.
- Edición de código MakeCode dentro de la app.

---

## 2. Stack técnico

| Capa | Elección | Nota |
|---|---|---|
| Framework | Flutter (canal stable) | un solo código iOS + Android |
| BLE | `flutter_blue_plus` | librería BLE principal |
| Gráficas | `fl_chart` | series en tiempo real |
| Gauges | (a decidir) | candidatos: `syncfusion_flutter_gauges` — **revisar licencia** antes de adoptar |
| Estado | `provider` o `riverpod` | para MVP basta `setState`; introducir cuando crezca |
| Export CSV | `csv` + `path_provider` + `share_plus` | guardar/compartir archivo |

> No fijar versiones aquí. Usar la última estable y confirmarla en pub.dev al instalar (§8).

---

## 3. Protocolo SmartTEAM

Texto plano, **UTF-8**, delimitado por `|`, cada mensaje terminado en `\n` (solo LF, nunca CRLF).
Transportado por el servicio UART del micro:bit.

### 3.1 Formato

```
TIPO|etiqueta|campos...\n
```

| Tipo | Mensaje | Dirección | Ejemplo |
|---|---|---|---|
| `D` | Dato / telemetría | micro:bit → app | `D|temp|24` |
| `C` | Comando / escritura | app → micro:bit | `C|led|1` |
| `E` | Evento | micro:bit → app | `E|botonA` |
| `R` | Declaración de registro | micro:bit → app (al conectar) | `R|temp|num|r|°C` |

### 3.2 Gramática de `R` (registro)

```
R|etiqueta|datatype|access|unidad
```
- `datatype` ∈ { `num`, `bool`, `text` }
- `access`   ∈ { `r` (telemetría), `w` (comando), `rw` }
- `unidad`   texto libre, puede ir vacío (`R|led|bool|w|`)

La app usa `R` para construir la UI: `num`→gauge/gráfica, `bool`→switch, `text`→etiqueta, `w/rw`→control de envío.

### 3.3 Reglas estrictas (validación obligatoria)

- `etiqueta`: solo `[A-Za-z0-9_]`, máx. 16 caracteres.
- `valor`/`unidad`: no pueden contener `|` ni `\n`.
- Líneas mal formadas → se descartan y se registra en log; nunca rompen el parser.
- Los mensajes BLE llegan **fragmentados**: acumular en buffer y procesar solo al encontrar `\n`.

---

## 4. Lado micro:bit (MakeCode) — contrato de referencia

El alumno programa esto; la app debe ser compatible con este patrón.

```
bluetooth.startUartService()

bluetooth.onBluetoothConnected(function () {
    bluetooth.uartWriteString("R|temp|num|r|C\n")
    bluetooth.uartWriteString("R|led|bool|w|\n")
})

basic.forever(function () {
    bluetooth.uartWriteString("D|temp|" + input.temperature() + "\n")
    basic.pause(1000)
})

bluetooth.onUartDataReceived("\n", function () {
    let msg = bluetooth.uartReadUntil("\n")   // ej. "C|led|1"
    // parsear y actuar
})
```

**Ajuste de proyecto MakeCode obligatorio:** *No pairing required* (Project Settings). Crítico para el aula.

---

## 5. Arquitectura de la app

Cinco capas. Las inferiores no conocen a las superiores. BLE aislado tras una interfaz.

```
lib/
  ble/
    microbit_transport.dart      // interfaz abstracta (connect/send/stream)
    fbp_transport.dart           // implementación con flutter_blue_plus
    mock_transport.dart          // implementación falsa para tests/dev sin hardware
  protocol/
    message.dart                 // modelos: DataMsg, CmdMsg, EventMsg, RegisterMsg
    codec.dart                   // encode(CmdMsg)->String ; parseLine(String)->Message?
    line_buffer.dart             // acumula bytes y emite líneas completas por '\n'
  model/
    register.dart                // Register{label,type,access,unit,...}
    registry.dart                // catálogo + último valor por etiqueta
  ui/
    scan_screen.dart
    dashboard_screen.dart        // genera widgets desde el Registry
    widgets/ (gauge, chart, switch, button, ...)
  services/
    csv_export.dart
    thresholds.dart              // reglas de alerta por registro
  main.dart
```

**Interfaz clave (permite desarrollar UI y testear sin micro:bit):**

```dart
abstract class MicrobitTransport {
  Future<void> connect(/* device */);
  Future<void> disconnect();
  Stream<List<int>> get incoming;     // bytes crudos del UART
  Future<void> send(List<int> bytes); // escribe al UART
  Stream<ConnectionState> get state;
}
```

---

## 6. Detalles BLE (servicio UART)

UUIDs del Nordic UART Service (el que expone el micro:bit). **Confirmar en §8 antes de usar.**

```
Servicio : 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
TX (notify, micro:bit → app) : 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
RX (write,  app → micro:bit) : 6E400002-B5A3-F393-E0A9-E50E24DCCA9E
```

> ⚠️ Los nombres TX/RX son **desde la perspectiva del micro:bit**. La app (central)
> se **suscribe a TX** y **escribe en RX**. Es un punto clásico de error: verificar con
> los UUIDs reales que reporta el dispositivo, no fiarse del nombre.

Flujo: `scan` (filtrar por nombre "BBC micro:bit" o por servicio) → `connect` → `discoverServices` →
suscribirse a TX → escribir en RX. Manejar desconexión y **reintento automático**.

**Permisos.**
- Android (manifest): `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+); en versiones previas, permiso de ubicación para escanear. Confirmar `minSdk` requerido por la librería.
- iOS (`Info.plist`): `NSBluetoothAlwaysUsageDescription`. Sin esto, el escaneo falla en silencio.

---

## 7. Plan por fases (con criterios de aceptación)

### Fase 0 — Esqueleto y protocolo (sin hardware)
- Crear proyecto Flutter, estructura de `lib/`.
- Implementar `codec`, `line_buffer`, modelos de mensaje.
- **Aceptación:** tests unitarios verdes para: parseo de `D/C/E/R`, líneas inválidas descartadas, fragmentación reconstruida por `line_buffer`, `encode` de comando correcto.

### Fase 1 — Conexión BLE real (MVP)
- Implementar `FbpTransport`, pantalla de escaneo y conexión, permisos iOS/Android.
- Mostrar telemetría cruda en pantalla (lista de líneas recibidas).
- **Aceptación:** conecta a un micro:bit V2 físico, recibe mensajes `D|...` y los muestra en vivo; reconecta tras pérdida de señal.

### Fase 2 — Registros y UI dinámica
- Parsear `R|...` al conectar → poblar `Registry`.
- Generar widgets automáticamente (gauge/switch/etiqueta) según `datatype`/`access`.
- Enviar `C|...` desde controles de la app.
- **Aceptación:** un micro:bit que anuncia 2–3 registros produce su panel sin tocar código de la app; un switch en la app cambia un estado en el micro:bit.

### Fase 3 — Monitoreo IoT
- Gráfica en tiempo real por registro numérico (`fl_chart`).
- Umbrales configurables con alerta visual (`thresholds`).
- Exportar histórico a CSV y compartir.
- **Aceptación:** la gráfica refleja cambios <1 s; al cruzar un umbral se dispara la alerta; el CSV exportado abre correctamente con columnas etiqueta/valor/timestamp.

### Fase 4 — Robustez para aula
- Estados claros de conexión, manejo de errores y de permisos denegados.
- Persistir el último micro:bit y reconectar al abrir la app.
- **Aceptación:** uso continuo de 20 min sin crash; recuperación automática tras apagar/encender el micro:bit.

---

## 8. Checklist de verificación (hacer ANTES de codificar — no asumir)

- [ ] UUIDs del servicio UART y **dirección TX/RX** confirmados en `tech.microbit.org/bluetooth`.
- [ ] Nombres exactos de bloques/funciones MakeCode (`startUartService`, `uartWriteString`, `uartReadUntil`, `onUartDataReceived`, `onBluetoothConnected`) en `makecode.microbit.org/reference/bluetooth`.
- [ ] API actual de `flutter_blue_plus` (scan, connect, discoverServices, setNotifyValue, write) en pub.dev.
- [ ] `minSdk` de Android y *deployment target* de iOS requeridos por `flutter_blue_plus`.
- [ ] Comportamiento de fragmentación / MTU del UART en micro:bit (validar tamaño máx. de línea seguro).
- [ ] Paquetes de gráfica/gauge elegidos y **revisada su licencia**.
- [ ] Confirmar que el proyecto MakeCode de prueba está en modo *No pairing required*.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Mensajes BLE fragmentados → parseo roto | `line_buffer` que solo emite al ver `\n` (testeado en Fase 0) |
| Confundir TX/RX | Verificación §8 + log de UUIDs descubiertos |
| Emparejamiento BLE en aula | *No pairing required* en MakeCode |
| Permisos iOS/Android mal configurados | Checklist §6; probar en dispositivo físico, no solo emulador |
| Sin hardware durante el desarrollo | `MockTransport` que reproduce un flujo `R/D/E` grabado |

---

## 10. Convenciones

- Toda la lógica de protocolo es Dart puro y testeable sin Flutter.
- Nada de UI accede a `flutter_blue_plus` directo: solo vía `MicrobitTransport`.
- Validar y descartar entrada malformada; el parser nunca lanza por datos del dispositivo.
- `\n` como único terminador; rechazar `\r`.
