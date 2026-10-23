import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
export { onAuthStateChanged, type User };
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Conversation } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Operation Types for error reporting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client is offline or network restricted.');
    }
  }
}
testConnection();

// User Profile Interface
export interface UserProfileData {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferredLanguage?: string;
  preferredVoice?: string;
  createdAt: number;
  updatedAt: number;
}

// Auth Helper Functions
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user profile exists, create if not
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const now = Date.now();
        const profile: UserProfileData = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Chat AI Member',
          photoURL: user.photoURL || '',
          preferredLanguage: 'auto',
          preferredVoice: 'Kore',
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userRef, profile);
      } else {
        await updateDoc(userRef, {
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn('Could not sync user profile to Firestore:', err);
    }

    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfileData>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Save conversation to Firestore for authenticated user
export async function saveConversationToCloud(
  userId: string,
  conv: Conversation
): Promise<void> {
  const path = `users/${userId}/conversations/${conv.id}`;
  try {
    const convRef = doc(db, 'users', userId, 'conversations', conv.id);
    await setDoc(convRef, {
      id: conv.id,
      userId,
      title: conv.title,
      personaId: conv.personaId,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt || Date.now(),
      messages: conv.messages || [],
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Load all conversations for authenticated user from Firestore
export async function loadConversationsFromCloud(
  userId: string
): Promise<Conversation[]> {
  const path = `users/${userId}/conversations`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'conversations'));
    const list: Conversation[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Conversation);
    });
    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Delete conversation from cloud
export async function deleteConversationFromCloud(
  userId: string,
  convId: string
): Promise<void> {
  const path = `users/${userId}/conversations/${convId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'conversations', convId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
