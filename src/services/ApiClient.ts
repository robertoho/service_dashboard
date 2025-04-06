// API endpoint configuration
const API_BASE_URL = '/api'; // This should be updated to point to your actual backend URL

// Default request headers
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

// Timeout for requests in milliseconds
const REQUEST_TIMEOUT = 10000;

// Error class for API errors
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Handles API requests with proper error handling and timeout
 */
export const ApiClient = {
  /**
   * Send a request to the API
   */
  async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...DEFAULT_HEADERS,
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          errorText || `Request failed with status ${response.status}`,
          response.status
        );
      }
      
      // If response is no content, return null
      if (response.status === 204) {
        return null as T;
      }
      
      // Parse JSON response
      const result = await response.json();
      return result as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408);
      }
      
      // Re-throw ApiErrors
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Wrap other errors
      throw new ApiError(error.message || 'Network error', 0);
    }
  },
  
  /**
   * GET request
   */
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, headers);
  },
  
  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, headers);
  },
  
  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, headers);
  },
  
  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, headers);
  }
}; 