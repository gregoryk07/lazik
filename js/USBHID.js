function deadzone(x, y, _deadzone){
    let _x = (Math.abs(x) >= _deadzone) ? x : 0
    let _y = (Math.abs(y) >= _deadzone) ? y : 0
    return {x: _x, y: _y}
}
class USBHID{
    // DRIVERS
    static LAZIK_DIRECT = null
    static STEAMDECK = null
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
        },
        Steamdeck : {
            LeftThumbstick: {
                isTouching: false,
                x: 0,
                y: 0
            },
            RightThumbstick: {
                isTouching: false,
                x: 0,
                y: 0
            },
            LeftTouchpad: {
                isTouching: false,
                pressure: 0,
                x: 0,
                y: 0
            },
            RightTouchpad: {
                isTouching: false,
                pressure: 0,
                x: 0,
                y: 0
            },
            Dpad: {
                x: 0,
                y: 0
            },
            Buttons: {
                A: false,
                B: false,
                X: false,
                Y: false,
                L1: false,
                R1: false,
                START: false,
                SELECT: false,
                L3: false,
                R3: false,
                L4: false,
                R4: false,
                L5: false,
                R5: false
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
        },
        Steamdeck(reportId, bytes){
            switch(bytes[13]){ // THUMBSTICK TOUCH
                case 0x40:
                    USBHID.deviceData.Steamdeck.LeftThumbstick.isTouching = true;
                    USBHID.deviceData.Steamdeck.RightThumbstick.isTouching = false;
                    break;
                case 0x80:
                    USBHID.deviceData.Steamdeck.LeftThumbstick.isTouching = false;
                    USBHID.deviceData.Steamdeck.RightThumbstick.isTouching = true;
                    break;
                case 0xc0:
                    USBHID.deviceData.Steamdeck.LeftThumbstick.isTouching = true;
                    USBHID.deviceData.Steamdeck.RightThumbstick.isTouching = true;
                    break;
                default: 
                    USBHID.deviceData.Steamdeck.LeftThumbstick.isTouching = false;
                    USBHID.deviceData.Steamdeck.RightThumbstick.isTouching = false;
                    break;
            }
            switch(bytes[10]){ // TOUCHPAD TOUCH
                case 0x08:
                    USBHID.deviceData.Steamdeck.LeftTouchpad.isTouching = true;
                    USBHID.deviceData.Steamdeck.RightTouchpad.isTouching = false;
                    break;
                case 0x10:
                    USBHID.deviceData.Steamdeck.LeftTouchpad.isTouching = false;
                    USBHID.deviceData.Steamdeck.RightTouchpad.isTouching = true;
                    break;
                case 0x18:
                    USBHID.deviceData.Steamdeck.LeftTouchpad.isTouching = true;
                    USBHID.deviceData.Steamdeck.RightTouchpad.isTouching = true;
                    break;
                default:
                    USBHID.deviceData.Steamdeck.LeftTouchpad.isTouching = false;
                    USBHID.deviceData.Steamdeck.RightTouchpad.isTouching = false;
                    break;
            }
            // TOUCHPAD LEFT
            USBHID.deviceData.Steamdeck.LeftTouchpad.x = bytes[16] * 256 + bytes[17]
            USBHID.deviceData.Steamdeck.LeftTouchpad.y = bytes[18] * 256 + bytes[19]

            // TOUCHPAD RIGHT
            USBHID.deviceData.Steamdeck.RightTouchpad.x = bytes[20] * 256 + bytes[21]
            USBHID.deviceData.Steamdeck.RightTouchpad.y = bytes[22] * 256 + bytes[23]


            // LEFT THUMBSTICK
            let l_thumb = deadzone(
                (bytes[48] * 256 + bytes[49] - 0x0180 - 32511) / 32511,
                (bytes[50] * 256 + bytes[51] - 0x0180 - 32511) / 32511,
                0.75
            )
            USBHID.deviceData.Steamdeck.LeftThumbstick.x = l_thumb.x
            USBHID.deviceData.Steamdeck.LeftThumbstick.y = l_thumb.y
            // RIGHT THUMBSTICK
            let r_thumb = deadzone(
                (bytes[52] * 256 + bytes[53] - 0x0180 - 32511) / 32511,
                (bytes[54] * 256 + bytes[55] - 0x0180 - 32511) / 32511,
                0.75
            )
            USBHID.deviceData.Steamdeck.RightThumbstick.x = r_thumb.x
            USBHID.deviceData.Steamdeck.RightThumbstick.y = r_thumb.y


            // BUTTONS ABXY
            // switch(bytes[8]){
            //     case:
            // }
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
            USBHID.LAZIK_DIRECT = dev;
            dispatchEvent( new CustomEvent("USBHID_CONFIGURED", {
            detail: {
                deviceType: "LAZIK_DIRECT",
            },
            }));

        },
        Steamdeck : async (_dev = null, auto = false) => {
            if(!navigator.hid){
                throw new Error("WebHID not supported on this device!");
                return;
                
            }
            let dev = null;
            if(_dev != null){
                if(_dev.vendorId == 0x28DE && _dev.productId == 0x1205 && _dev.collections[0].usagePage == 0xFFFF && _dev.collections[0].usage == 0x0001){
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
                    filters: [{ vendorId : 0x28DE, productId : 0x1205 }]
                }))[1];
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
                deviceType: "STEAMDECK",
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
                        deviceType: "STEAMDECK",
                        reportId : reportId,
                        bytes : receivedBytes
                    }
                }) )

                USBHID.handleData.Steamdeck(reportId, receivedBytes)
            }

            dev.open()
            USBHID.STEAMDECK = dev;
            dispatchEvent( new CustomEvent("USBHID_CONFIGURED", {
            detail: {
                deviceType: "STEAMDECK",
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
        USBHID.Connect.Steamdeck(dev, auto)
    }
}
navigator.hid.addEventListener("connect", (e) => {
    USBHID.TryConnectDevice(e.device, true);
})
navigator.hid.addEventListener("disconnect", (e) => {
    console.log(e.device.productName + " DISCONNECTED")
})
USBHID.TryConnectDevices(true)
