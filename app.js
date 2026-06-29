Il codice che hai fornito è già molto avanzato e contiene quasi tutta la logica necessaria. Tuttavia, per farlo funzionare correttamente, è indispensabile che l'**HTML** abbia gli ID corretti e che il **CSS** gestisca gli stati (come la visibilità dei badge e il tema dark/light).

Ecco il pacchetto completo e pronto all'uso (HTML, CSS e il tuo JavaScript ottimizzato) in un unico blocco. Ho sistemato alcuni piccoli dettagli logici per assicurarmi che il calcolo fluisca senza errori.

```html
<!DOCTYPE html>
<html lang="it" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calcolatore 3 Vie Pro</title>
    <style>
        :root {
            --bg: #f4f7f6;
            --card: #ffffff;
            --text: #333333;
            --input-border: #cccccc;
            --accent: #2563eb;
            --neutral: #64748b;
            --positive: #22c55e;
            --negative: #ef4444;
        }

        [data-theme="dark"] {
            --bg: #0f172a;
            --card: #1e293b;
            --text: #f8fafc;
            --input-border: #475569;
            --accent: #3b82f6;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            transition: background 0.3s ease;
        }

        .calculator-card {
            background: var(--card);
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .theme-toggle {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text);
            padding: 5px;
        }

        .input-group {
            margin-bottom: 1.2rem;
        }

        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.4rem;
            opacity: 0.8;
        }

        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--input-border);
            border-radius: 0.5rem;
            background: transparent;
            color: var(--text);
            font-size: 1.1rem;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }

        input:focus {
            border-color: var(--accent);
        }

        /* Badges Section */
        .badges-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
            min-height: 32px;
        }

        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: bold;
            opacity: 0;
            transform: translateY(-5px);
            transition: all 0.3s ease;
        }

        .badge.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .badge.neutral { background: var(--neutral); color: white; }
        .badge.positive { background: var(--positive); color: white; }
        .badge.negative { background: var(--negative); color: white; }

        /* Hints */
        .hints {
            margin-top: 1.5rem;
            font-size: 0.85rem;
            line-height: 1.4;
            border-top: 1px solid var(--input-border);
            padding-top: 1rem;
        }

        #hint { font-weight: 500; color: var(--accent); }
        #hintQuota { margin-top: 0.5rem; font-style: italic; opacity: 0.8; }
    </style>
</head>
<body>

<div class="calculator-card">
    <div class="header">
        <h2 style="margin:0">Calcolatore</h2>
        <button class="theme-toggle" data-theme-toggle aria-label="Cambia tema"></button>
    </div>

    <div class="input-group">
        <label for="costo">Costo (€)</label>
        <input type="text" id="costo" placeholder="0,00">
    </div>

    <div class="input-group">
        <label for="markup">Markup (%)</label>
        <input type="text" id="markup" placeholder="0">
    </div>

    <div class="input-group">
        <label for="prezzo">Prezzo di Vendita (€)</label>
        <input type="text" id="prezzo" placeholder="0,00">
    </div>

    <div class="input-group">
        <label for="quotaPercent">Quota / Commissione (%)</label>
        <input type="text" id="quotaPercent" placeholder="0">
    </div>

    <div class="badges-container">
        <div id="badgeMarkup" class="badge neutral"><span id="badgeMarkupText"></span></div>
        <div id="badgeMargine" class="badge"><span id="badgeMargineText"></span></div>
        <div id="badgeGuadagno" class="badge"><span id="badgeGuadagnoText"></span></div>
    </div>

    <div class="hints">
        <div id="hint">Inserisci due valori — il terzo viene calcolato automaticamente.</div>
        <div id="hintQuota"></div>
    </div>
</div>

<script>
(function () {
  const costoEl   = document.getElementById('costo');
  const markupEl  = document.getElementById('markup');
  const prezzoEl  = document.getElementById('prezzo');
  const quotaEl   = document.getElementById('quotaPercent');
  const bMarkup   = document.getElementById('badgeMarkup');
  const bMargine  = document.getElementById('badgeMargine');
  const bGuad     = document.getElementById('badgeGuadagno');
  const hint      = document.getElementById('hint');
  const hintQuota = document.getElementById('hintQuota');

  let active = null;

  function parse(str) {
    if (!str) return NaN;
    // Rimuove tutto ciò che non è numero, virgola o punto
    const cleaned = str.replace(/[^\d,.]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }

  function fmt(n, dec = 2) {
    if (isNaN(n)) return '0,00';
    return n.toLocaleString('it-IT', { 
        minimumFractionDigits: dec, 
        maximumFractionDigits: dec 
    });
  }

  function setField(el, val) {
    if (document.activeElement !== el) el.value = val;
  }

  function animateValue(el, newVal) {
    if (el.textContent === newVal) return;
    el.style.opacity = '0.3';
    setTimeout(() => {
      el.textContent = newVal;
      el.style.transition = 'opacity 180ms ease';
      el.style.opacity = '1';
    }, 90);
  }

  function showBadge(el, textEl, text, type) {
    el.className = 'badge ' + type;
    animateValue(textEl, text);
    setTimeout(() => el.classList.add('visible'), 10);
  }

  function hideBadges() {
    [bMarkup, bMargine, bGuad].forEach(b => b.classList.remove('visible'));
  }

  function updateBadges(costo, markup, prezzo) {
    const guadagno = prezzo - costo;
    const margine  = prezzo !== 0 ? (guadagno / prezzo) * 100 : 0;
    const tipo     = guadagno >= 0 ? 'positive' : 'negative';
    
    showBadge(bMarkup,  document.getElementById('badgeMarkupText'),  'Markup '  + fmt(markup)  + '%', 'neutral');
    showBadge(bMargine, document.getElementById('badgeMargineText'), 'Margine ' + fmt(margine) + '%', tipo);
    showBadge(bGuad,    document.getElementById('badgeGuadagnoText'), (guadagno >= 0 ? '+' : '') + fmt(guadagno) + ' €', tipo);
    
    hint.textContent = `Su €${fmt(prezzo)} di vendita guadagni €${fmt(guadagno)} (${fmt(margine, 1)}% di margine).`;
  }

  function calc() {
    const C = parse(costoEl.value);
    const M = parse(markupEl.value);
    const P = parse(prezzoEl.value);
    
    const hasC = !isNaN(C) && C > 0;
    const hasM = !isNaN(M);
    const hasP = !isNaN(P) && P > 0;

    // LOGICA 3 VIE
    if (active === 'costo' || active === 'markup') {
      if (hasC && hasM) {
        const np = C * (1 + M / 100);
        setField(prezzoEl, fmt(np));
        updateBadges(C, M, np);
      } else {
        hideBadges();
        hint.textContent = 'Inserisci due valori — il terzo viene calcolato automaticamente.';
      }
    } 
    else if (active === 'prezzo') {
      if (hasC && hasP) {
        const nm = ((P - C) / C) * 100;
        setField(markupEl, fmt(nm));
        updateBadges(C, nm, P);
      } else if (hasM && hasP) {
        const nc = P / (1 + M / 100);
        setField(costoEl, fmt(nc));
        updateBadges(nc, M, P);
      } else {
        hideBadges();
        hint.textContent = 'Inserisci due valori — il terzo viene calcolato automaticamente.';
      }
    }
    else {
        // Fallback se non c'è un campo attivo (es. caricamento iniziale)
        if (hasC && hasM) {
            const np = C * (1 + M / 100);
            setField(prezzoEl, fmt(np));
            updateBadges(C, M, np);
        } else if (hasC && hasP) {
            const nm = ((P - C) / C) * 100;
            setField(markupEl, fmt(nm));
            updateBadges(C, nm, P);
        } else if (hasM && hasP) {
            const nc = P / (1 + M / 100);
            setField(costoEl, fmt(nc));
            updateBadges(nc, M, P);
        }
    }
  }

  function onBlur(el) {
    const v = parse(el.value);
    if (!isNaN(v)) {
        // Formatta il campo in base al tipo (prezzo/costo hanno 2 decimali, markup 0 o 2)
        if (el.id === 'markup') {
            el.value = fmt(v, 0); 
        } else {
            el.value = fmt(v, 2);
        }
    } else {
        el.value = '';
    }
    setTimeout(() => { active = null; calc(); }, 50);
  }

  function calcQuota() {
    const q = parse(quotaEl.value);
    const p = parse(prezzoEl.value);
    if (!isNaN(q) && !isNaN(p) && p > 0) {
      const netto = p * (1 - q / 100);
      hintQuota.textContent = 'Prezzo netto quota: €' + fmt(netto) + ' (quota €' + fmt(p - netto) + ')';
    } else {
      hintQuota.textContent = '';
    }
  }

  [costoEl, markupEl, prezzoEl].forEach(el => {
    el.addEventListener('focus', () => { active = el.id; });
    el.addEventListener('input', calc);
    el.addEventListener('blur',  () => onBlur(el));
  });
  quotaEl.addEventListener('input', calcQuota);

  // THEME TOGGLE
  const toggleBtn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const moonSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSVG  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  
  function updateThemeIcon() {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    toggleBtn.innerHTML = dark ? sunSVG : moonSVG;
  }

  updateThemeIcon();
  toggleBtn.addEventListener('click', () => {
    dark = !dark;
    updateThemeIcon();
  });
})();
</script>

</body>
</html>
```

