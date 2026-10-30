/**
 * Talk to the STEAMbit app over Bluetooth.
 */
//% block="STEAMbit bluetooth"
//% color="#796EB0"
//% icon=""
//% weight=95
//% groups=["Connection", "Project", "Joystick"]
namespace steambitBluetooth {

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
}
