import hid
import time

# Dane odczytane z Twojego okna "Device info":
VENDOR_ID = 0xCAFE
PRODUCT_ID = 0x4242

try:
  # Połączenie z Raspberry Pi Pico 2
  device = hid.device()
  device.open(VENDOR_ID, PRODUCT_ID)
  print(f"Połączono pomyślnie z: {device.get_product_string()}")

  # --- TEST 1: Włączenie diody LED ---
  # Ponieważ w kodzie Arduino usunęliśmy Report ID (wynosi 0),
  # biblioteka hidapi wymaga, aby pierwszym bajtem w tablicy było 0x00.
  # Następne bajty to właściwe dane (0x01 włącza diodę + 63 zera dopełniające).
  print("Wysyłam polecenie: WŁĄCZ LED...")
  paczka_włączająca = [0x00] + [0x01] + [0x00] * 63
  device.write(paczka_włączająca)

  time.sleep(2) # Odczekaj 2 sekundy, aby zobaczyć efekt

  # --- TEST 2: Wyłączenie diody LED ---
  print("Wysyłam polecenie: WYŁĄCZ LED...")
  paczka_wyłączająca = [0x00] + [0x00] + [0x00] * 63
  device.write(paczka_wyłączająca)

  device.close()
  print("Test zakończony pomyślnie!")

except Exception as e:
  print(f"Błąd komunikacji: {e}")
