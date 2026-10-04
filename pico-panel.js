/**
 * ========================================================
 * 1. UNIWERSALNE API WEBHID
 * ========================================================
 */
const GenericHidApi = {
    VID: 0xCAFE,
    PID: 0x4242,
    device: null,
    onDataReceivedCallback: null,

    async connect() {
        try {
            const devices = await navigator.hid.requestDevice({
                // filters: [{ vendorId: this.VID, productId: this.PID }]
                filters: []
            });
            if (devices.length === 0) return false;
            this.device = devices[0];

            if (!this.device.opened) {
                await this.device.open();
            }
            this._initializeReceiver();
            return true;
        } catch (error) {
            console.error("Błąd połączenia WebHID:", error);
            return false;
        }
    },

    async disconnect() {
        if (this.device && this.device.opened) {
            await this.device.close();
        }
        this.device = null;
    },

    _initializeReceiver() {
        if (!this.device) return;
        this.device.oninputreport = (event) => {
            const rawData = new Uint8Array(event.data.buffer);
            const reportId = event.reportId;
            
            if (typeof this.onDataReceivedCallback === 'function') {
                this.onDataReceivedCallback(reportId, rawData);
            }
        };
    },

    /**
     * Uniwersalna funkcja wysyłająca
     * @param {number} reportId - Dowolny ID raportu (wybrany przez użytkownika)
     * @param {Array|Uint8Array} dataArray - Tablica bajtów danych
     */
    async sendCustomReport(reportId, dataArray) {
        if (!this.device || !this.device.opened) return false;
        
        // Zawsze tworzymy sztywny bufor 64 bajtów danych
        const outputBuffer = new Uint8Array(64);
        for (let i = 0; i < Math.min(dataArray.length, 64); i++) {
            outputBuffer[i] = dataArray[i];
        }
        
        try {
            await this.device.sendReport(reportId, outputBuffer);
            return true;
        } catch (error) {
            console.error(`Błąd sendReport dla ID ${reportId}:`, error);
            return false;
        }
    },

    onPacketReceived(callback) {
        this.onDataReceivedCallback = callback;
    }
};

/**
 * ========================================================
 * 2. LOGIKA OBSŁUGI INTERFEJSU (UI)
 * ========================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    const btnConnect = document.getElementById('btn-connect');
    const btnDisconnect = document.getElementById('btn-disconnect');
    const btnSend = document.getElementById('btn-send');
    
    const inputReportId = document.getElementById('input-report-id');
    const inputPayload = document.getElementById('input-payload');
    
    const statusBadge = document.getElementById('status-badge');
    const consoleLog = document.getElementById('console-log');

    function logToScreen(text, type = 'default') {
        const entry = document.createElement('div');
        entry.classList.add('console-entry');
        if (type !== 'default') entry.classList.add(type);
        
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${text}`;
        
        consoleLog.appendChild(entry);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    function setUiState(connected) {
        btnConnect.disabled = connected;
        btnDisconnect.disabled = !connected;
        btnSend.disabled = !connected;
        inputReportId.disabled = !connected;
        inputPayload.disabled = !connected;

        if (connected) {
            statusBadge.textContent = "Połączono";
            statusBadge.classList.add('connected');
        } else {
            statusBadge.textContent = "Rozłączono";
            statusBadge.classList.remove('connected');
        }
    }

    // Obsługa pakietów wejściowych (Input Reports) z Pico
    GenericHidApi.onPacketReceived((reportId, bytes) => {
        // Konwersja całego bufora do ciągu hex dla podglądu surowych danych
        const hexString = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
            
        logToScreen(`[ODEBRANO] Report ID: ${reportId} -> Dane (Hex): ${hexString}`, 'info');
    });

    // Przycisk: POŁĄCZ
    btnConnect.addEventListener('click', async () => {
        logToScreen("Szukanie urządzenia USB...", "info");
        const success = await GenericHidApi.connect();
        if (success) {
            logToScreen(`Połączono z: ${GenericHidApi.device.productName}`, "info");
            setUiState(true);
        } else {
            logToScreen("Nie udało się nawiązać połączenia.", "warn");
        }
    });

    // Przycisk: ROZŁĄCZ
    btnDisconnect.addEventListener('click', async () => {
        await GenericHidApi.disconnect();
        logToScreen("Urządzenie rozłączone.", "info");
        setUiState(false);
    });

    // Przycisk: WYŚLIJ (Output Report)
    btnSend.addEventListener('click', async () => {
        const reportId = parseInt(inputReportId.value);
        if (isNaN(reportId) || reportId < 0) {
            logToScreen("Błąd: Nieprawidłowy Report ID.", "warn");
            return;
        }

        // Parsowanie tekstu użytkownika "01 02 AA" na tablicę bajtów liczb
        const rawText = inputPayload.value.trim();
        let bytes = [];
        
        if (rawText.length > 0) {
            // Rozdzielamy po spacjach lub przecinkach
            const tokens = rawText.split(/[\s,]+/);
            for (let token of tokens) {
                // Konwertujemy zapis HEX (np. "AA") lub dziesiętny na liczbę
                const byteVal = token.toLowerCase().startsWith('0x') ? parseInt(token, 16) : parseInt(token, 16);
                if (!isNaN(byteVal) && byteVal >= 0 && byteVal <= 255) {
                    bytes.push(byteVal);
                }
            }
        }

        logToScreen(`[WYSYŁANIE] Report ID: ${reportId} -> ${bytes.length} bajtów...`);
        
        const success = await GenericHidApi.sendCustomReport(reportId, bytes);
        if (!success) {
            logToScreen("Błąd podczas wysyłania raportu (sprawdź konsolę dev narzędzi).", "warn");
        }
    });
});
