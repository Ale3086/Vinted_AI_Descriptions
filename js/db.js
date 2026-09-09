const DB_NAME = 'VintedAIAssistantDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_HISTORY = 50;

let dbInstance = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Archivio non disponibile (browser in modalità privata o storage bloccato dal browser)'));
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // keyPath è il timestamp-ID; niente autoIncrement, lo generiamo noi
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveToHistory(item) {
    const db = await initDB();
    item.id = item.id || Date.now();

    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // 1. Salva/aggiorna l'elemento
        store.put(item);

        // 2. Nella STESSA transazione: eviction FIFO se supera MAX_HISTORY
        const keysReq = store.getAllKeys();
        keysReq.onsuccess = (e) => {
            const keys = e.target.result.sort((a, b) => b - a); // più recenti prima
            keys.slice(MAX_HISTORY).forEach(k => store.delete(k));
        };

        // Una sola oncomplete garantisce che put + eviction siano atomici
        tx.oncomplete = () => resolve(item.id);
        tx.onerror   = (e) => reject(e.target.error);
        tx.onabort   = (e) => reject(e.target.error);
    });
}

async function getHistory() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const data = event.target.result;
            data.sort((a, b) => b.id - a.id); // più recenti prima
            resolve(data);
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteFromHistory(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror   = (e) => reject(e.target.error);
    });
}
