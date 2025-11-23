// API base URL - use same origin in production, or set via environment variable
// In dev mode, webpack dev server proxies /api to the backend server
// Use empty string for relative URLs (works with webpack proxy in dev, same origin in prod)
// If accessing on port 3000, API should be on same origin (port 3000) in production
// If accessing on port 8080, webpack proxy forwards to port 3001
export const API_BASE_URL = (() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }
  
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // If we're on localhost, check the port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Port 8080: webpack dev server - proxy handles /api requests to port 3001
    if (port === '8080') {
      return ''; // Relative URL, webpack proxy forwards to 3001
    }
    // Port 3000: Could be production (API on same origin) or dev (API on 3001)
    // In production mode, server serves both frontend and API on port 3000
    // Use relative URL - if API is on same origin it works, if not we'll get errors
    // But typically in production, API is on same origin
    if (port === '3000') {
      return ''; // Use same origin - works for production
    }
  }
  
  // Production or other hosts - use same origin
  // Empty string means same origin (works for production where API is on same port)
  if (port === '' || !port) {
    return ''; // Default port (80/443) or no port specified - use same origin
  }
  
  // Default: use relative URL (webpack proxy handles it in dev, same origin in prod)
  return '';
})();

