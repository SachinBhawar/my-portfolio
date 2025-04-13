import spotifyApi from "./spotifyClient.js";

export async function handler(event, context) {
    const trackId = event.queryStringParameters.trackId;
    const trackUri = `spotify:track:${trackId}`;

    try {
        await spotifyApi.play({ uris: [trackUri] });
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Playing track ${trackId}` }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
