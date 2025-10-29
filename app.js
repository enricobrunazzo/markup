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

let currentUser = null;
let updating = false; // flag per prevenire loop

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
}

// Funzioni di calcolo
function calcMargin(cost, price) {
  if (cost > 0 && price > cost) return ((price - cost) / price) * 100;
  return 0;
}
function calcMarkup(cost, price) {
  if (cost > 0) return ((price - cost) / cost) * 100;
  return 0;
}
function calcPriceFromMargin(cost, margin) {
  return cost / (1 - margin / 100);
}
function calcPriceFromMarkup(cost, markup) {
  return cost + (cost * markup / 100);
}

// Gestione sincronizzazione live
function setupListeners() {
  costInput.oninput = () => updateFromCost();
  priceInput.oninput = () => updateFromPrice();
  marginInput.oninput = () => updateFromMargin();
  markupInput.oninput = () => updateFromMarkup();
}

function updateFromCost() {
  if (updating) return;
  updating = true;
  const cost = parseFloat(costInput.value);
  // Se prezzo vuoto, calcolo da margine/markup
  const margin = parseFloat(marginInput.value);
  const markup = parseFloat(markupInput.value);
  if (!isNaN(cost)) {
    if (margin === 0 && markup === 0) {
      // nessuna info di prezzo, aspetta
    } else if (margin !== 0 || markup !== 0) {
      // aggiornare prezzo
      if (margin !== 0) {
        const price = calcPriceFromMargin(cost, margin);
        if (!isNaN(price)) priceInput.value = price.toFixed(2);
      } else if (markup !== 0) {
        const price = calcPriceFromMarkup(cost, markup);
        if (!isNaN(price)) priceInput.value = price.toFixed(2);
      }
    }
  }
  recalcMargins();
  updating = false;
}

function updateFromPrice() {
  if (updating) return;
  updating = true;
  const price = parseFloat(priceInput.value);
  const cost = parseFloat(costInput.value);
  if (!isNaN(cost) && !isNaN(price)) {
    const margin = calcMargin(cost, price);
    marginInput.value = margin.toFixed(2);
    const markup = calcMarkup(cost, price);
    markupInput.value = markup.toFixed(2);
  }
  recalcMargins();
  updating = false;
}

function updateFromMargin() {
  if (updating) return;
  updating = true;
  const margin = parseFloat(marginInput.value);
  const cost = parseFloat(costInput.value);
  if (!isNaN(cost) && !isNaN(margin)) {
    const price = calcPriceFromMargin(cost, margin);
    if (!isNaN(price)) priceInput.value = price.toFixed(2);
  }
  recalcMargins();
  updating = false;
}

function updateFromMarkup() {
  if (updating) return;
  updating = true;
  const markup = parseFloat(markupInput.value);
  const cost = parseFloat(costInput.value);
  if (!isNaN(cost) && !isNaN(markup)) {
    const price = calcPriceFromMarkup(cost, markup);
    if (!isNaN(price)) priceInput.value = price.toFixed(2);
  }
  recalcMargins();
  updating = false;
}

function recalcMargins() {
  const cost = parseFloat(costInput.value);
  const price = parseFloat(priceInput.value);
  if (!isNaN(cost) && !isNaN(price) && price > cost) {
    const margin = calcMargin(cost, price);
    const markup = calcMarkup(cost, price);
    document.getElementById('margin').textContent = margin.toFixed(2) + '%';
    document.getElementById('markup').textContent = markup.toFixed(2) + '%';
  } else {
    document.getElementById('margin').textContent = '';
    document.getElementById('markup').textContent = '';
  }
}

// Carica dati utente
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
    updateFromCost();
  }
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

setupListeners();
updateUI();
