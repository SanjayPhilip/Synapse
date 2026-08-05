import { api } from '@/lib/api-client';
import type { Profile } from '@/types';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    company_name: string | null;
    is_verified?: boolean;
    verify_token?: string;
  };
}

export async function registerSeeker(email: string, password: string, fullName: string): Promise<{ error: string | null; verify_token?: string; is_verified?: boolean }> {
  try {
    const data = await api.post<TokenResponse>('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
      role: 'seeker',
    });
    localStorage.setItem('synapse_token', data.access_token);
    localStorage.setItem('synapse_user', JSON.stringify(data.user));
    return { error: null, verify_token: data.user.verify_token, is_verified: data.user.is_verified };
  } catch (e: any) {
    return { error: e.message || 'Registration failed' };
  }
}

export async function registerEmployer(
  email: string,
  password: string,
  fullName: string,
  companyName: string
): Promise<{ error: string | null; verify_token?: string; is_verified?: boolean }> {
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
    return { error: null, verify_token: data.user.verify_token, is_verified: data.user.is_verified };
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

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
  try {
    await api.post('/api/v1/auth/change-password', { current_password: currentPassword, new_password: newPassword });
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Failed to change password' };
  }
}
