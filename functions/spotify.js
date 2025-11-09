import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

// Helper function for JSON responses
const jsonResponse = (res, statusCode, data) => {
    return {
        statusCode,
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify(data, null, 2),
    };
};

// Function to get access token using refresh token
const getAccessToken = async () => {
    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: REFRESH_TOKEN,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error);
        throw error;
    }
};

// function to make authenticated requests to Spotify API
const makeSpotifyRequest = async (accessToken, endpoint, method = "GET", data = null) => {
    const config = {
        method,
        url: `https://api.spotify.com/v1/${endpoint}`,
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    if (data) {
        config.data = data;
    }

    const response = await axios(config);
    return response.data;
};

const handleTopTracks = async (accessToken) => {
    const data = await makeSpotifyRequest(accessToken, "me/top/tracks?limit=10&time_range=short_term");

    return data.items.map((track) => ({
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        album: track.album.name,
        albumImageUrl: track.album.images[0]?.url || null,
        spotifyUrl: track.external_urls.spotify,
        previewUrl: track.preview_url,
        albumImageUrl: track.album.images[0]?.url || null,
    }));
};

// funtion to handle now playing track
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
            },
        };
    } catch (error) {
        console.error("Error fetching now playing track:", error);
        return {
            now_playing: {
                isPlaying: false,
                message: "unable to fetch currently playing track.",
            },
        };
    }
};

// function to get followed artists
const handleFollowedArtists = async (accessToken) => {
    const data = await makeSpotifyRequest(accessToken, "me/following?type=artist&limit=10");
    return data.artists.items.map((artist) => ({
        name: artist.name,
        spotifyUrl: artist.external_urls.spotify,
        imageUrl: artist.images[0]?.url || null,
    }));
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
        handleTopTracks(accessToken),
        handleNowPlaying(accessToken),
        handleFollowedArtists(accessToken),
    ]);

    return {
        top_tracks: topTracks,
        now_playing: nowPlaying.now_playing,
        followed_artists: followedArtists,
    };
};

export const handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return jsonResponse(null, 200, {});
    }

    const path = event.path.replace("/spotify", "").replace("/.netlify/functions/spotify", "");
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
                data = await handlePlay(accessToken, event);
                break;
            case "/pause":
                data = await handlePause(accessToken);
                break;
            case "/all":
                data = await handleAllData(accessToken);
                break;
            default:
                return jsonResponse(null, 404, { error: "Endpoint not found" });
        }
    } catch (error) {
        console.error("Error in handler:", error);
        return jsonResponse(null, 500, { error: "Internal Server Error" });
    }

    return jsonResponse(null, 200, data);
};
