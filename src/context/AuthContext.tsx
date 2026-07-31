import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: { user: { id: string } } | null;
  profile: Profile | null;
  loading: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>('seeker');

  useEffect(() => {
    const token = localStorage.getItem('synapse_token');
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get<Profile>('/api/v1/auth/me');
      setProfile(data);
      setActiveRole(data.role);
    } catch {
      localStorage.removeItem('synapse_token');
      localStorage.removeItem('synapse_user');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    localStorage.removeItem('synapse_token');
    localStorage.removeItem('synapse_user');
    setProfile(null);
  }

  const session = profile ? { user: { id: profile.id } } : null;

  return (
    <AuthContext.Provider value={{ session, profile, loading, activeRole, setActiveRole, signOut, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
