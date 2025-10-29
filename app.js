import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore/lite';
import app from './firebaseConfig';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const form = document.getElementById('calcForm');
const marginEl = document.getElementById('margin');
const markupEl = document.getElementById('markup');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

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

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert('Devi essere autenticato per salvare i dati.');
    return;
  }

  const cost = parseFloat(document.getElementById('cost').value);
  const price = parseFloat(document.getElementById('price').value);

  if (cost > 0 && price > 0 && price > cost) {
    const margin = ((price - cost) / price) * 100;
    const markup = ((price - cost) / cost) * 100;

    marginEl.textContent = margin.toFixed(2) + '%';
    markupEl.textContent = markup.toFixed(2) + '%';

    // Save to Firestore
    try {
      await addDoc(collection(db, 'calculations'), {
        uid: currentUser.uid,
        cost,
        price,
        margin,
        markup,
        timestamp: new Date()
      });
      console.log('Calcolo salvato.');
    } catch (error) {
      console.error('Errore salvataggio:', error);
    }
  } else {
    marginEl.textContent = 'Input non valido';
    markupEl.textContent = 'Input non valido';
  }
});

// Load calculations for current user
async function loadUserData() {
  if (!currentUser) return;
  const q = query(collection(db, 'calculations'), where('uid', '==', currentUser.uid));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    console.log('Calcolo utente:', doc.data());
  });
}

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUI();
  if (user) loadUserData();
});

// Initial UI state
updateUI();
