import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export const handler = async (event) => {
    const code = event.queryStringParameters?.code;

    if (!code) {
        return { statusCode: 400, body: "Missing code parameter" };
    }

    const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });

    const authHeader = `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`;

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};



https://accounts.spotify.com/authorize?response_type=code&client_id=cb62d129a8c343338f2a448e8406ebd3&scope=user-follow-read%20user-read-playback-state%20user-modify-playback-state&redirect_uri=https://sachinbhawar.netlify.app/&state=xyz