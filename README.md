# Vinted AI Assistant

Una web app client-side statica (senza backend) che ti aiuta a creare l'inserzione perfetta su Vinted partendo dalle foto dei tuoi articoli.

Genera in automatico:
- Attributi e caratteristiche dell'articolo
- Titolo ottimizzato per Vinted
- Descrizione persuasiva in italiano
- Stima dei prezzi (Minimo, Medio, Massimo) e margini di trattativa basati sui prezzi di mercato web.

Tutto funziona localmente nel tuo browser, garantendo privacy (le foto vengono inviate direttamente alle API di Google Gemini) e zero costi di server. L'app salva gli ultimi 50 articoli generati localmente tramite IndexedDB.

---

## Prerequisiti: Ottenere e Configurare la API Key gratuita

L'app utilizza le API di **Google Gemini 2.5 Flash**. È necessario creare una chiave API. Segui attentamente questa guida per garantire l'**assoluta gratuità** e sicurezza.

### 1. Creare la Chiave API
1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Accedi col tuo account Google.
3. Clicca su **"Create API key"**. 
4. Crea un nuovo progetto o seleziona un progetto esistente. Se ti chiede di abilitare il billing (fatturazione), rifiuta o assicurati di usare il piano gratuito ("Free tier" limits apply: 15 richieste per minuto).

### 2. Disabilitare la Fatturazione (Sicurezza)
Per essere sicuro al 100% che nessun addebito possa mai verificarsi:
1. Vai sulla [Google Cloud Console](https://console.cloud.google.com/billing).
2. Seleziona il progetto collegato alla tua API Key.
3. Assicurati che **nessun account di fatturazione** sia collegato a quel progetto, o disabilita esplicitamente la fatturazione. Senza una carta di credito associata, le chiamate API si bloccheranno semplicemente se superi i limiti gratuiti (quota limits).

### 3. Restringere la Chiave API (Fondamentale)
Dato che l'app è puramente client-side, la chiave sarà "visibile" a chi ispeziona il codice dal browser. Per evitare che altri la usino abusivamente:
1. Vai nella [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Seleziona il progetto associato.
3. Clicca sulla chiave API che hai appena creato.
4. Sotto **"Application restrictions"**, seleziona **"HTTP referrers (web sites)"**.
5. Nel campo che appare, aggiungi l'URL in cui è ospitata la tua app. Esempio per GitHub Pages:
   `https://tuo-username.github.io/*`
6. Salva. In questo modo la chiave funzionerà **solo** se la richiesta proviene dal tuo sito.

---

## Deploy su GitHub Pages

L'applicazione è sviluppata in **Vanilla HTML/CSS/JS**. Non c'è nessun processo di build richiesto!

Per pubblicarla gratuitamente online:
1. Crea un repository pubblico su GitHub.
2. Fai il push o carica tutti i file di questa cartella (`index.html`, `css/`, `js/`) nel repository (branch `main` o `master`).
3. Vai nei **Settings** del tuo repository su GitHub.
4. Vai nella sezione **Pages** (nella barra laterale a sinistra).
5. Sotto "Build and deployment", come Source scegli **"Deploy from a branch"**.
6. Seleziona il branch (es. `main`) e la cartella `/(root)` e salva.
7. Dopo pochi minuti, la tua app sarà online su `https://[tuo-username].github.io/[nome-repo]/`.

---

## Uso dell'App

1. Apri l'app dal tuo browser.
2. Al primo avvio, inserisci la tua API Key di Gemini (verrà salvata solo nel tuo browser).
3. Configura il margine di trattativa percentuale (es. 10%).
4. Trascina o seleziona da 1 a quante foto vuoi del tuo articolo.
5. Clicca su **Analizza Foto**.
6. Attendi l'estrazione dati e la successiva stima del prezzo (effettuata tramite Google Search Grounding).
7. Modifica manualmente i campi se necessario.
8. Usa i pulsanti **Copia** per incollare su Vinted.
9. Clicca **Salva in Archivio** per conservare la bozza (ne conserva fino a 50).
