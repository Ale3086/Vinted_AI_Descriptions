function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Aggiungiamo anche lo stile per toast-out dinamico qui se manca in CSS
const style = document.createElement('style');
style.textContent = `
@keyframes toast-out {
    to {
        opacity: 0;
        transform: translateY(20px);
    }
}
`;
document.head.appendChild(style);

function setLoader(active, text = 'Analisi in corso...') {
    const loader = document.getElementById('loader-overlay');
    const loaderText = document.getElementById('loader-text');
    if (active) {
        loaderText.textContent = text;
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function renderAttributesForm(attributes, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Pulisce
    
    Object.entries(attributes).forEach(([key, value]) => {
        const group = document.createElement('div');
        group.className = 'attr-group';
        
        const label = document.createElement('label');
        // Rimuove underscore e capitalizza
        label.textContent = key.replace(/_/g, ' ');
        label.setAttribute('for', `attr-${key}`);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `attr-${key}`;
        input.value = value || '';
        input.dataset.key = key; // Per recuperare facilmente il dato dopo
        
        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    });
}

function renderPreAnalysisForm(category) {
    const container = document.getElementById('pre-attributes-form');
    container.innerHTML = '';
    
    let fields = [];
    if (category === 'abbigliamento') {
        fields = ['Marca', 'Taglia', 'Condizione'];
    } else if (category === 'scarpe') {
        fields = ['Marca', 'Modello', 'Taglia (EU)', 'Condizione'];
    } else {
        fields = ['Nome Oggetto', 'Marca', 'Condizione'];
    }
    
    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'attr-group';
        
        const label = document.createElement('label');
        label.textContent = field;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Inserisci ${field.toLowerCase()}...`;
        input.dataset.key = field;
        input.className = 'pre-input';
        
        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    });
}

function getFormData(containerId) {
    const container = document.getElementById(containerId);
    const inputs = container.querySelectorAll('input');
    const data = {};
    inputs.forEach(input => {
        data[input.dataset.key] = input.value;
    });
    return data;
}

function renderHistoryList(historyItems, onSelect, onDelete) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (historyItems.length === 0) {
        list.innerHTML = '<li style="padding: 15px; color: var(--text-muted); text-align: center;">Nessun elemento in archivio</li>';
        return;
    }

    historyItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const img = document.createElement('img');
        img.src = item.thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23ddd"/></svg>';
        
        const content = document.createElement('div');
        content.className = 'history-item-content';
        content.style.flex = '1';
        
        const h4 = document.createElement('h4');
        h4.textContent = item.titolo || 'Senza titolo';
        
        const p = document.createElement('p');
        p.textContent = item.categoria ? item.categoria.toUpperCase() : 'Altro';
        
        const actions = document.createElement('div');
        actions.className = 'history-item-actions';
        
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Apri';
        loadBtn.onclick = (e) => {
            e.stopPropagation();
            onSelect(item);
        };
        
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Elimina';
        delBtn.style.color = 'var(--error)';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            onDelete(item.id);
        };
        
        actions.appendChild(loadBtn);
        actions.appendChild(delBtn);
        
        content.appendChild(h4);
        content.appendChild(p);
        content.appendChild(actions);
        
        li.appendChild(img);
        li.appendChild(content);
        
        // Cliccando sull'intero elemento carica i dettagli
        li.onclick = () => onSelect(item);
        
        list.appendChild(li);
    });
}
