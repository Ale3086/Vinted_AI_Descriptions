// Dipendenze globali caricate da index.html (gemini.js, db.js, ui.js)

// Stato globale
let currentFiles    = [];
let currentAnalysis = null;
let currentThumbnail = null;

const MAX_FILES = 8;

// Elementi DOM
const elements = {
    apiKeyInput:      document.getElementById('api-key'),
    marginInput:      document.getElementById('trattativa-margin'),
    settingsModal:    document.getElementById('settings-modal'),
    dropZone:         document.getElementById('drop-zone'),
    fileInput:        document.getElementById('file-input'),
    previewContainer: document.getElementById('image-preview-container'),
    preCategory:      document.getElementById('pre-category'),
    analyzeBtn:       document.getElementById('analyze-btn'),
    resultsSection:   document.getElementById('results-section'),

    // Campi risultato
    resultTitle:    document.getElementById('result-title'),
    titleCharCount: document.getElementById('title-char-count'),
    resultDesc:     document.getElementById('result-desc'),
    priceMin:       document.getElementById('price-min'),
    priceMed:       document.getElementById('price-med'),
    priceMax:       document.getElementById('price-max'),
    rangeMin:       document.getElementById('range-min'),
    rangeMed:       document.getElementById('range-med'),
    rangeMax:       document.getElementById('range-max'),
    priceSources:   document.getElementById('price-sources'),

    // Sidebar
    sidebar:       document.getElementById('sidebar'),
    historySearch: document.getElementById('history-search')
};

// ---------------------------------------------------------------------------
// Inizializzazione
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    renderPreAnalysisForm(elements.preCategory.value);
    await refreshHistory();
    setupEventListeners();
});

function loadSettings() {
    const key    = localStorage.getItem('vinted_api_key');
    const margin = localStorage.getItem('vinted_margin') || 10;

    if (key) {
        elements.apiKeyInput.value = key;
    } else {
        // Mostra modale al primo avvio se manca la key
        elements.settingsModal.classList.remove('hidden');
    }

    elements.marginInput.value = margin;
}

function getApiKey()  { return localStorage.getItem('vinted_api_key'); }
function getMargin()  { return parseFloat(localStorage.getItem('vinted_margin') || 10) / 100; }

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function setupEventListeners() {
    // Settings — apri/chiudi/salva
    document.getElementById('settings-btn').addEventListener('click', () => {
        elements.settingsModal.classList.remove('hidden');
    });

    document.getElementById('close-settings-btn').addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
    });

    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const key    = elements.apiKeyInput.value.trim();
        const margin = elements.marginInput.value;

        if (key) {
            localStorage.setItem('vinted_api_key', key);
            localStorage.setItem('vinted_margin', margin);
            elements.settingsModal.classList.add('hidden');
            showToast('Impostazioni salvate');
            if (currentAnalysis) updatePriceRanges();
        } else {
            showToast('Inserisci una API Key valida', 'error');
        }
    });

    // Drag & Drop + selezione file
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());

    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('dragover');
    });
    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('dragover');
    });
    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    elements.fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        e.target.value = ''; // resetta per permettere selezione dello stesso file
    });

    // Categoria pre-analisi
    elements.preCategory.addEventListener('change', (e) => {
        renderPreAnalysisForm(e.target.value);
    });

    // Pulsante analisi
    elements.analyzeBtn.addEventListener('click', handleAnalysis);

    // Contatore caratteri titolo
    elements.resultTitle.addEventListener('input', (e) => {
        elements.titleCharCount.textContent = e.target.value.length;
    });

    // Copia con feedback visivo sul pulsante
    const copyTitleBtn = document.getElementById('copy-title-btn');
    copyTitleBtn.addEventListener('click', () => {
        copyToClipboard(elements.resultTitle.value, copyTitleBtn, 'Titolo copiato!');
    });

    const copyDescBtn = document.getElementById('copy-desc-btn');
    copyDescBtn.addEventListener('click', () => {
        copyToClipboard(elements.resultDesc.value, copyDescBtn, 'Descrizione copiata!');
    });

    // Sidebar mobile
    document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
        elements.sidebar.classList.add('open');
    });
    document.getElementById('close-sidebar-btn').addEventListener('click', () => {
        elements.sidebar.classList.remove('open');
    });

    // Salvataggio manuale in archivio
    document.getElementById('save-history-btn').addEventListener('click', saveCurrentToHistory);

    // Ricerca nello storico
    elements.historySearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.history-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });

    // Ricalcola range trattativa se il prezzo viene modificato manualmente
    [elements.priceMin, elements.priceMed, elements.priceMax].forEach(input => {
        input.addEventListener('input', updatePriceRanges);
    });
}

