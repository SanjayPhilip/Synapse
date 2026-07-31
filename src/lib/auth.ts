import { api } from '@/lib/api-client';
import type { Profile, UserRole } from '@/types';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    company_name: string | null;
  };
}

export async function registerSeeker(email: string, password: string, fullName: string): Promise<{ error: string | null }> {
  try {
    const data = await api.post<TokenResponse>('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
      role: 'seeker',
    });
    localStorage.setItem('synapse_token', data.access_token);
    localStorage.setItem('synapse_user', JSON.stringify(data.user));
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Registration failed' };
  }
}

export async function registerEmployer(
  email: string,
  password: string,
  fullName: string,
  companyName: string
): Promise<{ error: string | null }> {
  try {
    const data = await api.post<TokenResponse>('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
      role: 'employer',
      company_name: companyName,
    });
    localStorage.setItem('synapse_token', data.access_token);
    localStorage.setItem('synapse_user', JSON.stringify(data.user));
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Registration failed' };
  }
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  try {
    const data = await api.post<TokenResponse>('/api/v1/auth/login', {
      email,
      password,
    });
    localStorage.setItem('synapse_token', data.access_token);
    localStorage.setItem('synapse_user', JSON.stringify(data.user));
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Login failed' };
  }
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<{ error: string | null }> {
  try {
    await api.put('/api/v1/auth/me', updates);
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Update failed' };
  }
}
