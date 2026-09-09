// Interazione con l'API Gemini REST
const MODEL_NAME = 'gemini-2.5-flash';
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const FETCH_TIMEOUT_MS = 90000; // 90 secondi

// ---------------------------------------------------------------------------
// Ottimizzazione immagini: ridimensiona lato client prima dell'invio API
// Riduce drasticamente il consumo di token/quota gratuita
// ---------------------------------------------------------------------------
function resizeImage(file, maxSide = 1024, quality = 0.85) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            // Fallback al file originale se canvas.toBlob non è supportato
            canvas.toBlob(
                (blob) => resolve(blob || file),
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

// Converte un File/Blob in parte inline per l'API Gemini
function fileToApiPart(fileOrBlob, mimeType = 'image/jpeg') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileOrBlob);
        reader.onload = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType } });
        };
        reader.onerror = (err) => reject(err);
    });
}

// ---------------------------------------------------------------------------
// Fase 1: Analisi immagini → attributi, titolo, descrizione
// ---------------------------------------------------------------------------
async function analyzeImages(files, extraNotes, apiKey) {
    if (!apiKey) throw new Error('API Key mancante');
    if (!files || files.length === 0) throw new Error('Nessuna immagine fornita');

    // Ridimensiona tutte le foto prima di convertirle in base64
    const imageParts = await Promise.all(
        files.map(async (file) => {
            const resized = await resizeImage(file, 1024, 0.85);
            return fileToApiPart(resized, 'image/jpeg');
        })
    );

    let promptText = `
Sei un venditore esperto su Vinted Italia, ma sei una persona reale. Scrivi in modo diretto e onesto.
VIETATO usare frasi da venditore artificiale (es. "Non lasciarti sfuggire questa occasione", "tocco di classe", "splendido capo"). Zero entusiasmo finto.

━━━ TITOLO ━━━
- Massimo 70 caratteri. Usa le maiuscole solo dove serve (nomi propri, marche).
- Pattern consigliato: [Tipo capo] [Marca] [Modello/Caratteristica] [Colore] [Taglia]
- Es: "Sneakers uomo Antony Morato grigio chiaro Tg 42 nuove"

━━━ DESCRIZIONE (struttura a sezioni — OBBLIGATORIA) ━━━
- ATTENZIONE: il campo "descrizione" NON deve MAI essere vuoto.
- ASSOLUTAMENTE VIETATO usare formattazione Markdown: zero asterischi, zero #, zero trattini come elenchi.
- La descrizione è divisa in SEZIONI. Ogni sezione ha:
    • Una riga di TITOLO (testo semplice, non grassetto, non simboli decorativi).
    • Il titolo può iniziare con AL MASSIMO 1 emoji pertinente e strategica — NON messa a caso.
      Usa l'emoji solo se aggiunge significato visivo immediato alla sezione (es. 🧥 per un capo, ✨ per le condizioni).
    • Il TESTO della sezione: 2-4 frasi discorsive e fluide. MAI un elenco puntato. MAI una lista.
    • Una RIGA VUOTA di separazione tra una sezione e la successiva.
- Struttura OBBLIGATORIA in questo ordine (adatta i titoli al contesto dell'articolo):
    SEZIONE 1 — con emoji pertinente: presentazione discorsiva dell'oggetto e stato generale.
    SEZIONE 2 — senza emoji o con emoji sobria: dettagli tecnici (marca, taglia, colore, materiale) espressi in frasi naturali.
    SEZIONE 3 — con emoji pertinente: condizioni oneste, difetti e pregi descritti senza edulcorare.
    SEZIONE 4 — senza emoji: info spedizione. Testo fisso: "Spedisco in 24/48h con corriere tracciabile. Scrivimi per qualsiasi domanda."
- NON menzionare MAI la "vestibilità".
- Lingua: Italiano informale ma corretto. Zero tono da Intelligenza Artificiale.

Esempio di formato ACCETTABILE per la descrizione (adatta contenuto, non copiare):
---
🧥 Il capo
Giacca invernale di media pesantezza, comprata due anni fa e indossata pochissime volte. Stile sobrio e versatile, si abbina senza problemi a jeans o pantaloni chino.

Dettagli
Marca Zara, taglia M italiana, colore blu navy. Fodera interna in poliestere, chiusura con zip metallica e tre tasche laterali con bottone.

✨ Condizioni
In ottime condizioni, nessun difetto visibile a occhio nudo. C'è solo una leggera piega al colletto interno che scompare non appena si indossa.

Spedizione
Spedisco in 24/48h con corriere tracciabile. Scrivimi per qualsiasi domanda.
---

━━━ ATTRIBUTI JSON ━━━
Estraili dalle foto o dai dati forniti. Se un dettaglio non è visibile, lascia la stringa vuota "".
Per il campo "condizione" usa ESCLUSIVAMENTE uno di questi valori (scala ufficiale Vinted):
"Nuovo con cartellino", "Nuovo senza cartellino", "Ottime condizioni", "Buone condizioni", "Soddisfacenti"

Restituisci SOLO un oggetto JSON valido con questa struttura:
{
  "categoria": "scarpe" | "abbigliamento" | "altro",
  "attributi": { "marca": "...", "modello": "...", "taglia": "...", "colore": "...", "materiale": "...", "condizione": "...", "genere": "..." },
  "titolo": "...",
  "descrizione": "testo della descrizione qui..."
}
`;

    if (extraNotes) {
        promptText += `\n\nL'utente ha fornito le seguenti NOTE AGGIUNTIVE: "${extraNotes}".\nIntegrale in modo intelligente e naturale: usale come base certa per titolo, descrizione e attributi, come se fossero state dedotte insieme alle foto.`;
    }

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: promptText }, ...imageParts] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    };

    return makeApiCall(requestBody, apiKey);
}

