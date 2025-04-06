import { ApiClient } from './ApiClient';

// Endpoints for Dashboard Settings API
const SETTINGS_ENDPOINT = '/dashboard/settings';

// For fallback when server is unavailable
const SETTINGS_KEY = 'dashboard_settings';

export interface DashboardSettings {
  title: string;
  subtitle: string;
  primaryColor: string;
  backgroundColor: string;
}

export const defaultSettings: DashboardSettings = {
  title: 'Services Dashboard',
  subtitle: 'Access all your local services in one place',
  primaryColor: '#2563eb',
  backgroundColor: '#ffffff'
};

export const DashboardSettingsService = {
  /**
   * Get dashboard settings from the server
   */
  getSettings: async (): Promise<DashboardSettings> => {
    try {
      // Try to fetch from server
      const settings = await ApiClient.get<DashboardSettings>(SETTINGS_ENDPOINT);
      
      // Also update local storage as fallback
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      
      return settings;
    } catch (error) {
      console.error('Error fetching dashboard settings from server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const settings = localStorage.getItem(SETTINGS_KEY);
      if (!settings) return defaultSettings;
      
      try {
        return JSON.parse(settings);
      } catch (e) {
        console.error('Error parsing dashboard settings', e);
        return defaultSettings;
      }
    }
  },
  
  /**
   * Save dashboard settings to the server
   */
  saveSettings: async (settings: DashboardSettings): Promise<void> => {
    try {
      // Try to save to server
      await ApiClient.put(SETTINGS_ENDPOINT, settings);
      
      // Also update local storage as fallback
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving dashboard settings to server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  },
  
  /**
   * Initialize dashboard settings if none exist
   */
  initialize: async (): Promise<DashboardSettings> => {
    try {
      // Try to get settings from server first
      return await DashboardSettingsService.getSettings();
    } catch (error) {
      console.error('Error initializing dashboard settings from server:', error);
      
      // If no settings in localStorage either, create defaults
      if (!localStorage.getItem(SETTINGS_KEY)) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      }
      
      // Try to load from localStorage
      const settings = localStorage.getItem(SETTINGS_KEY);
      if (settings) {
        try {
          return JSON.parse(settings);
        } catch (e) {
          console.error('Error parsing dashboard settings during initialization', e);
        }
      }
      
      return defaultSettings;
    }
  }
}; 