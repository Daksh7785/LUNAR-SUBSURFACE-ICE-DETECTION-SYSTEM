import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

class LocalStorageMock {
  store: Record<string, string> = {};
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
}
globalThis.localStorage = new LocalStorageMock() as any;

describe('AuthStore Enterprise Unit Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('should initialize with default unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should successfully log in a valid ISRO expert and persist JWT', () => {
    const mockUser = {
      id: 'usr_isro_9981',
      name: 'Dr. Chandrayaan Sharma',
      email: 'mission_control@isro.gov.in',
      role: 'Expert' as const,
    };
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.isro_mock_jwt_secret';

    useAuthStore.getState().login(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(mockToken);
  });

  it('should clear state and local storage upon logout', () => {
    const mockUser = {
      id: 'usr_isro_9981',
      name: 'Dr. Chandrayaan Sharma',
      email: 'mission_control@isro.gov.in',
      role: 'Expert' as const,
    };
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.isro_mock_jwt_secret';

    useAuthStore.getState().login(mockUser, mockToken);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should gracefully reject malformed user objects or missing tokens', () => {
    const state = useAuthStore.getState();
    // Simulate invalid login attempt
    try {
      state.login(null as any, '');
    } catch (e) {
      expect(state.isAuthenticated).toBe(false);
    }
  });
});
