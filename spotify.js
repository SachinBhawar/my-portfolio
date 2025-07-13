class SpotifyClient {
    static API_BASE = "/.netlify/functions/spotify";

    static async init() {
        if (window.location.pathname !== "/spotify") return;

        try {
            await this.handleAuthFlow();
            const data = await this.fetchData();
            this.displayData(data);
        } catch (error) {
            console.error("Spotify integration error:", error);
            document.body.innerHTML = `<pre>Error: ${error.message}</pre>`;
        }
    }

    static async handleAuthFlow() {
        const params = new URLSearchParams(window.location.search);
        if (params.has("code")) return; // Callback being handled

        const response = await fetch(SpotifyClient.API_BASE);
        if (response.status === 401) {
            window.location = `${SpotifyClient.API_BASE}/auth`;
            throw new Error("Redirecting to Spotify login...");
        }
    }

    static async fetchData() {
        const response = await fetch(SpotifyClient.API_BASE);
        if (!response.ok) throw new Error("Failed to fetch Spotify data");
        return response.json();
    }

    static displayData({ nowPlaying, topTracks }) {
        const output = {
            nowPlaying: nowPlaying
                ? {
                      name: nowPlaying.name,
                      artists: nowPlaying.artists.map((a) => a.name),
                      album: nowPlaying.album.name,
                  }
                : null,
            topTracks: topTracks.map((track) => ({
                name: track.name,
                artists: track.artists.join(", "),
            })),
        };

        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(output, null, 2);
        document.body.appendChild(pre);

        this.createControls(nowPlaying, topTracks);
    }

    static createControls(nowPlaying, topTracks) {
        const controls = document.createElement("div");
        controls.className = "spotify-controls";

        if (nowPlaying) {
            const pauseBtn = document.createElement("button");
            pauseBtn.textContent = "⏸ Pause";
            pauseBtn.onclick = () => this.controlPlayback("pause");
            controls.appendChild(pauseBtn);
        }

        topTracks.forEach((track) => {
            const playBtn = document.createElement("button");
            playBtn.textContent = `▶ ${track.name}`;
            playBtn.onclick = () => this.controlPlayback("play", track.uri);
            controls.appendChild(playBtn);
        });

        document.body.appendChild(controls);
    }

    static async controlPlayback(action, trackUri) {
        try {
            await fetch(SpotifyClient.API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, trackUri }),
            });
            // Refresh data after control action
            const data = await this.fetchData();
            document.body.innerHTML = "";
            this.displayData(data);
        } catch (error) {
            console.error("Playback control failed:", error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => SpotifyClient.init());
