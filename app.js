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

  function parse(str) {
    if (!str || str.trim() === '') return NaN;
    return parseFloat(str.trim().replace(',', '.'));
  }

  function fmt(n, dec = 2) {
    return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
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
      if (hasC && hasM) {
        const np = C * (1 + M / 100);
        prezzoEl.value = fmt(np);
        updateBadges(C, M, np);
        return;
      }
    }

    // prezzo modificato -> preferisce calcolare markup (se costo presente), altrimenti costo
    if (sourceId === 'prezzo') {
      if (hasC && hasP) {
        const nm = ((P - C) / C) * 100;
        markupEl.value = fmt(nm);
        updateBadges(C, nm, P);
        return;
      }
      if (hasM && hasP) {
        const nc = P / (1 + M / 100);
        costoEl.value = fmt(nc);
        updateBadges(nc, M, P);
        return;
      }
    }

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

  [costoEl, markupEl, prezzoEl].forEach(el => {
    // in tempo reale: aggiorna badge/terzo campo mentre si digita
    el.addEventListener('input', () => calc(el.id));
    // al blur: formatta e ricalcola
    el.addEventListener('blur', () => onBlur(el));
  });
  quotaEl.addEventListener('input', calcQuota);
  quotaEl.addEventListener('blur', () => { const v = parse(quotaEl.value); if (!isNaN(v)) quotaEl.value = fmt(v); calcQuota(); });

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
})();
