import { ApiClient } from './ApiClient';

// Endpoints for Auth API
const AUTH_SETTINGS_ENDPOINT = '/auth/settings';
const AUTH_LOGIN_ENDPOINT = '/auth/login';
const AUTH_VERIFY_ENDPOINT = '/auth/verify';

// For fallback when server is unavailable
const AUTH_SETTINGS_KEY = 'dashboard_auth_settings';
const AUTH_TOKEN_KEY = 'dashboard_auth_token';

export interface AuthSettings {
  isEnabled: boolean;
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  success: boolean;
}

interface VerifyResponse {
  valid: boolean;
}

const defaultAuthSettings: AuthSettings = {
  isEnabled: false,
  username: '',
  password: ''
};

export const AuthService = {
  /**
   * Get authentication settings from the server
   */
  getAuthSettings: async (): Promise<AuthSettings> => {
    try {
      // Try to fetch from server
      const settings = await ApiClient.get<AuthSettings>(AUTH_SETTINGS_ENDPOINT);
      
      // Also update local storage as fallback
      localStorage.setItem(AUTH_SETTINGS_KEY, JSON.stringify(settings));
      
      return settings;
    } catch (error) {
      console.error('Error fetching auth settings from server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const settings = localStorage.getItem(AUTH_SETTINGS_KEY);
      if (!settings) return defaultAuthSettings;
      
      try {
        return JSON.parse(settings);
      } catch (e) {
        console.error('Error parsing auth settings', e);
        return defaultAuthSettings;
      }
    }
  },
  
  /**
   * Save authentication settings to the server
   */
  saveAuthSettings: async (settings: AuthSettings): Promise<void> => {
    try {
      // Try to save to server
      await ApiClient.put(AUTH_SETTINGS_ENDPOINT, settings);
      
      // Also update local storage as fallback
      localStorage.setItem(AUTH_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving auth settings to server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      localStorage.setItem(AUTH_SETTINGS_KEY, JSON.stringify(settings));
    }
  },
  
  /**
   * Attempt to log in with provided credentials
   */
  login: async (username: string, password: string): Promise<boolean> => {
    try {
      // Get current auth settings to check if auth is enabled
      const settings = await AuthService.getAuthSettings();
      
      // If auth is disabled, always allow login
      if (!settings.isEnabled) return true;
      
      // Try to login through the server
      const response = await ApiClient.post<LoginResponse>(AUTH_LOGIN_ENDPOINT, { username, password });
      
      if (response.success && response.token) {
        // Store the token
        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error logging in through server, using local fallback:', error);
      
      // Fallback to localStorage if server is unavailable
      const settings = localStorage.getItem(AUTH_SETTINGS_KEY);
      if (!settings) return true; // If we can't get settings, allow access
      
      try {
        const parsedSettings = JSON.parse(settings) as AuthSettings;
        
        // If auth is disabled, always allow login
        if (!parsedSettings.isEnabled) return true;
        
        // Check credentials
        if (username === parsedSettings.username && password === parsedSettings.password) {
          // Set auth token (a simple timestamp-based token for this demo)
          const token = Date.now().toString();
          localStorage.setItem(AUTH_TOKEN_KEY, token);
          return true;
        }
      } catch (e) {
        console.error('Error parsing auth settings during login', e);
      }
      
      return false;
    }
  },
  
  /**
   * Log out the current user
   */
  logout: async (): Promise<void> => {
    // Remove the token - this is enough to log out
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
  
  /**
   * Check if the current user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      // Get current auth settings
      const settings = await AuthService.getAuthSettings();
      
      // If auth is disabled, user is always authenticated
      if (!settings.isEnabled) return true;
      
      // Get the token
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return false;
      
      // Try to verify the token with the server
      const response = await ApiClient.post<VerifyResponse>(AUTH_VERIFY_ENDPOINT, { token });
      return response.valid;
    } catch (error) {
      console.error('Error verifying authentication through server, using local fallback:', error);
      
      // Fallback to localStorage if server is unavailable
      try {
        const settings = localStorage.getItem(AUTH_SETTINGS_KEY);
        if (!settings) return true; // If we can't get settings, allow access
        
        const parsedSettings = JSON.parse(settings) as AuthSettings;
        
        // If auth is disabled, user is always authenticated
        if (!parsedSettings.isEnabled) return true;
        
        // Check for token
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
      } catch (e) {
        console.error('Error parsing auth settings during verification', e);
        return false;
      }
    }
  },
  
  /**
   * Initialize auth settings if none exist
   */
  initialize: async (): Promise<void> => {
    try {
      // Try to get settings from server first
      await AuthService.getAuthSettings();
    } catch (error) {
      console.error('Error initializing auth settings from server:', error);
      
      // If no settings in localStorage either, create defaults
      if (!localStorage.getItem(AUTH_SETTINGS_KEY)) {
        localStorage.setItem(AUTH_SETTINGS_KEY, JSON.stringify(defaultAuthSettings));
      }
    }
  }
}; 