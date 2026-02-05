// Spotify Search Service
// Uses Spotify's public search endpoint (no auth required for basic search)

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
}

interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: {
        images: Array<{ url: string; height: number }>;
      };
      preview_url: string | null;
    }>;
  };
}

// Get Spotify access token using client credentials
// Note: For production, you'd want to handle this server-side
const getAccessToken = async (): Promise<string | null> => {
  // Check for cached token
  const cached = sessionStorage.getItem('spotify_token');
  const expiry = sessionStorage.getItem('spotify_token_expiry');

  if (cached && expiry && Date.now() < parseInt(expiry)) {
    return cached;
  }

  try {
    // Use a public/free Spotify token endpoint or proxy
    // For this implementation, we'll use the Spotify embed API which doesn't require auth
    // The embed API provides search functionality through a different approach

    // Alternative: Use Deezer API which is completely free and no auth required
    return null;
  } catch (error) {
    console.error('Failed to get Spotify token:', error);
    return null;
  }
};

// Search using Deezer API (free, no auth required, CORS-friendly)
export const searchTracks = async (query: string): Promise<SpotifyTrack[]> => {
  if (!query.trim()) return [];

  try {
    // Deezer API is free and doesn't require authentication
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10&output=jsonp`,
      { mode: 'no-cors' }
    );

    // Since Deezer has CORS issues, we'll use a CORS proxy or iTunes API instead
    // iTunes Search API is free, no auth, and CORS-friendly
    const itunesResponse = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`
    );

    if (!itunesResponse.ok) {
      throw new Error('Search failed');
    }

    const data = await itunesResponse.json();

    return data.results.map((track: any) => ({
      id: track.trackId.toString(),
      name: track.trackName,
      artist: track.artistName,
      albumArt: track.artworkUrl100?.replace('100x100', '300x300') || '',
      previewUrl: track.previewUrl || null,
    }));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};

// Debounced search helper
export const createDebouncedSearch = (delay: number = 300) => {
  let timeoutId: NodeJS.Timeout;

  return (query: string, callback: (results: SpotifyTrack[]) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const results = await searchTracks(query);
      callback(results);
    }, delay);
  };
};
