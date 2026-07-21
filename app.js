(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const costoEl   = $('costo');
  const markupEl  = $('markup');
  const prezzoEl  = $('prezzo');
  const quotaEl   = $('quotaPercent');
  const quotaDescEl = $('quotaDesc');
  const ivaEl     = $('ivaPercent');
  const scontoEl  = $('scontoPercent');
  const targetEl  = $('margineTarget');
  const quantEl   = $('quantita');

  const hintIva    = $('hintIva');
  const hintSconto = $('hintSconto');
  const hintMinimo = $('hintMinimo');
  const hintTotale = $('hintTotale');
  const hintQuota  = $('hintQuota');
  const hint       = $('hint');

  const bMarkup   = $('badgeMarkup');
  const bMargine  = $('badgeMargine');
  const bGuad     = $('badgeGuadagno');

  const roundRow  = $('roundRow');
  const toastEl   = $('toast');

  const STORE_KEY = 'markup-calc-state';
  const THEME_KEY = 'markup-calc-theme';

  const PERSISTED = [costoEl, markupEl, prezzoEl, ivaEl, scontoEl, targetEl, quantEl, quotaEl, quotaDescEl];

  // Interpreta un numero scritto in vari formati (it-IT, en-US, misti).
  // Gestisce correttamente i separatori delle migliaia, che altrimenti verrebbero
  // interpretati come decimali (es. "1.300,00" -> 1.3 invece di 1300).
  function parse(str) {
    if (str == null) return NaN;
    let s = String(str).trim();
    if (s === '') return NaN;
    s = s.replace(/[^\d.,-]/g, '');
    if (s === '' || s === '-') return NaN;

    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');

    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.'); // it-IT: 1.300,50
      } else {
        s = s.replace(/,/g, '');                    // en-US: 1,300.50
      }
    } else if (lastComma > -1) {
      s = s.replace(',', '.');                       // solo virgola: decimale it-IT
    }

    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  const fmt  = (n, dec = 2) => n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtP = (n) => n.toLocaleString('it-IT', { maximumFractionDigits: 2 });

  const num = (el) => parse(el.value);
  const has = (v) => !isNaN(v);
  const pos = (v) => !isNaN(v) && v > 0;

  // ---------- Badge / risultati ----------

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
    roundRow.hidden = true;
  }

  function updateBadges(costo, markup, prezzo) {
    const guadagno = prezzo - costo;
    const margine  = prezzo !== 0 ? (guadagno / prezzo) * 100 : 0;
    const tipo     = guadagno >= 0 ? 'positive' : 'negative';
    showBadge(bMarkup,  $('badgeMarkupText'),   'Markup '  + fmt(markup)  + '%', 'neutral');
    showBadge(bMargine, $('badgeMargineText'),  'Margine ' + fmt(margine) + '%', tipo);
    showBadge(bGuad,    $('badgeGuadagnoText'), (guadagno >= 0 ? '+' : '') + fmt(guadagno) + ' €', tipo);
    hint.textContent = 'Su €' + fmt(prezzo) + ' di vendita guadagni €' + fmt(guadagno) +
      ' (' + fmt(margine, 1) + '% di margine).';
    roundRow.hidden = !pos(prezzo);
  }

  // Deriva la tripletta completa (costo, markup, prezzo) dai due valori presenti
  // e aggiorna i badge, senza modificare i campi di input.
  function renderBadges() {
    const C = num(costoEl), M = num(markupEl), P = num(prezzoEl);
    if (pos(C) && pos(P)) {
      updateBadges(C, ((P - C) / C) * 100, P);
    } else if (pos(C) && has(M) && (1 + M / 100) > 0) {
      updateBadges(C, M, C * (1 + M / 100));
    } else if (has(M) && pos(P) && (1 + M / 100) > 0) {
      updateBadges(P / (1 + M / 100), M, P);
    } else {
      hideBadges();
    }
  }

  // Ultimo campo riempito automaticamente dal calcolo: serve per poterlo
  // ripulire quando i dati non bastano più a calcolarlo.
  let computedEl = null;

  // Calcola il terzo campo dato quale campo sta modificando l'utente (sourceId).
  // Non tocca mai il campo sorgente.
  function calc(sourceId) {
    const C = num(costoEl), M = num(markupEl), P = num(prezzoEl);
    const hasC = pos(C), hasM = has(M), hasP = pos(P);

    if (sourceId === 'costo' || sourceId === 'markup') {
      if (hasC && hasM && (1 + M / 100) > 0) {
        prezzoEl.value = fmt(C * (1 + M / 100));
        computedEl = prezzoEl;
        renderBadges();
        return;
      }
    }

    if (sourceId === 'prezzo') {
      if (hasC && hasP) {
        markupEl.value = fmt(((P - C) / C) * 100);
        computedEl = markupEl;
        renderBadges();
        return;
      }
      if (hasM && hasP && (1 + M / 100) > 0) {
        costoEl.value = fmt(P / (1 + M / 100));
        computedEl = costoEl;
        renderBadges();
        return;
      }
    }

    // Dati insufficienti: ripulisce il campo calcolato in precedenza.
    if (computedEl && computedEl.id !== sourceId) computedEl.value = '';
    computedEl = null;
    renderBadges();
  }

  function onBlur(el) {
    const v = parse(el.value);
    if (!isNaN(v)) el.value = fmt(v);
    calc(el.id);
  }

  // ---------- Sezioni ausiliarie ----------

  const ivaPresetBtns = Array.from(document.querySelectorAll('#ivaPresets button'));

  function calcQuota() {
    const q = num(quotaEl), p = num(prezzoEl);
    if (has(q) && pos(p)) {
      const netto = p * (1 - q / 100);
      hintQuota.textContent = 'Prezzo netto quota: €' + fmt(netto) + ' (quota €' + fmt(p - netto) + ')';
    } else {
      hintQuota.textContent = '';
    }
  }

  function updateExtras() {
    const C = num(costoEl), P = num(prezzoEl);
    const hasC = pos(C), hasP = pos(P);

    // IVA
    let iva = num(ivaEl);
    if (isNaN(iva)) iva = 22;
    if (hasP && iva >= 0) {
      const ivato = P * (1 + iva / 100);
      hintIva.textContent = 'Prezzo IVA inclusa (' + fmtP(iva) + '%): €' + fmt(ivato) +
        ' — di cui IVA €' + fmt(ivato - P);
    } else {
      hintIva.textContent = 'Inserisci un prezzo per calcolare l\'IVA.';
    }
    ivaPresetBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.iva) === iva));

    // Sconto in trattativa
    const sc = num(scontoEl);
    if (hasP && has(sc)) {
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

    // Prezzo minimo per un margine-obiettivo
    const tg = num(targetEl);
    if (hasC && has(tg) && tg < 100) {
      const pmin = C / (1 - tg / 100);
      hintMinimo.textContent = 'Prezzo minimo per margine ≥ ' + fmtP(tg) + '%: €' + fmt(pmin);
    } else {
      hintMinimo.textContent = '';
    }

    // Quantità e totale
    const qt = num(quantEl);
    if (hasP && pos(qt)) {
      const unita = qt === 1 ? 'pezzo' : 'pezzi';
      let txt = fmtP(qt) + ' ' + unita + ' → totale €' + fmt(P * qt);
      if (hasC) txt += ' (guadagno totale €' + fmt((P - C) * qt) + ')';
      hintTotale.textContent = txt;
    } else {
      hintTotale.textContent = '';
    }

    calcQuota();
  }

  // ---------- Arrotondamento prezzo (charm pricing) ----------

  function roundPrice(kind) {
    const p = num(prezzoEl);
    if (!pos(p)) return;
    let np;
    if (kind === 'int') {
      np = Math.round(p);
    } else if (kind === '50') {
      np = Math.round(p * 2) / 2;
    } else {
      const cents = kind === '99' ? 0.99 : 0.90;
      const base = Math.floor(p);
      np = [base - 1 + cents, base + cents, base + 1 + cents]
        .filter(v => v > 0)
        .reduce((a, b) => Math.abs(b - p) < Math.abs(a - p) ? b : a);
    }
    prezzoEl.value = fmt(np);
    calc('prezzo');   // ricalcola il markup a partire dal nuovo prezzo
    updateExtras();
    save();
  }

  // ---------- Persistenza ----------

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const data = {};
        PERSISTED.forEach(el => { if (el.value) data[el.id] = el.value; });
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      } catch (e) { /* storage non disponibile: si ignora */ }
    }, 150);
  }

  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      PERSISTED.forEach(el => { if (data[el.id] != null) el.value = data[el.id]; });
    } catch (e) { /* dati corrotti: si ignora */ }
  }

  function resetAll() {
    PERSISTED.forEach(el => { el.value = ''; });
    computedEl = null;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    hideBadges();
    updateExtras();
    costoEl.focus();
    toast('Campi azzerati');
  }

  // ---------- Copia riepilogo ----------

  function summaryText() {
    const C = num(costoEl), M = num(markupEl), P = num(prezzoEl);
    if (!pos(C) && !pos(P)) return '';
    const lines = ['Riepilogo prezzo'];
    if (pos(C)) lines.push('Costo:   € ' + fmt(C));
    if (has(M)) lines.push('Markup:  ' + fmt(M) + ' %');
    if (pos(P)) {
      lines.push('Prezzo:  € ' + fmt(P));
      if (pos(C)) {
        const g = P - C;
        lines.push('Margine: ' + fmt((g / P) * 100, 1) + ' % (guadagno € ' + fmt(g) + ')');
      }
      let iva = num(ivaEl); if (isNaN(iva)) iva = 22;
      lines.push('IVA ' + fmtP(iva) + '%: € ' + fmt(P * (1 + iva / 100)) + ' (ivato)');
      const qt = num(quantEl);
      if (pos(qt) && qt !== 1) lines.push('Totale ' + fmtP(qt) + ' pz: € ' + fmt(P * qt));
    }
    const desc = quotaDescEl.value.trim();
    if (desc) lines.push('Rif.:    ' + desc);
    return lines.join('\n');
  }

  async function copySummary() {
    const text = summaryText();
    if (!text) { toast('Niente da copiare'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast('Riepilogo copiato');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Riepilogo copiato'); }
      catch (err) { toast('Copia non riuscita'); }
      document.body.removeChild(ta);
    }
  }

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ---------- Eventi ----------

  [costoEl, markupEl, prezzoEl].forEach(el => {
    el.addEventListener('input', () => { calc(el.id); updateExtras(); save(); });
    el.addEventListener('blur',  () => { onBlur(el);  updateExtras(); save(); });
  });

  [ivaEl, scontoEl, targetEl, quantEl, quotaEl].forEach(el => {
    el.addEventListener('input', () => { updateExtras(); save(); });
  });
  quotaDescEl.addEventListener('input', save);

  ivaPresetBtns.forEach(b => {
    b.addEventListener('click', () => { ivaEl.value = b.dataset.iva; updateExtras(); save(); });
  });

  document.querySelectorAll('#roundRow [data-round]').forEach(b => {
    b.addEventListener('click', () => roundPrice(b.dataset.round));
  });

  $('btnReset').addEventListener('click', resetAll);
  $('btnCopy').addEventListener('click', copySummary);

  // Scorciatoie da tastiera
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); resetAll(); }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur();
  });

  // ---------- Tema ----------

  const toggleBtn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  const moonSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';

  let dark;
  const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } })();
  if (savedTheme) dark = savedTheme === 'dark';
  else dark = matchMedia('(prefers-color-scheme:dark)').matches;

  function applyTheme() {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    toggleBtn.innerHTML = dark ? sunSVG : moonSVG;
  }
  applyTheme();
  toggleBtn.addEventListener('click', () => {
    dark = !dark;
    applyTheme();
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  });

  // ---------- Avvio ----------

  restore();
  renderBadges();
  updateExtras();

  // ---------- Service worker (offline / installabile) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline non disponibile */ });
    });
  }
})();
