class USBHID {
    static isConnected = false;
    static connectedDirect = false;
    static connectedReceiver = false;
    static hidDirect = null;
    static hidReceiver = null;
    static async connectDirect() {
        this.hidDirect = await navigator.hid.requestDevice({filters: []})
    }
}