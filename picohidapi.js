/**
 * Kompletne API WebHID dla Nadajnika na Raspberry Pi Pico 2W.
 * Obsługuje dwukierunkową komunikację wielokanałową (Report ID 1 i 2).
 */
const PicoHidApi = {
  // Twoje unikalne identyfikatory zdefiniowane w kodzie Pico 2W
  VID: 0xCAFE,
  PID: 0x4242,
  device: null,

  // Przechowywanie funkcji zwrotnych (callbacks) dla konkretnych kanałów
  callbacks: {
    config: null,
    radio: null
  },

  /**
   * Otwiera systemowe okno wyboru urządzenia i nawiązuje połączenie USB HID.
   * UWAGA: Ta funkcja MUSI być wywołana wewnątrz zdarzenia kliknięcia (click) użytkownika.
   * @returns {Promise<boolean>} Zwraca true w przypadku sukcesu.
   */
  async connect() {
    try {
      // Pobranie listy urządzeń pasujących do filtrów VID/PID
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: this.VID, productId: this.PID }]
      });

      if (devices.length === 0) {
        console.warn("Użytkownik anulował wybór urządzenia.");
        return false;
      }

      this.device = devices[0];

      // Otwarcie sesji komunikacyjnej
      if (!this.device.opened) {
        await this.device.open();
      }

      console.log(`%c[Pico HID] Połączono z urządzeniem: ${this.device.productName}`, 'color: #00ff00; font-weight: bold;');
      
      // Automatyczne uruchomienie wewnętrznego odbiornika i rozdzielacza kanałów
      this._initializeReceiver();
      return true;
    } catch (error) {
      console.error("[Pico HID] Błąd podczas łączenia:", error);
      return false;
    }
  },

  /**
   * Bezpiecznie zamyka połączenie z urządzeniem.
   */
  async disconnect() {
    if (this.device && this.device.opened) {
      await this.device.close();
      console.log("[Pico HID] Rozłączono pomyślnie.");
    }
    this.device = null;
  },

  /**
   * [Prywatna] Odpowiada za odbiór paczek (Input Report) i routowanie ich po Report ID.
   */
  _initializeReceiver() {
    if (!this.device) return;

    this.device.oninputreport = (event) => {
      // Wyciągamy czysty bufor danych o długości 64 bajtów
      const rawData = new Uint8Array(event.data.buffer);
      const channel = event.reportId;

      switch (channel) {
        case 1:
          // Kanał Konfiguracyjny (Input Report ID = 1)
          if (typeof this.callbacks.config === 'function') {
            this.callbacks.config(rawData);
          }
          break;
        case 2:
          // Kanał Passthrough Radiowego (Input Report ID = 2)
          if (typeof this.callbacks.radio === 'function') {
            this.callbacks.radio(rawData);
          }
          break;
        default:
          console.warn(`[Pico HID] Odebrano dane z nieznanego kanału (Report ID: ${channel})`);
      }
    };
  },

  /**
   * Generyczna funkcja wysyłająca niskopoziomowy Output Report.
   * Automatycznie dopełnia przesyłaną tablicę zerami do wymaganych 64 bajtów.
   * @param {number} reportId - Identyfikator kanału (1 lub 2).
   * @param {Array|Uint8Array} dataArray - Bajty do wysłania.
   */
  async _sendReport(reportId, dataArray) {
    if (!this.device || !this.device.opened) {
      console.error("[Pico HID] Błąd: Urządzenie nie jest podłączone.");
      return false;
    }

    // Alokacja sztywnego bufora 64 bajtów (wymóg sprzętowy deskryptora)
    const outputBuffer = new Uint8Array(64);

    // Przepisanie danych wejściowych
    for (let i = 0; i < Math.min(dataArray.length, 64); i++) {
      outputBuffer[i] = dataArray[i];
    }

    try {
      // Wywołanie natywnej metody WebHID (Chrome automatycznie dołączy Report ID do ramki USB)
      await this.device.sendReport(reportId, outputBuffer);
      return true;
    } catch (error) {
      console.error(`[Pico HID] Błąd podczas wysyłania na kanale ${reportId}:`, error);
      return false;
    }
  },

  // ==========================================
  // API WYJŚCIOWE (Wysyłanie do Pico 2W)
  // ==========================================

  /**
   * KANAŁ 1: Wysyła parametry konfiguracyjne do nadajnika.
   * @param {Array|Uint8Array} configBytes - Paczka bajtów z ustawieniami.
   */
  async sendConfig(configBytes) {
    return await this._sendReport(1, configBytes);
  },

  /**
   * KANAŁ 2: Wysyła surowe dane w celu natychmiastowego nadania przez radio (Passthrough).
   * Akceptuje tablicę bajtów lub tekst (który automatycznie konwertuje na bajty).
   * @param {Array|Uint8Array|string} payload - Dane do nadania w eter.
   */
  async sendRadioData(payload) {
    let bytesToSend = payload;

    // Jeśli przekazano string, automatycznie konwertujemy go na kodowanie UTF-8
    if (typeof payload === 'string') {
      bytesToSend = new TextEncoder().encode(payload);
    }

    return await this._sendReport(2, bytesToSend);
  },

  // ==========================================
  // API WEJŚCIOWE (Rejestracja odbiorników danych)
  // ==========================================

  /**
   * Rejestruje funkcję wywoływaną po odebraniu odpowiedzi konfiguracyjnej z Pico.
   * @param {Function} callback - Funkcja przyjmująca parametr (Uint8Array o długości 64).
   */
  onConfigResponse(callback) {
    this.callbacks.config = callback;
  },

  /**
   * Rejestruje funkcję wywoływaną po odebraniu surowych danych z radia przez Pico.
   * @param {Function} callback - Funkcja przyjmująca parametr (Uint8Array o długości 64).
   */
  onRadioDataPacket(callback) {
    this.callbacks.radio = callback;
  }
};

// Jeśli używasz systemu modułów (np. Webpack, Vite), odkomentuj poniższą linię:
// export default PicoRadioApi;
