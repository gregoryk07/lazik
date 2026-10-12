class USBHID{
    // DRIVERS
    static LAZIK_D = null
    static deviceData = {
        LazikDirect: {
            armPosition: {
                desiredX : 0,
                desiredY : 0,
                desiredZ : 0,
                baseY: 0,
                alpha : 0,
                beta : 0,
                gamma : 0,
                arm_len1 : 6,
                arm_len2 : 6,
                arm_len3 : 3
            }
        }
    }
    static handleData = {
        LazikDirect(reportId, bytes){
            switch(reportId){
                case 1:
                    if(bytes[0] == 0xA0){ // arm position callback (every 2 sec)
                        USBHID.deviceData.LazikDirect.armPosition.baseY = bytes[1] / 255 * 360
                        USBHID.deviceData.LazikDirect.armPosition.alpha = bytes[2] / 255 * 360
                        USBHID.deviceData.LazikDirect.armPosition.beta = bytes[3] / 255 * 360
                        dispatchEvent( new CustomEvent("LAZIK_ARMUPDATE") );
                    }
                    break;
                case 2:
                    console.warn("UNINTERPRETED CAMERA DATA INCOMING")
                    break;
            }
        }
    }
    static Connect = {
        LazikDirect : async (_dev = null, auto = false) => {
            if(!navigator.hid){
                throw new Error("WebHID not supported on this device!");
                return;
                
            }
            let dev = null;
            if(_dev != null){
                if(_dev.vendorId == 0xCAFE && _dev.productId == 0x8EAD && _dev.collections[0].usagePage == 0xFF00 && _dev.collections[0].usage == 0x0001){
                    dev = _dev
                }
                else{
                    console.log("INCORRECT DEVICE")
                    if(!auto)dispatchEvent( new CustomEvent("USBHID_SELECT_INCORRECT_DEVICE") );
                    return;
                }
            }
            else{
                let tempDev = (await navigator.hid.requestDevice({
                    filters: [{ vendorId : 0xCAFE, productId : 0x8EAD }]
                }))[0];
                if(tempDev){
                    dev = tempDev
                }else{
                    console.log("NO DEVICE SELECTED BY USER")
                    if(!auto)dispatchEvent( new CustomEvent("USBHID_SELECT_NO_DEVICE") );
                    return;
                }
            }
            console.log("\"" + dev.productName +  "\" CONNECTED")
            console.log(dev)
            dispatchEvent( new CustomEvent("USBHID_CONNECTED", {
            detail: {
                deviceType: "LAZIK_DIRECT",
            },
            }));
            // VARIABLES AVAILABLE:
            // dev
            // ASSIGNMENT LOGIC HERE
            dev.oninputreport = (e) => {
                const {data, reportId} = e;
                const receivedBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                // const receivedBytesHexString = receivedBytes.toHex().match(/.{1,2}/g).join(' ');
                
                // console.log(reportId, receivedBytesHexString)

                dispatchEvent( new CustomEvent("USBHID_RAWDATA_INCOMING", {
                    detail:
                    {
                        deviceType: "LAZIK_DIRECT",
                        reportId : reportId,
                        bytes : receivedBytes
                    }
                }) )

                USBHID.handleData.LazikDirect(reportId, receivedBytes)
            }

            dev.open()
            USBHID.LAZIK_D = dev;
            dispatchEvent( new CustomEvent("USBHID_CONFIGURED", {
            detail: {
                deviceType: "LAZIK_DIRECT",
            },
            }));

        }
    }
    static async TryConnectDevices(auto = false){
        let devs = await navigator.hid.getDevices();
        for (let i = 0; i < devs.length; i++) {
            const dev = devs[i];
            USBHID.TryConnectDevice(dev, auto)
        }
    }
    static async TryConnectDevice(dev, auto=false){
        USBHID.Connect.LazikDirect(dev,auto)
    }
}
navigator.hid.addEventListener("connect", (e) => {
    USBHID.TryConnectDevice(e.device, true);
})
navigator.hid.addEventListener("disconnect", (e) => {
    console.log(e.device.productName + " DISCONNECTED")
})
USBHID.TryConnectDevices(true)
