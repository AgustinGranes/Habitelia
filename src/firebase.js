import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
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

export const signIn = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signUp = async (email, password, displayName) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result.user;
};

export const resetPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email);
};

export const signInGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
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