// ---------------------------------------------------------------------------
// Gestione file
// ---------------------------------------------------------------------------
function handleFiles(files) {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (currentFiles.length >= MAX_FILES) {
        showToast(`Limite raggiunto: puoi caricare al massimo ${MAX_FILES} foto`, 'error');
        return;
    }

    const spazio = MAX_FILES - currentFiles.length;
    if (newFiles.length > spazio) {
        showToast(`Aggiunte solo le prime ${spazio} foto (limite: ${MAX_FILES})`, 'error');
        currentFiles = [...currentFiles, ...newFiles.slice(0, spazio)];
    } else {
        currentFiles = [...currentFiles, ...newFiles];
    }

    renderPreviews();
    elements.analyzeBtn.disabled = currentFiles.length === 0;
}

function renderPreviews() {
    elements.previewContainer.innerHTML = '';

    // Reset sempre: la thumbnail si ricalcola dalla foto corrente in pos. 0
    currentThumbnail = null;
    if (currentFiles.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => { currentThumbnail = e.target.result; };
        reader.readAsDataURL(currentFiles[0]);
    }

    currentFiles.forEach((file, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';

        const img = document.createElement('img');
        const url = URL.createObjectURL(file);
        img.src = url;
        img.alt = `Foto articolo ${index + 1}`;
        img.onload = () => URL.revokeObjectURL(url);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-img-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.setAttribute('aria-label', `Rimuovi foto ${index + 1}`);
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            currentFiles.splice(index, 1);
            renderPreviews();
            elements.analyzeBtn.disabled = currentFiles.length === 0;
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        elements.previewContainer.appendChild(wrapper);
    });
}

// ---------------------------------------------------------------------------
// Flusso di analisi principale
// ---------------------------------------------------------------------------
async function handleAnalysis() {
    const apiKey = getApiKey();
    if (!apiKey) {
        showToast('Devi configurare la API Key nelle impostazioni', 'error');
        elements.settingsModal.classList.remove('hidden');
        return;
    }

    // Disabilita il pulsante per tutta la durata dell'analisi (evita doppio click)
    elements.analyzeBtn.disabled = true;

    try {
        setLoader(true, 'Analisi foto e generazione testi in corso...');

        // Raccoglie note aggiuntive dai campi pre-analisi
        const preInputs = document.getElementById('pre-attributes-form').querySelectorAll('input');
        const extraNotesParts = [];
        preInputs.forEach(input => {
            if (input.value.trim()) {
                extraNotesParts.push(`${input.dataset.key}: ${input.value.trim()}`);
            }
        });
        const extraNotesText = extraNotesParts.join(', ');

        // ── Fase 1: Estrazione attributi + titolo + descrizione ──────────────
        const analysisResult = await analyzeImages(currentFiles, extraNotesText, apiKey);

        currentAnalysis = analysisResult;
        populateUI(analysisResult);

        elements.resultsSection.classList.remove('hidden');
        // Scrolla ai risultati (utile su mobile)
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Focus sul titolo dopo l'animazione scroll
        setTimeout(() => elements.resultTitle.focus(), 450);

        // ── Fase 2: Stima prezzo con Google Search Grounding ─────────────────
        setLoader(true, 'Ricerca comparabili sul web per stima prezzo...');

        try {
            const priceResult = await estimatePrice(analysisResult.attributi, apiKey);
            currentAnalysis.prezzo       = priceResult.prezzo;
            currentAnalysis.fonti_prezzo = priceResult.fonti_prezzo;
            populatePrices(priceResult);
            showToast('Analisi completata ✓');
        } catch {
            // Fallback: stima senza ricerca web (account free o errore grounding)
            try {
                const fallbackResult = await estimatePriceFallback(analysisResult.attributi, apiKey);
                currentAnalysis.prezzo       = fallbackResult.prezzo;
                currentAnalysis.fonti_prezzo = fallbackResult.fonti_prezzo;
                populatePrices(fallbackResult);
                showToast('Analisi completata. Prezzo stimato senza ricerca web.');
            } catch {
                showToast('Impossibile stimare il prezzo automaticamente. Inseriscilo manualmente.', 'error');
                populatePrices({
                    prezzo: { minimo: 0, medio: 0, massimo: 0 },
                    fonti_prezzo: ['Errore di ricerca — inserisci il prezzo manualmente']
                });
            }
        }

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setLoader(false);
        // Riabilita il pulsante solo se ci sono foto caricate
        elements.analyzeBtn.disabled = currentFiles.length === 0;
    }
}

