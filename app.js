(function () {
  const costoEl   = document.getElementById('costo');
  const markupEl  = document.getElementById('markup');
  const prezzoEl  = document.getElementById('prezzo');
  const quotaEl   = document.getElementById('quotaPercent');
  const ivaEl     = document.getElementById('ivaPercent');
  const scontoEl  = document.getElementById('scontoPercent');
  const targetEl  = document.getElementById('margineTarget');
  const quantEl   = document.getElementById('quantita');
  const hintIva    = document.getElementById('hintIva');
  const hintSconto = document.getElementById('hintSconto');
  const hintMinimo = document.getElementById('hintMinimo');
  const hintTotale = document.getElementById('hintTotale');
  const bMarkup   = document.getElementById('badgeMarkup');
  const bMargine  = document.getElementById('badgeMargine');
  const bGuad     = document.getElementById('badgeGuadagno');
  const hint      = document.getElementById('hint');
  const hintQuota = document.getElementById('hintQuota');

  // Interpreta un numero scritto in vari formati (it-IT, en-US, misti).
  // Gestisce correttamente i separatori delle migliaia, che prima venivano
  // interpretati come decimali (es. "1.300,00" -> 1.3 invece di 1300).
  function parse(str) {
    if (str == null) return NaN;
    let s = String(str).trim();
    if (s === '') return NaN;
    // tiene solo cifre, separatori e segno meno
    s = s.replace(/[^\d.,-]/g, '');
    if (s === '' || s === '-') return NaN;

    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');

    if (lastComma > -1 && lastDot > -1) {
      // presenti entrambi: l'ultimo è il separatore decimale, l'altro le migliaia
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.'); // it-IT: 1.300,50
      } else {
        s = s.replace(/,/g, '');                    // en-US: 1,300.50
      }
    } else if (lastComma > -1) {
      // solo virgola: separatore decimale (it-IT)
      s = s.replace(',', '.');
    }
    // solo punto (o nessun separatore): lasciato com'è, il punto è decimale

    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function fmt(n, dec = 2) {
    return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  // Formato "leggero" per percentuali/quantità: fino a 2 decimali, senza zeri superflui
  function fmtP(n) {
    return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
  }

  function animateValue(el, newVal) {
    if (el.textContent === newVal) return;
    el.style.opacity = '0.3';
    el.style.transform = 'translateY(-3px)';
    setTimeout(() => {
      el.textContent = newVal;
      el.style.transition = 'opacity 180ms ease, transform 180ms ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 90);
  }

  function showBadge(el, textEl, text, type) {
    el.className = 'badge ' + type;
    animateValue(textEl, text);
    setTimeout(() => el.classList.add('visible'), 10);
  }

  function hideBadges() {
    [bMarkup, bMargine, bGuad].forEach(b => b.classList.remove('visible'));
    hint.textContent = 'Inserisci due valori — il terzo viene calcolato automaticamente.';
  }

  function updateBadges(costo, markup, prezzo) {
    const guadagno = prezzo - costo;
    const margine  = (guadagno / prezzo) * 100;
    const tipo     = guadagno >= 0 ? 'positive' : 'negative';
    showBadge(bMarkup,  document.getElementById('badgeMarkupText'),  'Markup '  + fmt(markup)  + '%', 'neutral');
    showBadge(bMargine, document.getElementById('badgeMargineText'), 'Margine ' + fmt(margine) + '%', tipo);
    showBadge(bGuad,    document.getElementById('badgeGuadagnoText'), (guadagno >= 0 ? '+' : '') + fmt(guadagno) + ' €', tipo);
    hint.textContent = 'Su €' + fmt(prezzo) + ' di vendita guadagni €' + fmt(guadagno) + ' (' + fmt(margine, 1) + '% di margine).';
  }

  // Ultimo campo riempito automaticamente dal calcolo: serve per poterlo
  // ripulire quando i dati non bastano più a calcolarlo.
  let computedEl = null;

  // Calcola il terzo campo dato quale campo sta modificando l'utente (sourceId)
  // Non tocca mai il campo sorgente, aggiorna gli altri due o solo quello mancante
  function calc(sourceId) {
    const C = parse(costoEl.value);
    const M = parse(markupEl.value);
    const P = parse(prezzoEl.value);
    const hasC = !isNaN(C) && C > 0;
    const hasM = !isNaN(M);
    const hasP = !isNaN(P) && P > 0;

    // costo o markup modificati -> calcola prezzo
    if (sourceId === 'costo' || sourceId === 'markup') {
      if (hasC && hasM && (1 + M / 100) > 0) {
        const np = C * (1 + M / 100);
        prezzoEl.value = fmt(np);
        computedEl = prezzoEl;
        updateBadges(C, M, np);
        return;
      }
    }

    // prezzo modificato -> preferisce calcolare markup (se costo presente), altrimenti costo
    if (sourceId === 'prezzo') {
      if (hasC && hasP) {
        const nm = ((P - C) / C) * 100;
        markupEl.value = fmt(nm);
        computedEl = markupEl;
        updateBadges(C, nm, P);
        return;
      }
      if (hasM && hasP && (1 + M / 100) > 0) {
        const nc = P / (1 + M / 100);
        costoEl.value = fmt(nc);
        computedEl = costoEl;
        updateBadges(nc, M, P);
        return;
      }
    }

    // Dati insufficienti: ripulisce il campo calcolato in precedenza
    // (che altrimenti mostrerebbe un risultato ormai non valido).
    if (computedEl && computedEl.id !== sourceId) {
      computedEl.value = '';
    }
    computedEl = null;
    hideBadges();
  }

  // Formatta il campo al blur e ricalcola
  function onBlur(el) {
    const v = parse(el.value);
    if (!isNaN(v)) el.value = fmt(v);
    calc(el.id);
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

  // Aggiorna tutte le sezioni ausiliarie (IVA, sconto, margine minimo, quantità,
  // quota) a partire da costo e prezzo correnti.
  function updateExtras() {
    const C = parse(costoEl.value);
    const P = parse(prezzoEl.value);
    const hasC = !isNaN(C) && C > 0;
    const hasP = !isNaN(P) && P > 0;

    // --- IVA: prezzo IVA inclusa (aliquota inserita o 22% di default) ---
    let iva = parse(ivaEl.value);
    if (isNaN(iva)) iva = 22;
    if (hasP && iva >= 0) {
      const ivato = P * (1 + iva / 100);
      hintIva.textContent = 'Prezzo IVA inclusa (' + fmtP(iva) + '%): €' + fmt(ivato) +
        ' — di cui IVA €' + fmt(ivato - P);
    } else {
      hintIva.textContent = 'Inserisci un prezzo per calcolare l\'IVA.';
    }
    ivaPresetBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.iva) === iva));

    // --- Sconto in trattativa: prezzo scontato e margine risultante ---
    const sc = parse(scontoEl.value);
    if (hasP && !isNaN(sc)) {
      const ps = P * (1 - sc / 100);
      if (hasC && ps > 0) {
        const mg = ((ps - C) / ps) * 100;
        hintSconto.textContent = 'Con -' + fmtP(sc) + '% → prezzo €' + fmt(ps) +
          ', margine ' + fmt(mg, 1) + '% (guadagno €' + fmt(ps - C) + ')';
      } else {
        hintSconto.textContent = 'Con -' + fmtP(sc) + '% → prezzo scontato €' + fmt(ps);
      }
    } else {
      hintSconto.textContent = '';
    }

    // --- Prezzo minimo per un margine-obiettivo (dato il costo) ---
    const tg = parse(targetEl.value);
    if (hasC && !isNaN(tg) && tg < 100) {
      const pmin = C / (1 - tg / 100);
      hintMinimo.textContent = 'Prezzo minimo per margine ≥ ' + fmtP(tg) + '%: €' + fmt(pmin);
    } else {
      hintMinimo.textContent = '';
    }

    // --- Quantità e totale riga ---
    const qt = parse(quantEl.value);
    if (hasP && !isNaN(qt) && qt > 0) {
      const unita = qt === 1 ? 'pezzo' : 'pezzi';
      let txt = fmtP(qt) + ' ' + unita + ' → totale €' + fmt(P * qt);
      if (hasC) txt += ' (guadagno totale €' + fmt((P - C) * qt) + ')';
      hintTotale.textContent = txt;
    } else {
      hintTotale.textContent = '';
    }

    calcQuota();
  }

  const ivaPresetBtns = Array.from(document.querySelectorAll('#ivaPresets button'));

  [costoEl, markupEl, prezzoEl].forEach(el => {
    // in tempo reale: aggiorna badge/terzo campo mentre si digita
    el.addEventListener('input', () => { calc(el.id); updateExtras(); });
    // al blur: formatta e ricalcola
    el.addEventListener('blur', () => { onBlur(el); updateExtras(); });
  });

  // Campi ausiliari: ricalcolano solo le sezioni extra
  [ivaEl, scontoEl, targetEl, quantEl, quotaEl].forEach(el => {
    el.addEventListener('input', updateExtras);
  });

  // Pulsanti aliquota IVA rapida
  ivaPresetBtns.forEach(b => {
    b.addEventListener('click', () => { ivaEl.value = b.dataset.iva; updateExtras(); });
  });

  // THEME TOGGLE
  const toggleBtn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let dark = matchMedia('(prefers-color-scheme:dark)').matches;
  const moonSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  toggleBtn.innerHTML = dark ? sunSVG : moonSVG;
  toggleBtn.addEventListener('click', () => {
    dark = !dark;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    toggleBtn.innerHTML = dark ? sunSVG : moonSVG;
  });

  // Stato iniziale delle sezioni ausiliarie
  updateExtras();
})();
