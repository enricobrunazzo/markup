import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore/lite';
import app from './firebaseConfig';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const form = document.getElementById('calcForm');
const marginEl = document.getElementById('margin');
const markupEl = document.getElementById('markup');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const marginInput = document.getElementById('marginInput');
const markupInput = document.getElementById('markupInput');

let currentUser = null;

loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      currentUser = result.user;
      updateUI();
      loadUserData();
    })
    .catch((error) => {
      console.error('Login error:', error);
    });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    currentUser = null;
    updateUI();
  });
});

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

marginInput.addEventListener('input', () => {
  const margin = parseFloat(marginInput.value);
  if (margin >= 0 && margin <= 100) {
    const markup = (margin / (100 - margin)) * 100;
    markupInput.value = markup.toFixed(2);
  } else {
    markupInput.value = '';
  }
});

markupInput.addEventListener('input', () => {
  const markup = parseFloat(markupInput.value);
  if (markup >= 0) {
    const margin = (markup / (markup + 100)) * 100;
    marginInput.value = margin.toFixed(2);
  } else {
    marginInput.value = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert('Devi essere autenticato per salvare i dati.');
    return;
  }

  const cost = parseFloat(document.getElementById('cost').value);
  const price = parseFloat(document.getElementById('price').value);
  const margin = parseFloat(marginInput.value);
  const markup = parseFloat(markupInput.value);

  if (cost > 0 && price > 0 && price > cost) {
    marginEl.textContent = margin.toFixed(2) + '%';
    markupEl.textContent = markup.toFixed(2) + '%';

    try {
      // Salvataggio dati utente in documento dedicato per aggiornamento
      await setDoc(doc(db, 'users', currentUser.uid), { cost, price, margin, markup });
      console.log('Dati salvati.');
    } catch (error) {
      console.error('Errore salvataggio:', error);
    }
  } else {
    marginEl.textContent = 'Input non valido';
    markupEl.textContent = 'Input non valido';
  }
});

async function loadUserData() {
  if (!currentUser) return;
  const userDoc = doc(db, 'users', currentUser.uid);

  try {
    const docSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)));
    if (docSnap.docs.length > 0) {
      const data = docSnap.docs[0].data();
      document.getElementById('cost').value = data.cost || '';
      document.getElementById('price').value = data.price || '';
      marginInput.value = data.margin || '';
      markupInput.value = data.markup || '';
    }
  } catch (error) {
    console.error('Errore caricamento dati utente:', error);
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

updateUI();
