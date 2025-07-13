class SpotifyIntegration {
    constructor() {
        this.apiBase = "/.netlify/functions/sportify";
        this.init();
    }

    async init() {
        if (window.location.pathname !== "/sportify") return;

        await this.checkAuth();
        await this.loadData();
    }

    async checkAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("code")) return; // Callback handled by function

        try {
            const response = await fetch(this.apiBase);
            if (response.status === 401) {
                window.location = `${this.apiBase}/auth`;
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        }
    }

    async loadData() {
        try {
            const response = await fetch(this.apiBase);
            if (!response.ok) throw new Error("Failed to load data");

            const data = await response.json();
            this.renderData(data);
        } catch (error) {
            console.error("Error loading Spotify data:", error);
        }
    }

    renderData(data) {
        // Clear previous content
        document.body.innerHTML = "";

        // Create JSON display
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(data, null, 2);
        document.body.appendChild(pre);

        // Add controls
        this.createControls(data);
    }

    createControls(data) {
        const controlsDiv = document.createElement("div");
        controlsDiv.className = "spotify-controls";

        if (data.now_playing) {
            const pauseBtn = document.createElement("button");
            pauseBtn.textContent = "⏸ Pause Current Song";
            pauseBtn.addEventListener("click", () => this.controlPlayback("pause"));
            controlsDiv.appendChild(pauseBtn);
        }

        data.top_tracks.forEach((track) => {
            const playBtn = document.createElement("button");
            playBtn.textContent = `▶ ${track.name} - ${track.artists.join(", ")}`;
            playBtn.addEventListener("click", () => this.controlPlayback("play", track.uri));
            controlsDiv.appendChild(playBtn);
        });

        document.body.appendChild(controlsDiv);
    }

    async controlPlayback(action, trackUri) {
        try {
            const response = await fetch(this.apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, track_uri: trackUri }),
            });

            if (response.ok) {
                await this.loadData(); // Refresh data
            }
        } catch (error) {
            console.error("Playback control failed:", error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new SpotifyIntegration();
});
