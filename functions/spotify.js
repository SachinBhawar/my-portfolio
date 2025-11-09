// functions/spotify.js
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

// Helper function for JSON responses
const jsonResponse = (statusCode, data) => {
    return {
        statusCode,
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify(data, null, 2),
    };
};

// Function to get access token using refresh token
const getAccessToken = async () => {
    try {
        console.log("Fetching access token...");

        if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
            throw new Error("Missing required environment variables");
        }

        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: REFRESH_TOKEN,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Spotify token error:", errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error);
        throw error;
    }
};

// function to make authenticated requests to Spotify API
const makeSpotifyRequest = async (accessToken, endpoint, method = "GET", bodyData = null) => {
    const config = {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    };

    if (bodyData && (method === "PUT" || method === "POST")) {
        config.body = JSON.stringify(bodyData);
    }

    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, config);

    if (!response.ok) {
        if (response.status === 204) {
            return null;
        }

        if (response.status === 401) {
            throw new Error("Unauthorized - token may be invalid");
        }

        const errorText = await response.text();
        console.error(`Spotify API error (${response.status}):`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For responses with no content, return null
    if (response.status === 204) {
        return null;
    }

    return await response.json();
};

const handleTopTracks = async (accessToken) => {
    try {
        const data = await makeSpotifyRequest(accessToken, "me/top/tracks?limit=10&time_range=short_term");

        if (!data || !data.items) {
            throw new Error("No top tracks data received");
        }

        if (data.items.length === 0) {
            return { message: "No top tracks available." };
        }
        return data.items.map((track) => ({
            title: track.name,
            artist: track.artists.map((artist) => artist.name).join(", "),
            album: track.album.name,
            albumImageUrl: track.album.images[0]?.url || null,
            spotifyUrl: track.external_urls.spotify,
            previewUrl: track.preview_url,
        }));
    } catch (error) {
        console.error("Error in handleTopTracks:", error);
        throw error;
    }
};

// function to handle now playing track
const handleNowPlaying = async (accessToken) => {
    try {
        const data = await makeSpotifyRequest(accessToken, "me/player/currently-playing");

        if (!data || !data.item) {
            return {
                now_playing: {
                    isPlaying: false,
                    message: "No track is currently playing.",
                },
            };
        }

        return {
            now_playing: {
                isPlaying: data.is_playing,
                name: data.item.name,
                artists: data.item.artists.map((artist) => artist.name).join(", "),
                album: data.item.album.name,
                albumImageUrl: data.item.album.images[0]?.url || null,
            },
        };
    } catch (error) {
        console.error("Error fetching now playing track:", error);
        return {
            now_playing: {
                isPlaying: false,
                message: "Unable to fetch currently playing track.",
            },
        };
    }
};

// function to get followed artists
const handleFollowedArtists = async (accessToken) => {
    try {
        const data = await makeSpotifyRequest(accessToken, "me/following?type=artist&limit=10");

        if (!data || !data.artists || !data.artists.items) {
            throw new Error("No followed artists data received");
        }

        return data.artists.items.map((artist) => ({
            name: artist.name,
            spotifyUrl: artist.external_urls.spotify,
            imageUrl: artist.images[0]?.url || null,
        }));
    } catch (error) {
        console.error("Error in handleFollowedArtists:", error);
        throw error;
    }
};

// function to play track
const handlePlay = async (accessToken, event) => {
    let trackUri = null;
    if (event.body) {
        const body = JSON.parse(event.body);
        trackUri = body.trackUri;
    }

    await makeSpotifyRequest(accessToken, "me/player/play", "PUT", trackUri ? { uris: [trackUri] } : null);

    return { message: "Playback started" };
};

// function to pause track
const handlePause = async (accessToken) => {
    await makeSpotifyRequest(accessToken, "me/player/pause", "PUT");
    return { message: "Playback paused" };
};

// function for all data
const handleAllData = async (accessToken) => {
    const [topTracks, nowPlaying, followedArtists] = await Promise.all([
        handleTopTracks(accessToken).catch((error) => {
            console.error("Error fetching top tracks:", error);
            return null;
        }),
        handleNowPlaying(accessToken),
        handleFollowedArtists(accessToken).catch((error) => {
            console.error("Error fetching followed artists:", error);
            return null;
        }),
    ]);

    return {
        top_tracks: topTracks,
        now_playing: nowPlaying.now_playing,
        followed_artists: followedArtists,
    };
};

export const handler = async (event) => {
    console.log("Function called with path:", event.path);
    console.log("HTTP Method:", event.httpMethod);

    if (event.httpMethod === "OPTIONS") {
        return jsonResponse(200, {});
    }

    const path = event.path.replace("/spotify", "").replace("/.netlify/functions/spotify", "");
    console.log("Processing path:", path);

    try {
        const accessToken = await getAccessToken();
        let data;

        switch (path) {
            case "/top-tracks":
                data = await handleTopTracks(accessToken);
                break;
            case "/now-playing":
                data = await handleNowPlaying(accessToken);
                break;
            case "/followed-artists":
                data = await handleFollowedArtists(accessToken);
                break;
            case "/play":
                if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
                    return jsonResponse(405, { error: "Method not allowed" });
                }
                data = await handlePlay(accessToken, event);
                break;
            case "/pause":
                if (event.httpMethod !== "PUT") {
                    return jsonResponse(405, { error: "Method not allowed" });
                }
                data = await handlePause(accessToken);
                break;
            case "/all":
                data = await handleAllData(accessToken);
                break;
            default:
                return jsonResponse(404, { error: "Endpoint not found" });
        }

        return jsonResponse(200, data);
    } catch (error) {
        console.error("Error in handler:", error);
        return jsonResponse(500, {
            error: "Internal Server Error",
            message: error.message,
        });
    }
};
