import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const fetchProfile = useCallback(async (uid) => {
    setProfileError(false);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      setUserProfile(snap.exists() ? snap.data() : null);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setUserProfile(null);
      setProfileError(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true); // keep spinner up while profile loads
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
        setProfileError(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchProfile]);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const refreshProfile = () => currentUser?.uid && fetchProfile(currentUser.uid);

  const value = {
    currentUser,
    userProfile,
    loading,
    profileError,
    login,
    logout,
    refreshProfile,
    isAdmin: userProfile?.role === "admin",
    isStudent: userProfile?.role === "student",
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export { AuthContext };