// ---------------------------------------------------------------------------
// Popolamento UI
// ---------------------------------------------------------------------------
function populateUI(data) {
    elements.resultTitle.value       = data.titolo || '';
    elements.titleCharCount.textContent = (data.titolo || '').length;
    elements.resultDesc.value        = data.descrizione || '';

    // Protezione null: se attributi manca o non è un oggetto, usa {} 
    const attrs = (data.attributi && typeof data.attributi === 'object') ? data.attributi : {};
    renderAttributesForm(attrs, 'attributes-form');
}

function populatePrices(data) {
    const p = data.prezzo || { minimo: 0, medio: 0, massimo: 0 };
    elements.priceMin.value = p.minimo;
    elements.priceMed.value = p.medio;
    elements.priceMax.value = p.massimo;

    // Fonti — costruite con DOM API (nessun innerHTML non sanificato → niente XSS)
    const fonti = Array.isArray(data.fonti_prezzo) ? data.fonti_prezzo : [];
    elements.priceSources.textContent = '';
    const label = document.createElement('strong');
    label.textContent = 'Fonti analizzate: ';
    elements.priceSources.appendChild(label);
    elements.priceSources.appendChild(
        document.createTextNode(fonti.length > 0 ? fonti.join(', ') : 'Nessuna')
    );

    updatePriceRanges();
}

function updatePriceRanges() {
    const margin = getMargin();

    const calcRange = (val, el) => {
        const num = parseFloat(val);
        if (isNaN(num) || num === 0) {
            el.textContent = 'Offerta minima: €-';
            return;
        }
        // Su Vinted si tratta SOLO al ribasso: mostriamo solo il pavimento
        const floor = (num * (1 - margin)).toFixed(2);
        el.textContent = `Offerta minima accettabile: €${floor}`;
    };

    calcRange(elements.priceMin.value, elements.rangeMin);
    calcRange(elements.priceMed.value, elements.rangeMed);
    calcRange(elements.priceMax.value, elements.rangeMax);
}

// ---------------------------------------------------------------------------
// Copia negli appunti con feedback visivo sul pulsante
// ---------------------------------------------------------------------------
async function copyToClipboard(text, btn, successMsg) {
    if (!text) return;

    const originalText = btn.textContent;

    const showSuccess = () => {
        btn.textContent = '✓ Copiato!';
        btn.style.color = 'var(--success)';
        showToast(successMsg);
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '';
        }, 2000);
    };

    try {
        await navigator.clipboard.writeText(text);
        showSuccess();
    } catch {
        // Fallback per browser vecchi o contesti file://
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showSuccess();
        } catch {
            showToast('Errore copia negli appunti', 'error');
        }
        document.body.removeChild(ta);
    }
}

// ---------------------------------------------------------------------------
// Gestione Storico (IndexedDB)
// ---------------------------------------------------------------------------
async function saveCurrentToHistory() {
    if (!currentAnalysis) {
        showToast('Nessuna analisi da salvare', 'error');
        return;
    }

    const dataToSave = {
        id:           currentAnalysis.id || Date.now(),
        categoria:    currentAnalysis.categoria,
        titolo:       elements.resultTitle.value,
        descrizione:  elements.resultDesc.value,
        attributi:    getFormData('attributes-form'),
        prezzo: {
            minimo:   parseFloat(elements.priceMin.value) || 0,
            medio:    parseFloat(elements.priceMed.value) || 0,
            massimo:  parseFloat(elements.priceMax.value) || 0
        },
        fonti_prezzo: currentAnalysis.fonti_prezzo,
        thumbnail:    currentThumbnail,
        date:         new Date().toISOString()
    };

    try {
        await saveToHistory(dataToSave);
        currentAnalysis.id = dataToSave.id;
        showToast('Salvato in archivio!');
        await refreshHistory();
    } catch (e) {
        showToast(e.message || 'Errore salvataggio archivio', 'error');
    }
}

async function refreshHistory() {
    try {
        const history = await getHistory();
        renderHistoryList(history, loadFromHistory, async (id) => {
            if (confirm('Sei sicuro di voler eliminare questa inserzione?')) {
                await deleteFromHistory(id);
                await refreshHistory(); // await corretto: evita unhandled rejection
            }
        });
    } catch {
        // Storico non critico per il flusso principale: errore silenzioso
    }
}

function loadFromHistory(item) {
    currentAnalysis  = item;
    currentThumbnail = item.thumbnail;

    populateUI(item);
    populatePrices(item);

    elements.resultsSection.classList.remove('hidden');
    elements.sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast("Inserzione caricata dall'archivio");
}
