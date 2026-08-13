import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBc3lceZRKbopUj5l8oa89op2r42C9NBdI',
  authDomain: 'habitelia.firebaseapp.com',
  projectId: 'habitelia',
  storageBucket: 'habitelia.firebasestorage.app',
  messagingSenderId: '29992586518',
  appId: '1:29992586518:web:9000867e37d832b3e99437',
  measurementId: 'G-5QNYXHWF69'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

function getFriendlyAuthErrorMessage(err) {
  const code = err?.code || '';
  if (code.includes('auth/email-already-in-use')) return 'Este email ya está registrado. Probá iniciando sesión.';
  if (code.includes('auth/invalid-email')) return 'El correo electrónico no es válido.';
  if (code.includes('auth/weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('auth/wrong-password') || code.includes('auth/user-not-found') || code.includes('auth/invalid-credential')) {
    return 'Email o contraseña incorrectos.';
  }
  if (code.includes('auth/popup-closed-by-user')) return 'Inicio de sesión con Google cancelado.';
  return err?.message || 'Error al autenticar.';
}

export const signIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user };
  } catch (error) {
    console.error('SignIn error:', error);
    return { error: getFriendlyAuthErrorMessage(error) };
  }
};

export const signUp = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName }).catch(() => {});
    return { user: result.user };
  } catch (error) {
    console.error('SignUp error:', error);
    return { error: getFriendlyAuthErrorMessage(error) };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('ResetPassword error:', error);
    return { success: false, error: getFriendlyAuthErrorMessage(error) };
  }
};

export const signInGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error) {
    console.error('SignInGoogle error:', error);
    return { error: getFriendlyAuthErrorMessage(error) };
  }
};

export const logOut = async () => {
  return await fbSignOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const saveDocument = async (path, data) => {
  const docRef = doc(db, path);
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const getDocument = async (path) => {
  const docRef = doc(db, path);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const getCollection = async (path) => {
  const colRef = collection(db, path);
  const querySnapshot = await getDocs(colRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteDocument = async (path) => {
  const docRef = doc(db, path);
  await deleteDoc(docRef);
};

export const updateDocument = async (path, data) => {
  const docRef = doc(db, path);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};

export const getUserPath = () => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  return `users/${auth.currentUser.uid}`;
};

export const getPublicUserData = async (targetUid) => {
  try {
    const userDoc = await getDocument(`users/${targetUid}`);
    const driverProfile = await getDocument(`users/${targetUid}/driverProfile/main`);
    const habits = await getCollection(`users/${targetUid}/habits`);
    const incidents = await getCollection(`users/${targetUid}/incidents`);
    return {
      uid: targetUid,
      user: userDoc,
      driverProfile,
      habits,
      incidents: incidents || []
    };
  } catch (e) {
    console.error('Error getting public user data:', e);
    return null;
  }
};

export const addFriendToCloud = async (friendUid) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  await saveDocument(`users/${uid}/friends/${friendUid}`, { addedAt: new Date().toISOString() });
};

export const removeFriendFromCloud = async (friendUid) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  await deleteDocument(`users/${uid}/friends/${friendUid}`);
};

export const getFriendsFromCloud = async () => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  return await getCollection(`users/${uid}/friends`);
};

export const deleteAccountAndAllData = async () => {
  if (!auth.currentUser) return { success: false, error: 'No hay usuario autenticado' };
  const user = auth.currentUser;
  const uid = user.uid;

  try {
    const habits = await getCollection(`users/${uid}/habits`);
    for (const h of habits) {
      await deleteDocument(`users/${uid}/habits/${h.id}`).catch(() => {});
    }

    const routines = await getCollection(`users/${uid}/routines`);
    for (const r of routines) {
      await deleteDocument(`users/${uid}/routines/${r.id}`).catch(() => {});
    }

    const incidents = await getCollection(`users/${uid}/incidents`);
    for (const inc of incidents) {
      await deleteDocument(`users/${uid}/incidents/${inc.id}`).catch(() => {});
    }

    const friends = await getCollection(`users/${uid}/friends`);
    for (const f of friends) {
      await deleteDocument(`users/${uid}/friends/${f.id}`).catch(() => {});
    }

    await deleteDocument(`users/${uid}/driverProfile/main`).catch(() => {});
    await deleteDocument(`users/${uid}`).catch(() => {});

    await deleteUser(user).catch(async () => {
      await fbSignOut(auth);
    });

    await fbSignOut(auth).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error('Error deleting account and data:', error);
    await fbSignOut(auth).catch(() => {});
    return { success: false, error: error.message };
  }
};
