// Environment variables configuration
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Tractive API configuration
  tractive: {
    email: process.env.TRACTIVE_EMAIL || '',
    password: process.env.TRACTIVE_PASSWORD || '',
    baseUrl: 'https://graph.tractive.com/3',
  },
  
  // Google Maps API configuration
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    enableGeocoding: process.env.GOOGLE_ENABLE_GEOCODING === 'true',
    enableDirections: process.env.GOOGLE_ENABLE_DIRECTIONS === 'true',
    enablePlaces: process.env.GOOGLE_ENABLE_PLACES === 'true',
    enableElevation: process.env.GOOGLE_ENABLE_ELEVATION === 'true',
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // Home base coordinates (configurable)
  homeBase: {
    lat: parseFloat(process.env.HOME_BASE_LAT || '0'),
    lng: parseFloat(process.env.HOME_BASE_LNG || '0'),
  },
};