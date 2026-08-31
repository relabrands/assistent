import { useState, useEffect, useCallback } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
import { Profile } from '@/types/database';

interface AuthState {
  user: FirebaseUser | null;
  session: { user: FirebaseUser } | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const fetchOrCreateProfile = useCallback(async (firebaseUser: FirebaseUser, displayName?: string) => {
    try {
      const profileRef = doc(db, 'profiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        return {
          id: firebaseUser.uid,
          user_id: firebaseUser.uid,
          display_name: data.display_name || firebaseUser.displayName || 'Usuario',
          email: data.email || firebaseUser.email,
          avatar_url: data.avatar_url || firebaseUser.photoURL || null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        } as Profile;
      }

      // If profile does not exist yet, create it
      const newProfile: Profile = {
        id: firebaseUser.uid,
        user_id: firebaseUser.uid,
        display_name: displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        email: firebaseUser.email || null,
        avatar_url: firebaseUser.photoURL || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(profileRef, newProfile);
      return newProfile;
    } catch (error) {
      console.error('Error fetching/creating profile in Firestore:', error);
      return {
        id: firebaseUser.uid,
        user_id: firebaseUser.uid,
        display_name: displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        email: firebaseUser.email || null,
        avatar_url: firebaseUser.photoURL || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const profile = await fetchOrCreateProfile(currentUser);
        setAuthState({
          user: currentUser,
          session: { user: currentUser },
          profile,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          profile: null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, [fetchOrCreateProfile]);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await firebaseUpdateProfile(userCredential.user, { displayName });
      }
      const profile = await fetchOrCreateProfile(userCredential.user, displayName);
      setAuthState({
        user: userCredential.user,
        session: { user: userCredential.user },
        profile,
        loading: false,
      });
      return { data: { user: userCredential.user }, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchOrCreateProfile(userCredential.user);
      setAuthState({
        user: userCredential.user,
        session: { user: userCredential.user },
        profile,
        loading: false,
      });
      return { data: { user: userCredential.user }, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!authState.user,
  };
}
