#!/usr/bin/env python3
import os
import json
import time
import psutil
from logs import log

GADGET_DIR = "/sys/kernel/config/usb_gadget/g1"

def create_custom_hid_gadget():
    if os.path.exists(GADGET_DIR):
        log("Gadget already exists, proceeding to listener loop...", "USB SETUP")
        return

    log("Creating custom USB HID gadget...", "USB SETUP")
    os.makedirs(f"{GADGET_DIR}/functions/hid.usb0", exist_ok=True)
    os.makedirs(f"{GADGET_DIR}/configs/c.1/strings/0x409", exist_ok=True)
    os.makedirs(f"{GADGET_DIR}/strings/0x409", exist_ok=True)

    with open(f"{GADGET_DIR}/idVendor", "w") as f:
        f.write("0xCAFE") # CAFE - vendor id
    with open(f"{GADGET_DIR}/idProduct", "w") as f:
        f.write("0x8EAD") # HEAD(unit) - product id
    with open(f"{GADGET_DIR}/bcdDevice", "w") as f:
        f.write("0x0100")
    with open(f"{GADGET_DIR}/bcdUSB", "w") as f:
        f.write("0x0200")

    with open(f"{GADGET_DIR}/strings/0x409/serialnumber", "w") as f:
        f.write("0000000001") # Serial number
    with open(f"{GADGET_DIR}/strings/0x409/manufacturer", "w") as f:
        f.write("gregoryk07") # Manufacturer
    with open(f"{GADGET_DIR}/strings/0x409/product", "w") as f:
        f.write("Łazik prototype") # Device name

    with open(f"{GADGET_DIR}/functions/hid.usb0/protocol", "w") as f:
        f.write("0")
    with open(f"{GADGET_DIR}/functions/hid.usb0/subclass", "w") as f:
        f.write("0")
    with open(f"{GADGET_DIR}/functions/hid.usb0/report_length", "w") as f:
        f.write("65")

    # custom_descriptor = bytes([
    #     0x06, 0x00, 0xff,  # Usage Page (Vendor Defined 0xFF00)
    #     0x09, 0x01,        # Usage (1)
    #     0xa1, 0x01,        # Collection (Application)
    #     0x09, 0x02,        #   Usage (2) - Input Report
    #     0x15, 0x00,        #   Logical Minimum (0)
    #     0x26, 0xff, 0x00,  #   Logical Maximum (255)
    #     0x75, 0x08,        #   Report Size (8 bits)
    #     0x95, 0x40,        #   Report Count (64 bytes)
    #     0x81, 0x02,        #   Input (Data, Variable, Absolute)
    #     0x09, 0x03,        #   Usage (3) - Output Report
    #     0x15, 0x00,        #   Logical Minimum (0)
    #     0x26, 0xff, 0x00,  #   Logical Maximum (255)
    #     0x75, 0x08,        #   Report Size (8 bits)
    #     0x95, 0x40,        #   Report Count (64 bytes)
    #     0x91, 0x02,        #   Output (Data, Variable, Absolute)
    #     0xc0               # End Collection
    # ])

    custom_descriptor = bytes([
        0x06, 0x00, 0xff,  # Usage Page (Vendor Defined 0xFF00)
        0x09, 0x01,        # Usage (1)
        0xa1, 0x01,        # Collection (Application)
        
        # --- RAPORT WEJŚCIOWY NR 1 (Report ID: 0x01) ---
        0x85, 0x01,        # Report ID (1)
        0x09, 0x02,        # Usage (2)
        0x15, 0x00,        # Logical Minimum (0)
        0x26, 0xff, 0x00,  # Logical Maximum (255)
        0x75, 0x08,        # Report Size (8 bits)
        0x95, 0x40,        # Report Count (64 bytes)
        0x81, 0x02,        # Input (Data, Variable, Absolute)

        # --- RAPORT WEJŚCIOWY NR 2 (Report ID: 0x02) ---
        0x85, 0x02,        # Report ID (2)
        0x09, 0x03,        # Usage (3)
        0x15, 0x00,        # Logical Minimum (0)
        0x26, 0xff, 0x00,  # Logical Maximum (255)
        0x75, 0x08,        # Report Size (8 bits)
        0x95, 0x40,        # Report Count (64 bytes)
        0x81, 0x02,        # Input (Data, Variable, Absolute)

        # --- RAPORT WYJŚCIOWY NR 1 (Report ID: 0x01) ---
        0x85, 0x01,        # Report ID (1)
        0x09, 0x04,        # Usage (4)
        0x15, 0x00,        # Logical Minimum (0)
        0x26, 0xff, 0x00,  # Logical Maximum (255)
        0x75, 0x08,        # Report Size (8 bits)
        0x95, 0x40,        # Report Count (64 bytes)
        0x91, 0x02,        # Output (Data, Variable, Absolute)

        0xc0               # End Collection
    ])

    with open(f"{GADGET_DIR}/functions/hid.usb0/report_desc", "wb") as f:
        f.write(custom_descriptor)

    with open(f"{GADGET_DIR}/configs/c.1/strings/0x409/configuration", "w") as f:
        f.write("Config 1")
    
    os.symlink(f"{GADGET_DIR}/functions/hid.usb0", f"{GADGET_DIR}/configs/c.1/hid.usb0")

    udc_list = os.listdir("/sys/class/udc")
    if udc_list:
        with open(f"{GADGET_DIR}/UDC", "w") as f:
            f.write(udc_list[0])
        log("Custom HID gadget bound successfully.", "USB SETUP")
    else:
        raise RuntimeError("No UDC device found.")



def handle_requests():
    log("Listening for requests from host on /dev/hidg0...", "USB SETUP")
    # Initialize psutil cpu percent tracker
    psutil.cpu_percent(interval=None)
    
    while True:
        try:
            with open('/dev/hidg0', 'rb') as fd:
                request_bytes_with_reportid = fd.read(65)
                request_bytes = request_bytes_with_reportid[1:]
                
            
            command = request_bytes.decode('utf-8').replace('\0', '').strip()
            # print(f"Received command: {command}")

            if command == "GET_DATA":
                log("USBHID REQUEST : GET DATA", "USB SETUP")
                # Gather live stats
                sensor_data = {
                    "device": "Raspberry Pi 4",
                    "status": "operational",
                    "temperature_celsius": get_cpu_temperature(),
                    "cpu_load_percent": psutil.cpu_percent(interval=None),
                    "timestamp": time.time()
                }
                
                json_str = json.dumps(sensor_data)
                payload_bytes = json_str.encode('utf-8')
                
                chunk_size = 64
                for i in range(0, len(payload_bytes), chunk_size):
                    chunk = payload_bytes[i:i + chunk_size].ljust(64, b'\x00')
                    with open('/dev/hidg0', 'wb') as fd:
                        fd.write(chunk)
                    time.sleep(0.01)
                    
                log(f"Sent live stats JSON response ({len(payload_bytes)} bytes total).", "USB SETUP")
                
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(0.5)
def send_data(data, reportid = 1):
    try:
        payload_bytes = data.encode('utf-8')
                
        chunk_size = 64
        for i in range(0, len(payload_bytes), chunk_size):
            chunk = payload_bytes[i:i + chunk_size].ljust(64, b'\x00')
            packet = bytes([reportid]) + chunk
            with open('/dev/hidg0', 'wb') as fd:
                fd.write(packet)
            time.sleep(0.01)
                    
        # print(f"Sent live stats JSON response ({len(payload_bytes)} bytes total).")
    except Exception as e:
        log(f"{e}", "ERROR")


if __name__ == "__main__":
    create_custom_hid_gadget()
    handle_requests()
