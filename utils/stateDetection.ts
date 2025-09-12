// State detection utility for geofence tracking
interface StateInfo {
  state: string;
  country: string;
  abbreviation?: string;
}

// US State boundaries (simplified centers for quick detection)
const US_STATES = [
  { name: 'Alabama', abbr: 'AL', lat: 32.806671, lng: -86.791130 },
  { name: 'Alaska', abbr: 'AK', lat: 61.370716, lng: -152.404419 },
  { name: 'Arizona', abbr: 'AZ', lat: 33.729759, lng: -111.431221 },
  { name: 'Arkansas', abbr: 'AR', lat: 34.969704, lng: -92.373123 },
  { name: 'California', abbr: 'CA', lat: 36.116203, lng: -119.681564 },
  { name: 'Colorado', abbr: 'CO', lat: 39.059811, lng: -105.311104 },
  { name: 'Connecticut', abbr: 'CT', lat: 41.597782, lng: -72.755371 },
  { name: 'Delaware', abbr: 'DE', lat: 39.318523, lng: -75.507141 },
  { name: 'Florida', abbr: 'FL', lat: 27.766279, lng: -81.686783 },
  { name: 'Georgia', abbr: 'GA', lat: 33.040619, lng: -83.643074 },
  { name: 'Hawaii', abbr: 'HI', lat: 21.094318, lng: -157.498337 },
  { name: 'Idaho', abbr: 'ID', lat: 44.240459, lng: -114.478828 },
  { name: 'Illinois', abbr: 'IL', lat: 40.349457, lng: -88.986137 },
  { name: 'Indiana', abbr: 'IN', lat: 39.849426, lng: -86.258278 },
  { name: 'Iowa', abbr: 'IA', lat: 42.011539, lng: -93.210526 },
  { name: 'Kansas', abbr: 'KS', lat: 38.526600, lng: -96.726486 },
  { name: 'Kentucky', abbr: 'KY', lat: 37.668140, lng: -84.670067 },
  { name: 'Louisiana', abbr: 'LA', lat: 31.169546, lng: -91.867805 },
  { name: 'Maine', abbr: 'ME', lat: 44.693947, lng: -69.381927 },
  { name: 'Maryland', abbr: 'MD', lat: 39.063946, lng: -76.802101 },
  { name: 'Massachusetts', abbr: 'MA', lat: 42.230171, lng: -71.530106 },
  { name: 'Michigan', abbr: 'MI', lat: 43.326618, lng: -84.536095 },
  { name: 'Minnesota', abbr: 'MN', lat: 45.694454, lng: -93.900192 },
  { name: 'Mississippi', abbr: 'MS', lat: 32.741646, lng: -89.678696 },
  { name: 'Missouri', abbr: 'MO', lat: 38.456085, lng: -92.288368 },
  { name: 'Montana', abbr: 'MT', lat: 47.328055, lng: -109.745052 },
  { name: 'Nebraska', abbr: 'NE', lat: 41.125370, lng: -98.268082 },
  { name: 'Nevada', abbr: 'NV', lat: 38.313515, lng: -117.055374 },
  { name: 'New Hampshire', abbr: 'NH', lat: 43.452492, lng: -71.563896 },
  { name: 'New Jersey', abbr: 'NJ', lat: 40.298904, lng: -74.521011 },
  { name: 'New Mexico', abbr: 'NM', lat: 34.840515, lng: -106.248482 },
  { name: 'New York', abbr: 'NY', lat: 42.165726, lng: -74.948051 },
  { name: 'North Carolina', abbr: 'NC', lat: 35.630066, lng: -79.806419 },
  { name: 'North Dakota', abbr: 'ND', lat: 47.528912, lng: -99.784012 },
  { name: 'Ohio', abbr: 'OH', lat: 40.388783, lng: -82.764915 },
  { name: 'Oklahoma', abbr: 'OK', lat: 35.565342, lng: -96.928917 },
  { name: 'Oregon', abbr: 'OR', lat: 44.572021, lng: -122.070938 },
  { name: 'Pennsylvania', abbr: 'PA', lat: 40.590752, lng: -77.209755 },
  { name: 'Rhode Island', abbr: 'RI', lat: 41.680893, lng: -71.511780 },
  { name: 'South Carolina', abbr: 'SC', lat: 33.856892, lng: -80.945007 },
  { name: 'South Dakota', abbr: 'SD', lat: 44.299782, lng: -99.438828 },
  { name: 'Tennessee', abbr: 'TN', lat: 35.747845, lng: -86.692345 },
  { name: 'Texas', abbr: 'TX', lat: 31.054487, lng: -97.563461 },
  { name: 'Utah', abbr: 'UT', lat: 40.150032, lng: -111.862434 },
  { name: 'Vermont', abbr: 'VT', lat: 44.045876, lng: -72.710686 },
  { name: 'Virginia', abbr: 'VA', lat: 37.769337, lng: -78.169968 },
  { name: 'Washington', abbr: 'WA', lat: 47.400902, lng: -121.490494 },
  { name: 'West Virginia', abbr: 'WV', lat: 38.491226, lng: -80.954570 },
  { name: 'Wisconsin', abbr: 'WI', lat: 44.268543, lng: -89.616508 },
  { name: 'Wyoming', abbr: 'WY', lat: 42.755966, lng: -107.302490 }
];

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Detect state from coordinates (simplified approach using nearest state center)
export function detectStateFromCoordinates(latitude: number, longitude: number): StateInfo {
  // Check if coordinates are roughly in US bounds
  if (latitude >= 24.396308 && latitude <= 71.538800 && 
      longitude >= -179.148909 && longitude <= -66.885444) {
    
    let nearestState = US_STATES[0];
    let minDistance = calculateDistance(latitude, longitude, nearestState.lat, nearestState.lng);
    
    for (const state of US_STATES) {
      const distance = calculateDistance(latitude, longitude, state.lat, state.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestState = state;
      }
    }
    
    return {
      state: nearestState.name,
      country: 'United States',
      abbreviation: nearestState.abbr
    };
  }
  
  // For international locations, return country based on rough geographic regions
  if (latitude >= 49.189787 && latitude <= 83.162102 && longitude >= -141.003004 && longitude <= -52.636291) {
    return { state: 'Unknown Province', country: 'Canada' };
  }
  
  if (latitude >= 14.532 && latitude <= 32.718 && longitude >= -118.404 && longitude <= -86.702) {
    return { state: 'Unknown State', country: 'Mexico' };
  }
  
  // Default for other international locations
  return { state: 'Unknown Region', country: 'International' };
}

// Get state display text for UI
export function getStateDisplayText(state: string | null, country: string | null): string {
  if (!state && !country) return 'Unknown Location';
  if (!state) return country || 'Unknown Location';
  if (!country) return state;
  
  if (country === 'United States') {
    return state;
  }
  
  return `${state}, ${country}`;
}

// Get state icon for display
export function getStateIcon(country: string | null): string {
  switch (country) {
    case 'United States':
      return '🇺🇸';
    case 'Canada':
      return '🇨🇦';
    case 'Mexico':
      return '🇲🇽';
    default:
      return '🌍';
  }
}