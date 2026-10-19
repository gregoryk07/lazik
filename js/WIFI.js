class WIFI {
    static videoFrameBuffer = []
    static createFrame() {
        const validChunks = WIFI.videoFrameBuffer.filter(el => el !== undefined);

        if (validChunks.length === 0) {
            WIFI.videoFrameBuffer = [];
            return;
        }

        const totalLength = validChunks.reduce((sum, arr) => sum + arr.length, 0);
        const videoPacket = new Uint8Array(totalLength);

        let offset = 0;
        for (const chunk of validChunks) {
            videoPacket.set(chunk, offset);
            offset += chunk.length;
        }

        // Szukamy poprawnego końca JPEG (0xFF, 0xD9) i obcinamy śmieci
        let cleanPacket = videoPacket;
        let foundEnd = false;

        for (let i = videoPacket.length - 2; i >= 0; i--) {
            if (videoPacket[i] === 0xFF && videoPacket[i + 1] === 0xD9) {
                cleanPacket = videoPacket.subarray(0, i + 2);
                foundEnd = true;
                break;
            }
        }

        if (!foundEnd) {
            console.warn("Nie znaleziono poprawnego znacznika końca JPEG (FF D9)!");
        }

        // 5. Resetujemy bufor na kolejną klatkę
        WIFI.videoFrameBuffer = [];

        // Tworzymy Blob z oczyszczonych bajtów
        const b = new Blob([cleanPacket], { type: 'image/jpeg' });
        const link = URL.createObjectURL(b);

        return link;
    }
    // DRIVERS
    static LAZIK_DIRECT = null
    static STEAMDECK = null
    static deviceData = {
        LazikDirect: {
            armPosition: {
                desiredX: 0,
                desiredY: 0,
                desiredZ: 0,
                baseY: 0,
                alpha: 0,
                beta: 0,
                gamma: 0,
                arm_len1: 6,
                arm_len2: 6,
                arm_len3: 3
            }
        }
    }
    static handleData = {
        LazikDirect(reportId, bytes) {
            switch (reportId) {
                case 1:
                    if (bytes[0] == 0xA0) { // arm position callback (every 2 sec)
                        WIFI.deviceData.LazikDirect.armPosition.baseY = bytes[1] / 255 * 360;
                        WIFI.deviceData.LazikDirect.armPosition.alpha = bytes[2] / 255 * 360;
                        WIFI.deviceData.LazikDirect.armPosition.beta = bytes[3] / 255 * 360;
                        dispatchEvent(new CustomEvent("LAZIK_ARMUPDATE"));
                    }
                    break;

                case 2:

                    if (bytes[0] == 0x01) {
                        const packet = new Uint8Array(bytes);

                        const dataChunk = packet.subarray(2);
                        // console.log(dataChunk);

                        WIFI.videoFrameBuffer[bytes[1]] = dataChunk;
                    }
                    else if (bytes[0] == 0x02) {
                        const framelink = WIFI.createFrame();
                        dispatchEvent(new CustomEvent("CAMERA_FRAME_RECEIVED", {
                            detail: {
                                link: framelink
                            }
                        }))
                    }
                    // console.log("UNIMPLEMENTED")
                    break;
            }
        }
    }
    static Connect = {
        LazikDirect: async (addr = "10.0.0.1", port = 8765, auto = false) => {
            let dev = new WebSocket("ws://" + addr + ":" + port);
            // console.log("\"LAZIK DIRECT\" CONNECTED (WIFI)")
            console.log(dev)
            dev.onopen = () => {

                dispatchEvent(
                    new CustomEvent("WIFI_CONFIGURED", {
                        detail: {
                            deviceType: "LAZIK_DIRECT",
                        },
                    }
                    )
                );
            }
            dev.onerror = (e) => {
                dispatchEvent(
                    new CustomEvent("WIFI_ERROR", {
                        detail: {
                            deviceType: "LAZIK_DIRECT",
                            error: e
                        }
                    })
                )
            }
            dev.onclose = (e) => {
                dispatchEvent(
                    new CustomEvent("WIFI_DISCONNECT", {
                        detail: {
                            deviceType: "LAZIK_DIRECT"
                        }
                    })
                )
            }
            dev.onmessage = (e) => {
                dispatchEvent(new CustomEvent("WIFI_RAWDATA_INCOMING", {
                    detail:
                    {
                        deviceType: "LAZIK_DIRECT",
                        data: e
                    }
                }))
                WIFI.handleData.LazikDirect(e);
            }
            // VARIABLES AVAILABLE:
            // dev
            // ASSIGNMENT LOGIC HERE
            // dev.oninputreport = (e) => {
            //     const { data, reportId } = e;
            //     const receivedBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            //     // const receivedBytesHexString = receivedBytes.toHex().match(/.{1,2}/g).join(' ');

            //     // console.log(reportId, receivedBytesHexString)

            //     dispatchEvent(new CustomEvent("WIFI_RAWDATA_INCOMING", {
            //         detail:
            //         {
            //             deviceType: "LAZIK_DIRECT",
            //             reportId: reportId,
            //             bytes: receivedBytes
            //         }
            //     }))

            //     WIFI.handleData.LazikDirect(reportId, receivedBytes)
            // }

            // dev.open()
            WIFI.LAZIK_DIRECT = dev;
            // dispatchEvent(new CustomEvent("WIFI_CONFIGURED", {
            //     detail: {
            //         deviceType: "LAZIK_DIRECT",
            //     },
            // }));

        }
    }
    static async TryConnectDevices(auto = false) {
        let devs = await navigator.hid.getDevices();
        for (let i = 0; i < devs.length; i++) {
            const dev = devs[i];
            WIFI.TryConnectDevice(dev, auto)
        }
    }
    static async TryConnectDevice(addr = "10.0.0.1", port = 8765, auto = false) {
        WIFI.Connect.LazikDirect(addr, port, auto)
        // WIFI.Connect.Steamdeck(dev, auto)
    }
}
// navigator.hid.addEventListener("connect", (e) => {
//     WIFI.TryConnectDevice(e.device, true);
// })
// navigator.hid.addEventListener("disconnect", (e) => {
//     console.log(e.device.productName + " DISCONNECTED")
// })
WIFI.TryConnectDevices(true)
