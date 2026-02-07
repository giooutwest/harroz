// Music Search Service
// Uses iTunes Search API (free, no auth required, CORS-friendly)

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
}

// Search using iTunes API (free, no auth required, CORS-friendly)
export const searchTracks = async (query: string): Promise<SpotifyTrack[]> => {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();

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