// ---------------------------------------------------------------------------
// Fase 2: Stima prezzo con Google Search Grounding
// ---------------------------------------------------------------------------
async function estimatePrice(queryData, apiKey) {
    if (!apiKey) throw new Error('API Key mancante');

    const searchTerms = [
        queryData.marca,
        queryData.modello || queryData.categoria_capo || queryData.nome_prodotto || queryData.tipo,
        queryData.taglia ? `taglia ${queryData.taglia}` : '',
        queryData.condizione
    ].filter(Boolean).join(' ');

    const promptText = `
Cerca sul web (usando il tool Google Search) articoli in vendita simili a questo: "${searchTerms}".
Cerca su Vinted, Vestiaire Collective, Subito.it, eBay o siti ufficiali del brand.

In base ai risultati trovati, stima il valore di mercato attuale (condizione: "${queryData.condizione}").

Restituisci SOLO un oggetto JSON valido, senza blocchi di markdown:
{
  "prezzo": { "minimo": 0.0, "medio": 0.0, "massimo": 0.0 },
  "fonti_prezzo": ["sito1.com", "sito2.it"]
}
Se non trovi dati, fornisci una stima ragionata e metti ["Nessuna fonte specifica trovata"] in fonti_prezzo.
`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    };

    return makeApiCall(requestBody, apiKey);
}

// ---------------------------------------------------------------------------
// Fallback stima prezzo — senza Search Grounding (account free / errore)
// ---------------------------------------------------------------------------
async function estimatePriceFallback(queryData, apiKey) {
    if (!apiKey) throw new Error('API Key mancante');

    const promptText = `
In base alla tua conoscenza di mercato, stima il valore attuale su Vinted per:
Marca: ${queryData.marca || 'Sconosciuta'}
Tipo/Modello: ${queryData.modello || queryData.categoria_capo || queryData.nome_prodotto || queryData.tipo || 'Non specificato'}
Condizione: ${queryData.condizione || 'Usato'}

Restituisci SOLO un oggetto JSON valido, senza blocchi markdown:
{
  "prezzo": { "minimo": 0.0, "medio": 0.0, "massimo": 0.0 },
  "fonti_prezzo": ["Stima basata su dati storici generali (Google Search Grounding non disponibile)"]
}
`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    };

    return makeApiCall(requestBody, apiKey);
}

// ---------------------------------------------------------------------------
// Helper: chiamata fetch con timeout e gestione errori completa
// ---------------------------------------------------------------------------
async function makeApiCall(body, apiKey) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey   // chiave nell'header, non nell'URL
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429) {
                throw new Error('Quota API esaurita. Aspetta qualche minuto e riprova.');
            }
            if (response.status === 401 || response.status === 403) {
                throw new Error('Accesso negato. Verifica che la chiave API sia valida e abbia i permessi corretti.');
            }
            if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
                throw new Error('Chiave API non valida. Controllala nelle Impostazioni.');
            }
            throw new Error(errorData.error?.message || `Errore API: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("Risposta vuota dall'API. Riprova.");
        }

        // Rimuove eventuali fence markdown (```json ... ```) che Gemini aggiunge col grounding
        const cleaned = textResponse
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch {
            throw new Error("L'AI ha restituito un formato non valido. Riprova.");
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout: la risposta ha impiegato troppo. Controlla la connessione e riprova.');
        }
        throw error;
    }
}
