import SpotifyWebApi from "spotify-web-api-node";

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
});

spotifyApi.setAccessToken(process.env.ACCESS_TOKEN);
spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);

export default spotifyApi;
