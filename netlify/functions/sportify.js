import axios from "axios";
import querystring from "querystring";

// Configuration
const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    MYURL,
    SPOTIFY_REDIRECT_URI = `${MYURL}/.netlify/functions/spotify/callback`,
} = process.env;

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_AUTH_BASE = "https://accounts.spotify.com";

// Token storage (in-memory for demo - consider Netlify KV store for production)
const tokenStore = new Map();

const getAuthUrl = (state) => {
    const params = {
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: "user-read-currently-playing user-top-read user-modify-playback-state",
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state,
    };
    return `${SPOTIFY_AUTH_BASE}/authorize?${querystring.stringify(params)}`;
};

const exchangeCodeForToken = async (code) => {
    const { data } = await axios.post(
        `${SPOTIFY_AUTH_BASE}/api/token`,
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

const refreshToken = async (refreshToken) => {
    const { data } = await axios.post(
        `${SPOTIFY_AUTH_BASE}/api/token`,
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

const fetchWithToken = async (token, url, options = {}) => {
    try {
        const { data } = await axios({
            ...options,
            url: `${SPOTIFY_API_BASE}${url}`,
            headers: {
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

const getSpotifyData = async (token) => {
    const [nowPlaying, topTracks] = await Promise.all([
        fetchWithToken(token, "/me/player/currently-playing"),
        fetchWithToken(token, "/me/top/tracks?limit=10&time_range=short_term"),
    ]);

    return {
        nowPlaying: nowPlaying.data?.item || null,
        topTracks:
            topTracks.data?.items?.map((track) => ({
                id: track.id,
                name: track.name,
                artists: track.artists.map((artist) => artist.name),
                album: track.album.name,
                uri: track.uri,
                image: track.album.images[0]?.url,
            })) || [],
    };
};

const handlePlayback = async (token, action, trackUri) => {
    const endpoint = action === "pause" ? "/me/player/pause" : "/me/player/play";
    const data = action === "play" ? { uris: [trackUri] } : null;

    await fetchWithToken(token, endpoint, {
        method: "PUT",
        data,
    });
};

export const handler = async (event) => {
    const { path, httpMethod, queryStringParameters, body } = event;
    const route = path.replace("/.netlify/functions/spotify", "");
    const state = Math.random().toString(36).substring(2, 15);

    // Auth redirect
    if (route === "/auth") {
        return {
            statusCode: 302,
            headers: {
                Location: getAuthUrl(state),
            },
        };
    }

    // Callback handler
    if (route === "/callback") {
        try {
            const { code, state } = queryStringParameters;
            const tokens = await exchangeCodeForToken(code);
            tokenStore.set(state, tokens);

            return {
                statusCode: 302,
                headers: {
                    Location: "/spotify",
                    "Set-Cookie": `spotify_state=${state}; HttpOnly; Path=/`,
                },
            };
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Authentication failed" }),
            };
        }
    }

    // Get state from cookie
    const stateCookie = event.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("spotify_state="))
        ?.split("=")[1];

    if (!stateCookie || !tokenStore.has(stateCookie)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Not authenticated" }),
        };
    }

    let { access_token, refresh_token } = tokenStore.get(stateCookie);

    // Handle playback control
    if (httpMethod === "POST") {
        try {
            const { action, trackUri } = JSON.parse(body);
            await handlePlayback(access_token, action, trackUri);
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

    // Main endpoint - get Spotify data
    try {
        const spotifyData = await getSpotifyData(access_token);
        return {
            statusCode: 200,
            body: JSON.stringify(spotifyData, null, 2),
        };
    } catch (error) {
        // Token refresh if expired
        if (error.response?.status === 401 && refresh_token) {
            try {
                access_token = await refreshToken(refresh_token);
                tokenStore.set(stateCookie, { access_token, refresh_token });
                const spotifyData = await getSpotifyData(access_token);
                return {
                    statusCode: 200,
                    body: JSON.stringify(spotifyData, null, 2),
                };
            } catch (refreshError) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: "Session expired" }),
                };
            }
        }

        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
