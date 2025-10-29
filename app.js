// Import da CDN Firebase per ambiente browser
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Configurazione Firebase da file separato
import { firebaseConfig } from './firebaseConfig.js';

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const form = document.getElementById('calcForm');
const costInput = document.getElementById('cost');
const priceInput = document.getElementById('price');
const marginInput = document.getElementById('marginInput');
const markupInput = document.getElementById('markupInput');
const quotaInput = document.getElementById('quotaPercent');
const quotaDesc = document.getElementById('quotaDesc');

let currentUser = null;
let updating = false; // per evitare loop

// Gestione login/logout
loginBtn.onclick = () => {
  signInWithPopup(auth, provider).then(result => {
    currentUser = result.user;
    updateUI();
    loadUserData();
  }).catch(console.error);
};
logoutBtn.onclick = () => {
  signOut(auth).then(() => {
    currentUser = null;
    updateUI();
  }).catch(console.error);
};

function updateUI() {
  if (currentUser) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    form.style.display = 'block';
  } else {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    form.style.display = 'none';
    clearFields();
  }
}

function clearFields() {
  costInput.value = '';
  priceInput.value = '';
  marginInput.value = '';
  markupInput.value = '';
  quotaInput.value = '';
  document.getElementById('margin').textContent = '';
  document.getElementById('markup').textContent = '';
  document.getElementById('prezzoFinale').textContent = '';
}

// Funzioni di calcolo con quote consorzio
function calcPrezzoDaCostMargine(cost, margine) {
  return cost / (1 - margine / 100);
}
function calcPrezzoDaCostMarkup(cost, markup) {
  return cost + (cost * markup / 100);
}
function calcMargineDaPrezzo(cost, prezzo) {
  return ((prezzo - cost) / prezzo) * 100;
}
function calcMarkupDaPrezzo(cost, prezzo) {
  return ((prezzo - cost) / cost) * 100;
}

// Gestione aggiornamenti live
function setupListeners() {
  costInput.oninput = () => updateFromInputs();
  priceInput.oninput = () => updateFromInputs();
  marginInput.oninput = () => updateFromInputs();
  markupInput.oninput = () => updateFromInputs();
  quotaInput.oninput = () => updateFromQuota();
}

function updateFromInputs() {
  if (updating) return;
  updating = true;

  const cost = parseFloat(costInput.value);
  const prezzo = parseFloat(priceInput.value);
  const margine = parseFloat(marginInput.value);
  const markup = parseFloat(markupInput.value);
  const quotaPercent = parseFloat(quotaInput.value);

  // Gestione quota consorzio
  const quotaAmount = (isNaN(quotaPercent) ? 0 : quotaPercent) / 100;
  let costNetto = cost;
  if (!isNaN(cost) && quotaAmount > 0) {
    // sottrae quota dal costo lordo
    costNetto = cost - (cost * quotaAmount);
  }

  // Calcolo prezzo finale considerando quota
  if (!isNaN(cost) && !isNaN(margine) && (marginInput === document.activeElement || marginInput.value === '')) {
    // se margine dato, calcola prezzo
    const nuovoPrezzo = calcPrezzoDaCostMargine(cost, margine);
    if (!isNaN(nuovoPrezzo)) {
      priceInput.value = nuovoPrezzo.toFixed(2);
    }
  } else if (!isNaN(cost) && !isNaN(markup) && (markupInput === document.activeElement || markupInput.value === '')) {
    // se markup dato, calcola prezzo
    const nuovoPrezzo = calcPrezzoDaCostMarkup(cost, markup);
    if (!isNaN(nuovoPrezzo)) {
      priceInput.value = nuovoPrezzo.toFixed(2);
    }
  } else if (!isNaN(cost) && !isNaN(prezzo) && (priceInput === document.activeElement || priceInput.value === '')) {
    // se prezzo impostato, calcola margine e markup
    const margineCalcolato = calcMargineDaPrezzo(cost, prezzo);
    const markupCalcolato = calcMarkupDaPrezzo(cost, prezzo);
    marginInput.value = margineCalcolato.toFixed(2);
    markupInput.value = markupCalcolato.toFixed(2);
  }
  // Aggiorno margini visuali
  if (!isNaN(cost) && !isNaN(prezzo)) {
    document.getElementById('margin').textContent = calcMargineDaPrezzo(cost, prezzo).toFixed(2) + '%';
    document.getElementById('markup').textContent = calcMarkupDaPrezzo(cost, prezzo).toFixed(2) + '%';
    // Prezzo finale considerando quota
    const prezzoFinale = !isNaN(prezzo) ? prezzo : calcPrezzoDaCostMarkup(cost, markup);
    document.getElementById('prezzoFinale').textContent = (prezzoFinale * (1 - quotaAmount)).toFixed(2);
  }
  updating = false;
}

function updateFromQuota() {
  if (updating) return;
  updating = true;
  // Ricalcola prezzo finale con quota
  const quotaPercent = parseFloat(quotaInput.value);
  const quotaAmount = (isNaN(quotaPercent) ? 0 : quotaPercent) / 100;
  const prezzo = parseFloat(priceInput.value);
  if (!isNaN(prezzo)) {
    document.getElementById('prezzoFinale').textContent = (prezzo * (1 - quotaAmount)).toFixed(2);
  }
  updating = false;
}

// Funzione di caricamento dati utente e inizializzazione
async function loadUserData() {
  if (!currentUser) return;
  const q = query(collection(db, 'users'), where('__name__', '==', currentUser.uid));
  const querySnap = await getDocs(q);
  if (querySnap.docs.length > 0) {
    const data = querySnap.docs[0].data();
    costInput.value = data.cost || '';
    priceInput.value = data.price || '';
    marginInput.value = data.margin || '';
    markupInput.value = data.markup || '';
    quotaInput.value = data.quotaPercent || '';
    updateFromInputs();
  }
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

setupListeners();
updateUI();