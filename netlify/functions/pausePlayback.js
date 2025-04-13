import spotifyApi from "./spotifyClient.js";

export async function handler(event, context) {
    try {
        await spotifyApi.pause();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Playback paused." }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
