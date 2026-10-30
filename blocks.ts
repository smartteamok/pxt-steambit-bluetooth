/**
 * Talk to the STEAMbit app over Bluetooth.
 */
//% block="STEAMbit bluetooth"
//% color="#796EB0"
//% icon="\uf294"
//% weight=95
//% groups=["Connection", "Project", "Joystick"]
namespace steambitBluetooth {

    /**
     * A label for the STEAMbit app: pick a letter (A–Z, like the app grid)
     * or type a longer one like "temp".
     */
    //% blockId=steambit_bt_label
    //% block="$label"
    //% blockHidden=true
    //% shim=TD_ID
    //% colorSecondary="#FFFFFF"
    //% label.fieldEditor="textdropdown"
    //% label.fieldOptions.values="A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z"
    //% label.fieldOptions.decompileLiterals=true
    //% label.defl="A"
    export function __label(label: string): string {
        return label
    }

    // ----- Connection -----

    /**
     * Run code when the STEAMbit app connects.
     */
    //% blockId=steambit_bt_on_connected
    //% block="on app connected"
    //% group="Connection"
    //% weight=100 blockGap=8
    export function onAppConnected(handler: () => void): void {
        init()
        addConnectHandler(handler)
    }

    /**
     * Run code when the STEAMbit app disconnects.
     */
    //% blockId=steambit_bt_on_disconnected
    //% block="on app disconnected"
    //% group="Connection"
    //% weight=99 blockGap=8
    export function onAppDisconnected(handler: () => void): void {
        init()
        addDisconnectHandler(handler)
    }

    /**
     * True while the STEAMbit app is connected.
     */
    //% blockId=steambit_bt_app_connected
    //% block="app connected"
    //% group="Connection"
    //% weight=98
    export function appConnected(): boolean {
        init()
        return isConnected()
    }

    // ----- Project -----

    /**
     * The last number the app sent with this label (0 if nothing arrived yet).
     * @param label the label chosen in the app, eg: "A"
     */
    //% blockId=steambit_bt_number_value
    //% block="app value $label"
    //% label.shadow=steambit_bt_label
    //% label.defl="A"
    //% group="Project"
    //% weight=90 blockGap=8
    export function numberValue(label: string): number {
        init()
        declare(label, "num", "w")
        return toNumber(lastText(label))
    }

    /**
     * The last text the app sent with this label ("" if nothing arrived yet).
     * @param label the label chosen in the app, eg: "M"
     */
    //% blockId=steambit_bt_text_value
    //% block="app text $label"
    //% label.shadow=steambit_bt_label
    //% label.defl="M"
    //% group="Project"
    //% weight=89 blockGap=8
    export function textValue(label: string): string {
        init()
        declare(label, "text", "w")
        return lastText(label)
    }

    /**
     * True if the last value the app sent with this label is not "0" and not
     * empty. Works with the app switch (values 1/0).
     * @param label the label chosen in the app, eg: "A"
     */
    //% blockId=steambit_bt_is_on
    //% block="$label is on"
    //% label.shadow=steambit_bt_label
    //% label.defl="A"
    //% group="Project"
    //% weight=88
    export function isOn(label: string): boolean {
        init()
        declare(label, "bool", "w")
        const value = lastText(label)
        return value != "0" && value != ""
    }

    /**
     * Send a number to the app. Shows up in gauges, digits and charts that
     * use this label.
     * @param label the label for the app, eg: "T"
     * @param value the number to send
     */
    //% blockId=steambit_bt_send_number
    //% block="send to app $label = $value"
    //% label.shadow=steambit_bt_label
    //% label.defl="T"
    //% group="Project"
    //% weight=80
    export function sendNumber(label: string, value: number): void {
        init()
        sendDataLine(label, "" + value, "num")
    }

    /**
     * Run code every time the app sends a value with this label.
     * @param label the label chosen in the app, eg: "A"
     */
    //% blockId=steambit_bt_on_receive
    //% block="on app sends $label $value"
    //% label.shadow=steambit_bt_label
    //% label.defl="A"
    //% draggableParameters="reporter"
    //% group="Project"
    //% weight=95
    export function onReceive(label: string, handler: (value: number) => void): void {
        init()
        declare(label, "num", "w")
        addReceiveHandler(label, handler)
    }

    /**
     * Send a text to the app (for example to a terminal).
     * @param label the label for the app, eg: "M"
     * @param text the text to send, eg: "hello"
     */
    //% blockId=steambit_bt_send_text
    //% block="send text to app $label = $text"
    //% label.shadow=steambit_bt_label
    //% label.defl="M"
    //% group="Project"
    //% advanced=true
    //% weight=70 blockGap=8
    export function sendText(label: string, text: string): void {
        init()
        sendDataLine(label, text, "text")
    }

    /**
     * Send true/false to the app (1/0, for a status indicator).
     * @param label the label for the app, eg: "L"
     * @param value the value to send
     */
    //% blockId=steambit_bt_send_boolean
    //% block="send yes/no to app $label = $value"
    //% label.shadow=steambit_bt_label
    //% label.defl="L"
    //% value.shadow=toggleYesNo
    //% group="Project"
    //% advanced=true
    //% weight=69 blockGap=8
    export function sendBoolean(label: string, value: boolean): void {
        init()
        sendDataLine(label, value ? "1" : "0", "bool")
    }

    /**
     * Send an event to the app (it shows up in the app monitor).
     * @param name the event name, letters, numbers and _ only, eg: "buttonA"
     */
    //% blockId=steambit_bt_send_event
    //% block="send event $name to app"
    //% group="Project"
    //% advanced=true
    //% weight=68
    export function sendAppEvent(name: string): void {
        init()
        sendEventLine(name)
    }

    /**
     * Minimum pause between messages sent to the app. 100 ms is tested to
     * lose no bytes; lower values send faster but may lose data.
     * @param ms pause in milliseconds, eg: 100
     */
    //% blockId=steambit_bt_set_send_interval
    //% block="set pause between sends to $ms ms"
    //% group="Project"
    //% advanced=true
    //% weight=60
    export function setSendInterval(ms: number): void {
        init()
        setTxGap(ms)
    }
}
