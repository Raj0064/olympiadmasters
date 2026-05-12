// import { createContext, useContext, useEffect, useState } from "react";
// import { auth } from "../firebase";
// import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "../firebase";

// export const AuthContext = createContext();

// export const useAuth = () => useContext(AuthContext);

// const AuthProvider = ({ children }) => {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [userProfile, setUserProfile] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Login function
//   const login = (email, password) => {
//     return signInWithEmailAndPassword(auth, email, password);
//   };

//   // Logout function
//   const logout = () => {
//     return signOut(auth);
//   };

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       setCurrentUser(user);

//       if (user) {
//         try {
//           const docRef = doc(db, "users", user.uid);
//           const docSnap = await getDoc(docRef);
//           if (docSnap.exists()) {
//             setUserProfile(docSnap.data());
//           } else {
//             // User exists in Auth but not in Firestore (deleted/incomplete signup)
//             setUserProfile(null);
//           }
//         } catch (err) {
//           console.error("Failed to fetch user profile:", err);
//           setUserProfile(null);
//           // ── CRITICAL: must still unblock the app ──
//         } finally {
//           setLoading(false); // ← moved here — guaranteed to run
//         }
//       } else {
//         setUserProfile(null);
//         setLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const value = {
//     currentUser,    // Firebase auth user
//     userProfile,    // Firestore user data (name, role, batchId etc)
//     login,
//     logout,
//     loading
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {/* Don't render children until auth state is known */}
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export default AuthProvider;

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true); // true until first auth check

  // ── Fetch Firestore profile for a given uid ──────────────────────────────
  const fetchProfile = useCallback(async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      setUserProfile(snap.exists() ? snap.data() : null);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUserProfile(null);
    }
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
      }

      setLoading(false); // always unblock after first event
    });

    return unsubscribe;
  }, [fetchProfile]);

  // ── Auth helpers ─────────────────────────────────────────────────────────
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  // Call this after updating Firestore profile to sync local state
  const refreshProfile = () => {
    if (currentUser?.uid) return fetchProfile(currentUser.uid);
  };

  // ── Derived helpers ──────────────────────────────────────────────────────
  const isAdmin = userProfile?.role === 'admin';
  const isStudent = userProfile?.role === 'student';

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    logout,
    refreshProfile,
    isAdmin,
    isStudent,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };