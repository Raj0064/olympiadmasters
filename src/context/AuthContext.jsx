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
      {!loading ? children : (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export { AuthContext };