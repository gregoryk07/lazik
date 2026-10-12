import usb_setup as usbhid
import time
import json
from datetime import datetime
import os
import psutil
import motors as motors
import glob # UDC PATH FILTERING BECAUSE OF ASTERISK (*)
import statusLED as ledStatus

hardwareAttached = True

lastUSBConnectState = "not attached"


version = "v0"

steer = [0, 0]

engines = [0, 0, 0, 0]

def get_cpu_temperature():
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return round(float(f.read().strip()) / 1000.0, 1)
    except Exception:
        return 0.0

lastLog = ""

def log(log):
    global lastLog
    if(log == lastLog):
        return
    lastLog = log
    now = datetime.now()
    with open("logs/" + str(now.strftime("%Y-%m-%d")) + "-logdump.log", "a") as file:
        nowFormatted = now.strftime("%Y-%m-%d %H:%M:%S")
        file.write(f"[{nowFormatted}] {log}\n")
    print(log)
log("START")
def sendStatus():
    psutil.cpu_percent(interval=None)
    dataPacket = {
        "name": "lazik",
        "version": version,
        "time": time.time(),
        "engines": {
            "fl": engines[0],
            "fr": engines[1],
            "rl": engines[2],
            "rr": engines[3]
        },
        "steer": {
            "fl" : steer[0],
            "fr" : steer[1]
        },
        "cpu_temp": get_cpu_temperature(),
        "cpu_load": psutil.cpu_percent(interval=None)
    }

    json_str = json.dumps(dataPacket)
    print(json_str)
    usbhid.send_data(json_str)

def usbcmdrun():
    global engines
    global steer
    global version
    global hardwareAttached
    global lastUSBConnectState

    udc_paths = glob.glob('/sys/class/udc/*/state')

    with open(udc_paths[0], 'r') as state_file:
        state = state_file.read().strip("\n")
        if state != lastUSBConnectState:
            log("USB STATUS CHANGED: " + lastUSBConnectState + " -> " + state)
            lastUSBConnectState = state
            ledStatus.rgb(0, 1, 1)
            match lastUSBConnectState:
                case "not attached":
                    ledStatus.rgb(0, 1, 0)
                case "configured":
                    ledStatus.rgb(0, 0, 1)
                

    with open('/dev/hidg0', 'rb') as fd:
        request_bytes = fd.read(64)
    
    command = request_bytes.decode('utf-8').replace('\0', '').strip()
    print(command)
    if command == "DUMPDIR":
        with os.scandir("logs/") as d:
            files = []
            for e in d:
                if(not e.is_dir()):
                    fsize = e.stat().st_size
                    fname = e.name
                    files.append({"name": fname, "size": fsize})
            print(files)
            usbhid.send_data(json.dumps({"action" : "dumpdir", "files": files}))
    if "DUMPLOG" in command:
        requested_fname = command.split()[1]
        with open("logs/" + str(requested_fname), "r") as f:
            logs = f.read()
            usbhid.send_data(json.dumps({"action" : "dumplog", "name" : requested_fname, "log": logs}))
    if command == "KILLENGINES":
        engines = [0, 0, 0, 0]
        motors.motor(128)
        sendStatus()
    if "SETENGINE" in command:
        
        print("ENGINE " + command.split()[1] + " = " + str(command.split()[2]))
        engines[int(command.split()[1])] = int(command.split()[2])
        desiredMotorSpeed = int(command.split()[2])
        desiredMotorSpeed = max(-100, desiredMotorSpeed)
        desiredMotorSpeed = min(100, desiredMotorSpeed)
        mappedMotorSpeed = 128 + (desiredMotorSpeed * 128 / 100)
        mappedMotorSpeed = max(0, mappedMotorSpeed)
        mappedMotorSpeed = min(255, mappedMotorSpeed)
        motors.motor(mappedMotorSpeed)
        sendStatus()
    if "SETSTEER" in command:
        cmdsplit = command.split()
        print("STEER = " + str(cmdsplit[1]))
        steer[0], steer[1] = cmdsplit[1], cmdsplit[1]
        sendStatus()
    # sendStatus()
    if command == "GET_DATA":
        sendStatus()

if __name__ == "__main__":
    ledStatus.setup()
    ledStatus.rgb(1, 1, 1)

    time.sleep(1)
    log(" ")
    log(" ")
    log("----------")
    log(" ")
    log(" ")
    log("ŁAZIK SOFT LOADING")
    log(version)
    # hardwareAttached = motors.setup()
    if not hardwareAttached:
        log("HARDWARE NOT DETECTED, RUNNING IN HEADLESS MODE")
    usbhid.create_custom_hid_gadget()
    log("ŁAZIK SOFT READY")
    ledStatus.rgb(0, 1, 0)
    while True:
        # print(f"VEL: {engines}\nINFO: {lastmsg}", end="\n\r\r")
        try:
            usbcmdrun()
        except KeyboardInterrupt:
            log("STOP")
            motors.destroy()
            exit()
        except Exception as e:
            pass
            # log(f"Error {e}")
    # usbhid.handle_requests()
log("STOP")
motors.destroy()