### Cosa è stato aggiunto e migliorato:

1.  **HTML Completo**: Ho aggiunto tutti gli elementi `<span>` e `<div>` necessari affinché il JavaScript trovi gli ID (come `badgeMarkupText`, `hintQuota`, ecc.). Senza questi, il codice originale avrebbe dato errore.
2.  **CSS Moderno**: 
    *   **Gestione Temi**: Ho usato le variabili CSS (`--bg`, `--text`, ecc.) per rendere il passaggio tra Dark e Light mode fluido e professionale.
    *   **Badge Animati**: I badge ora appaiono con una leggera animazione verso l'alto e cambiano colore in base al risultato (Verde per profitto, Rosso per perdita).
    *   **Responsive**: Il design è centrato e si adatta ai dispositivi mobili.
3.  **Correzioni Logiche nel JS**:
    *   **Parsing Robusto**: La funzione `parse` ora pulisce l'input da caratteri non numerici (es. se l'utente scrive "€ 10,00" invece di "10,00").
    *   **Prevenzione Loop**: La funzione `setField` è cruciale: permette di scrivere in un campo senza che il calcolo automatico sovrascriva il carattere che stai digitando.
    *   **Formattazione all'uscita (`onBlur`)**: Quando l'utente clicca fuori da un campo, il numero viene formattato correttamente con la virgola italiana (es. da `10.5` a `10,50`).
    *   **Divisione per Zero**: Ho aggiunto un controllo nel calcolo del margine per evitare l'errore `Infinity` se il prezzo è zero.

### Come usarlo:
Basta salvare tutto il codice sopra in un file chiamato `index.html` e aprirlo in qualsiasi browser. È un'applicazione completa "chiavi in mano".