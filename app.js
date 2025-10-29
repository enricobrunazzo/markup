console.log("Script caricato - verifica UI autenticazione");

import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore/lite';
import app from './firebaseConfig';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const form = document.getElementById('calcForm');
const marginEl = document.getElementById('margin');
const markupEl = document.getElementById('markup');

// log UI elements
console.log(loginBtn, logoutBtn, form);

let currentUser = null;

loginBtn.onclick = () => {
  console.log('Login clicked');
  signInWithPopup(auth, provider)
    .then(result => {
      currentUser = result.user;
      updateUI();
      loadUserData();
    })
    .catch(console.error);
};

logoutBtn.onclick = () => {
  console.log('Logout clicked');
  signOut(auth)
    .then(() => {
      currentUser = null;
      updateUI();
    })
    .catch(console.error);
};

function updateUI() {
  console.log('Updating UI, user:', currentUser);
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

form.onsubmit = async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert('Devi essere autenticato per usare questa funzione.');
    return;
  }

  const cost = parseFloat(document.getElementById('cost').value);
  const price = parseFloat(document.getElementById('price').value);
  const marginInput = parseFloat(document.getElementById('marginInput').value);
  const markupInput = parseFloat(document.getElementById('markupInput').value);

  if (cost <= 0 || price <= 0 || price <= cost) {
    marginEl.textContent = 'Input non valido';
    markupEl.textContent = 'Input non valido';
    return;
  }

  marginEl.textContent = marginInput.toFixed(2) + '%';
  markupEl.textContent = markupInput.toFixed(2) + '%';

  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      cost,
      price,
      margin: marginInput,
      markup: markupInput,
      timestamp: new Date()
    });
    console.log('Dati salvati su Firestore');
  } catch (err) {
    console.error('Errore salvataggio dati:', err);
  }
};

async function loadUserData() {
  if (!currentUser) return;
  const userDoc = doc(db, 'users', currentUser.uid);

  try {
    const q = query(collection(db, 'users'), where('__name__', '==', currentUser.uid));
    const querySnap = await getDocs(q);
    if (querySnap.docs.length > 0) {
      const data = querySnap.docs[0].data();
      document.getElementById('cost').value = data.cost || '';
      document.getElementById('price').value = data.price || '';
      document.getElementById('marginInput').value = data.margin || '';
      document.getElementById('markupInput').value = data.markup || '';
      console.log('Dati utente caricati:', data);
    }
  } catch (err) {
    console.error('Errore caricamento dati:', err);
  }
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

updateUI();
