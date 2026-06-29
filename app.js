// Import da CDN Firebase per ambiente browser
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db   = getFirestore(app);

const loginCard   = document.getElementById('loginCard');
const calcCard    = document.getElementById('calcCard');
const loginBtn    = document.getElementById('loginBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const costoEl     = document.getElementById('costo');
const markupEl    = document.getElementById('markup');
const prezzoEl    = document.getElementById('prezzo');
const quotaEl     = document.getElementById('quotaPercent');
const quotaDescEl = document.getElementById('quotaDesc');
const bMarkup     = document.getElementById('badgeMarkup');
const bMargine    = document.getElementById('badgeMargine');
const bGuad       = document.getElementById('badgeGuadagno');
const hint        = document.getElementById('hint');
const hintQuota   = document.getElementById('hintQuota');

let currentUser = null;
let active = null;
let saveTimer = null;
let authReady = false;

loginCard.style.display = 'none';
calcCard.style.display  = 'none';

console.log('[AUTH] app.js caricato, avvio getRedirectResult...');

getRedirectResult(auth).then(result => {
  console.log('[AUTH] getRedirectResult result:', result);
  if (result && result.user) {
    console.log('[AUTH] utente da redirect:', result.user.email);
  } else {
    console.log('[AUTH] nessun utente dal redirect (normale se non arrivo da Google)');
  }
}).catch(err => {
  console.error('[AUTH] getRedirectResult ERROR:', err.code, err.message);
});

onAuthStateChanged(auth, user => {
  console.log('[AUTH] onAuthStateChanged fired, user:', user ? user.email : null);
  currentUser = user;
  authReady = true;
  updateUI();
  if (user) loadUserData();
});

loginBtn.onclick = () => {
  console.log('[AUTH] click login, avvio signInWithRedirect...');
  signInWithRedirect(auth, provider);
};
logoutBtn.onclick = () => signOut(auth).then(() => { currentUser = null; updateUI(); }).catch(console.error);

function updateUI() {
  if (!authReady) return;
  console.log('[UI] updateUI chiamato, currentUser:', currentUser ? currentUser.email : null);
  if (currentUser) {
    loginCard.style.display = 'none';
    calcCard.style.display  = 'block';
  } else {
    loginCard.style.display = 'block';
    calcCard.style.display  = 'none';
    clearFields();
  }
}

function clearFields() {
  [costoEl, markupEl, prezzoEl, quotaEl, quotaDescEl].forEach(el => el.value = '');
  hideBadges();
  hint.textContent = 'Inserisci due valori — il terzo viene calcolato automaticamente.';
  hintQuota.textContent = '';
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

function calc() {
  const C = parseFloat(costoEl.value);
  const M = parseFloat(markupEl.value);
  const P = parseFloat(prezzoEl.value);
  const hasC = !isNaN(C) && C > 0;
  const hasM = !isNaN(M);
  const hasP = !isNaN(P) && P > 0;

  if (active !== 'prezzo' && hasC && hasM) {
    const np = C * (1 + M / 100);
    if (prezzoEl !== document.activeElement) prezzoEl.value = fmt(np);
    updateBadges(C, M, np); scheduleSave(); return;
  }
  if (active !== 'markup' && hasC && hasP) {
    const nm = ((P - C) / C) * 100;
    if (markupEl !== document.activeElement) markupEl.value = fmt(nm);
    updateBadges(C, nm, P); scheduleSave(); return;
  }
  if (active !== 'costo' && hasM && hasP) {
    const nc = P / (1 + M / 100);
    if (costoEl !== document.activeElement) costoEl.value = fmt(nc);
    updateBadges(nc, M, P); scheduleSave(); return;
  }
  hideBadges();
  hint.textContent = 'Inserisci due valori — il terzo viene calcolato automaticamente.';
}

function calcQuota() {
  const q = parseFloat(quotaEl.value);
  const p = parseFloat(prezzoEl.value);
  if (!isNaN(q) && !isNaN(p) && p > 0) {
    const netto = p * (1 - q / 100);
    hintQuota.textContent = 'Prezzo netto quota: €' + fmt(netto) + ' (quota €' + fmt(p - netto) + ')';
  } else {
    hintQuota.textContent = '';
  }
  scheduleSave();
}

[costoEl, markupEl, prezzoEl].forEach(el => {
  el.addEventListener('focus', () => { active = el.id; });
  el.addEventListener('input', calc);
  el.addEventListener('blur',  () => setTimeout(() => { active = null; }, 50));
});
quotaEl.addEventListener('input', calcQuota);
quotaDescEl.addEventListener('input', scheduleSave);

function scheduleSave() {
  if (!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveUserData, 1200);
}

async function saveUserData() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      costo: costoEl.value, markup: markupEl.value, prezzo: prezzoEl.value,
      quotaPercent: quotaEl.value, quotaDesc: quotaDescEl.value,
    });
  } catch(e) { console.error('saveUserData:', e); }
}

async function loadUserData() {
  if (!currentUser) return;
  try {
    const q = query(collection(db, 'users'), where('__name__', '==', currentUser.uid));
    const snap = await getDocs(q);
    if (snap.docs.length > 0) {
      const d = snap.docs[0].data();
      costoEl.value     = d.costo        || '';
      markupEl.value    = d.markup       || '';
      prezzoEl.value    = d.prezzo       || '';
      quotaEl.value     = d.quotaPercent || '';
      quotaDescEl.value = d.quotaDesc    || '';
      calc(); calcQuota();
    }
  } catch(e) { console.error('loadUserData:', e); }
}

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
