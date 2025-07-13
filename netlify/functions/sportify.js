import axios from "axios";
import querystring from "querystring";

const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI = "https://sachinbhawar.netlify.app/callback",
} = process.env;

let accessToken = null;
let refreshToken = null;

const getAuthUrl = () => {
    const scopes = "user-read-currently-playing user-top-read user-modify-playback-state";
    return `https://accounts.spotify.com/authorize?${querystring.stringify({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: SPOTIFY_REDIRECT_URI,
    })}`;
};

const getTokens = async (code) => {
    const { data } = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            client_id: SPOTIFY_CLIENT_ID,
            client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );
    return data;
};

const refreshAccessToken = async () => {
    const { data } = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: SPOTIFY_CLIENT_ID,
            client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );
    return data.access_token;
};

const getSpotifyData = async () => {
    const [nowPlaying, topTracks] = await Promise.all([
        axios
            .get("https://api.spotify.com/v1/me/player/currently-playing", {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            .catch(() => ({ data: null })),
        axios.get("https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term", {
            headers: { Authorization: `Bearer ${accessToken}` },
        }),
    ]);

    return {
        now_playing: nowPlaying.data?.item || null,
        top_tracks: topTracks.data.items.map((track) => ({
            id: track.id,
            name: track.name,
            artists: track.artists.map((artist) => artist.name),
            album: track.album.name,
            duration_ms: track.duration_ms,
            uri: track.uri,
            image: track.album.images[0]?.url,
        })),
    };
};

const handlePlayback = async (action, trackUri) => {
    const endpoint =
        action === "pause"
            ? "https://api.spotify.com/v1/me/player/pause"
            : "https://api.spotify.com/v1/me/player/play";

    await axios.put(endpoint, action === "play" ? { uris: [trackUri] } : {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
};

export const handler = async (event) => {
    const path = event.path.replace("/.netlify/functions/spotify", "");

    if (path === "/auth") {
        return {
            statusCode: 302,
            headers: { Location: getAuthUrl() },
        };
    }

    if (path === "/callback") {
        try {
            const { code } = event.queryStringParameters;
            const tokens = await getTokens(code);
            accessToken = tokens.access_token;
            refreshToken = tokens.refresh_token;

            return {
                statusCode: 302,
                headers: { Location: "/spotify" },
            };
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Authentication failed" }),
            };
        }
    }

    //  authentication Check
    if (!accessToken) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Not authenticated" }),
        };
    }

    // Handle playback control
    if (event.httpMethod === "POST") {
        try {
            const { action, track_uri } = JSON.parse(event.body);
            await handlePlayback(action, track_uri);
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid request" }),
            };
        }
    }

    // Main data endpoint
    try {
        const spotifyData = await getSpotifyData();
        return {
            statusCode: 200,
            body: JSON.stringify(spotifyData, null, 2),
        };
    } catch (error) {
        // Token refresh logic
        if (error.response?.status === 401 && refreshToken) {
            try {
                accessToken = await refreshAccessToken();
                const spotifyData = await getSpotifyData();
                return {
                    statusCode: 200,
                    body: JSON.stringify(spotifyData, null, 2),
                };
            } catch (refreshError) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Session expired. Please re-authenticate." }),
                };
            }
        }

        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
