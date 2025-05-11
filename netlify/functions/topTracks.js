import spotifyApi from "./spotifyClient.js";

export async function handler(event, context) {
    try {
        const data = await spotifyApi.getMyTopTracks({ limit: 10 });
        return {
            statusCode: 200,
            body: JSON.stringify(data.body.items, null, 2),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
