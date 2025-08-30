export interface SdkResponse<T> {
  data: T;
  error?: string;
  [key: string]: any;
}

// JWT-related response structure
export interface JWTResponse {
  token: string;
  expiresIn?: number;
  [key: string]: any;
}

// Allows everything returned by useDescope()
export interface DescopeHookReturn {
  refresh: (token?: string, tryRefresh?: boolean) => Promise<SdkResponse<JWTResponse>>;
  logout: (token?: string) => Promise<SdkResponse<any>>;
  httpClient: any;
  [key: string]: any;
}

// ✅ Define your own User type instead of importing
export interface User {
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
  [key: string]: any; // in case Descope adds fields later
}
