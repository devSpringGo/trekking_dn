import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Converts a standard Google Drive sharing link to a direct image link.
 * @param url The Google Drive sharing URL
 * @returns A direct image URL or the original URL if not a Drive link
 */
export const formatDriveUrl = (url: string): string => {
  if (!url) return '';
  
  // Handle /file/d/ID format
  const fileDMatch = url.match(/\/file\/d\/([^\/\?]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${fileDMatch[1]}`;
  }
  
  // Handle ?id=ID format
  const idParamMatch = url.match(/[?&]id=([^\/\&]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${idParamMatch[1]}`;
  }

  return url;
};

/**
 * Uploads a file to Cloudinary and returns the secure URL.
 * @param file The file to upload
 * @param _path The folder path in Cloudinary
 * @returns The secure URL
 */
export const uploadFile = async (file: File, _path: string): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.warn('Image compression failed, using original file:', error);
    }
  }

  formData.append('file', fileToUpload);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', _path); // Use the path as the folder name

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = errorData.error?.message || 'Failed to upload to Cloudinary';
      
      // Provide specific guidance for the common 'unsigned uploads' error
      if (errorMessage.includes('unsigned uploads')) {
        errorMessage = "Cloudinary Configuration Error: The upload preset must be set to 'Unsigned' mode. Please go to Cloudinary Settings > Upload > Upload presets and change the Mode to 'Unsigned' for your preset.";
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw error;
  }
};

// Error handling helper
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  serverTimestamp 
};
