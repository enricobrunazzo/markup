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
const marginEl = document.getElementById('margin');
const markupEl = document.getElementById('markup');

const costInput = document.getElementById('cost');
const priceInput = document.getElementById('price');
const marginInput = document.getElementById('marginInput');
const markupInput = document.getElementById('markupInput');

let currentUser = null;

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
    marginEl.textContent = '';
    markupEl.textContent = '';
  }
}

// Funzioni di calcolo per margine, markup, prezzo
function calculateMarginFromPrice(cost, price) {
  if (price > cost) {
    return ((price - cost) / price) * 100;
  }
  return 0;
}
function calculateMarkupFromPrice(cost, price) {
  if (cost > 0) {
    return ((price - cost) / cost) * 100;
  }
  return 0;
}
function calculatePriceFromMargin(cost, margin) {
  return cost / (1 - margin / 100);
}
function calculatePriceFromMarkup(cost, markup) {
  return cost + (cost * markup / 100);
}

function updateValues() {
  const cost = parseFloat(costInput.value);
  const price = parseFloat(priceInput.value);
  const marginVal = parseFloat(marginInput.value);
  const markupVal = parseFloat(markupInput.value);

  // Aggiorna margine e markup se sono vuoti o modificati
  if (!isNaN(cost) && (!isNaN(price) || marginInput === document.activeElement || markupInput === document.activeElement)) {
    if (!isNaN(price) && (marginInput.value === '' || document.activeElement === marginInput)) {
      const margineCalcolato = calculateMarginFromPrice(cost, price);
      marginInput.value = margineCalcolato.toFixed(2);
    } else if (!isNaN(marginVal) && (priceInput.value === '' || document.activeElement === priceInput)) {
      const priceCalcolato = calculatePriceFromMargin(cost, marginVal);
      priceInput.value = priceCalcolato.toFixed(2);
    }
  }

  if (!isNaN(cost) && !isNaN(price)) {
    marginEl.textContent = calculateMarginFromPrice(cost, price).toFixed(2) + '%';
    markupEl.textContent = calculateMarkupFromPrice(cost, price).toFixed(2) + '%';
  } else {
    marginEl.textContent = '';
    markupEl.textContent = '';
  }
}

// Event listeners per calcolo live
costInput.addEventListener('input', updateValues);
priceInput.addEventListener('input', updateValues);
marginInput.addEventListener('input', updateValues);
markupInput.addEventListener('input', updateValues);

form.onsubmit = async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert('Devi essere autenticato per usare questa funzione.');
    return;
  }

  const cost = parseFloat(costInput.value);
  const price = parseFloat(priceInput.value);
  const marginVal = parseFloat(marginInput.value);
  const markupVal = parseFloat(markupInput.value);

  if (cost <= 0 || price <= 0 || price <= cost) {
    marginEl.textContent = 'Input non valido';
    markupEl.textContent = 'Input non valido';
    return;
  }

  marginEl.textContent = marginVal.toFixed(2) + '%';
  markupEl.textContent = markupVal.toFixed(2) + '%';

  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      cost,
      price,
      margin: marginVal,
      markup: markupVal,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Errore salvataggio dati:', err);
  }
};

async function loadUserData() {
  if (!currentUser) return;
  const q = query(collection(db, 'users'), where('__name__', '==', currentUser.uid));
  const querySnap = await getDocs(q);
  if (querySnap.docs.length > 0) {
    const data = querySnap.docs[0].data();
    document.getElementById('cost').value = data.cost || '';
    document.getElementById('price').value = data.price || '';
    document.getElementById('marginInput').value = data.margin || '';
    document.getElementById('markupInput').value = data.markup || '';
    updateValues();
  }
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

updateUI();
