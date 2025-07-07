// netlify/functions/spotify.js
const fetch = require("node-fetch");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const getAccessToken = async () => {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: REFRESH_TOKEN,
        }),
    });

    const data = await res.json();
    return data.access_token;
};

exports.handler = async function (event) {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const { action, id } = params;

    try {
        const token = await getAccessToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        // Handle POST actions
        if (method === "POST") {
            if (action === "stop") {
                await fetch("https://api.spotify.com/v1/me/player/pause", {
                    method: "PUT",
                    headers,
                });
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Playback stopped" }, null, 2),
                };
            }

            if (action === "play" && id) {
                await fetch("https://api.spotify.com/v1/me/player/play", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ uris: [`spotify:track:${id}`] }),
                });
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: `Playing track ${id}` }, null, 2),
                };
            }

            return { statusCode: 400, body: JSON.stringify({ error: "Invalid POST request" }) };
        }

        // Handle GET request
        const [nowRes, topRes, artistsRes] = await Promise.all([
            fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers }),
            fetch("https://api.spotify.com/v1/me/top/tracks?limit=10", { headers }),
            fetch("https://api.spotify.com/v1/me/following?type=artist&limit=10", { headers }),
        ]);

        const nowPlaying = await nowRes.json();
        const topTracks = await topRes.json();
        const followed = await artistsRes.json();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                {
                    nowPlaying: nowPlaying?.item || null,
                    topTracks:
                        topTracks?.items?.map((track) => ({
                            id: track.id,
                            name: track.name,
                            artists: track.artists.map((a) => a.name),
                        })) || [],
                    followedArtists: followed.artists.items.map((a) => ({
                        name: a.name,
                        followers: a.followers.total,
                    })),
                },
                null,
                2
            ),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Something went wrong." }, null, 2),
        };
    }
};
