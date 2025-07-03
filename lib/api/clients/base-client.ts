import { supabase } from '@/lib/supabase';
import { 
  ApiResponse, 
  ApiError, 
  ValidationError,
} from '../types';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  enableLogging: boolean;
}

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  enableLogging: process.env.NODE_ENV === 'development',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isApiError(response: any): response is ApiError {
  return response && typeof response.error === 'string';
}

function createValidationError(field: string, message: string, value?: any): ValidationError {
  return { field, message, value };
}

// ============================================================================
// REQUEST/RESPONSE INTERCEPTORS
// ============================================================================

export interface RequestContext {
  method: string;
  url: string;
  body?: any;
  headers: Record<string, string>;
  requestId: string;
  timestamp: string;
}

export interface ResponseContext {
  status: number;
  data: any;
  headers: Record<string, string>;
  requestId: string;
  timestamp: string;
  duration: number;
}

// ============================================================================
// BASE API CLIENT
// ============================================================================

export abstract class BaseApiClient {
  protected config: ApiClientConfig;
  protected requestInterceptors: Array<(context: RequestContext) => RequestContext> = [];
  protected responseInterceptors: Array<(context: ResponseContext) => ResponseContext> = [];

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors() {
    // Request interceptor for authentication
    this.requestInterceptors.push((context) => {
      // Add authentication headers
      return context;
    });

    // Response interceptor for logging
    if (this.config.enableLogging) {
      this.responseInterceptors.push((context) => {
        //console.log(`[API] ${context.status} ${context.requestId} - ${context.duration}ms`);
        return context;
      });
    }
  }

  // ============================================================================
  // CORE HTTP METHODS
  // ============================================================================

  protected async makeRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    const { method, body, params, headers = {} } = options;
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    // Build URL
    const url = new URL(`${endpoint}`, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session found');
    }

    // Prepare request context
    const requestContext: RequestContext = {
      method,
      url: url.toString(),
      body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Request-ID': requestId,
        ...headers,
      },
      requestId,
      timestamp,
    };

    // Apply request interceptors
    const interceptedRequest = this.requestInterceptors.reduce(
      (context, interceptor) => interceptor(context),
      requestContext
    );

    // Make request with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(interceptedRequest.url, {
          method: interceptedRequest.method,
          headers: interceptedRequest.headers,
          body: interceptedRequest.body ? JSON.stringify(interceptedRequest.body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        const duration = Date.now() - startTime;
        const responseData = await response.json();

        // Prepare response context
        const responseContext: ResponseContext = {
          status: response.status,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries()),
          requestId,
          timestamp: new Date().toISOString(),
          duration,
        };

        // Apply response interceptors
        const interceptedResponse = this.responseInterceptors.reduce(
          (context, interceptor) => interceptor(context),
          responseContext
        );

        // Handle different response types
        if (!response.ok) {
          if (isApiError(responseData)) {
            throw new Error(responseData.error);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }

        // Return successful response
        return {
          success: true,
          data: interceptedResponse.data,
          timestamp: interceptedResponse.timestamp,
          requestId,
        };

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          break;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.config.retries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed after all retries');
  }

  // ============================================================================
  // INTERCEPTOR MANAGEMENT
  // ============================================================================

  addRequestInterceptor(interceptor: (context: RequestContext) => RequestContext) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (context: ResponseContext) => ResponseContext) {
    this.responseInterceptors.push(interceptor);
  }

  removeRequestInterceptor(interceptor: (context: RequestContext) => RequestContext) {
    const index = this.requestInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.requestInterceptors.splice(index, 1);
    }
  }

  removeResponseInterceptor(interceptor: (context: ResponseContext) => ResponseContext) {
    const index = this.responseInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.responseInterceptors.splice(index, 1);
    }
  }
} 