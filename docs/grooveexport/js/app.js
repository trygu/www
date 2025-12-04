// === CONFIG ===
const clientId = "45170802e4e54b1188d615d6f5dfdabe";
const redirectUri = window.location.origin + window.location.pathname;
const scopes = [
  "playlist-read-private",
  "playlist-read-collaborative"
].join(" ");
const authUrl = "https://accounts.spotify.com/authorize";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loadBtn = document.getElementById("loadBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const previewEl = document.getElementById("preview");
const playlistInput = document.getElementById("playlistInput");
const copyRedirectBtn = document.getElementById("copyRedirectBtn");
const CLIENT_PLACEHOLDER = "DIN_CLIENT_ID_HER";

// New UI elements
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userInfo = document.getElementById("userInfo");
const includeArtwork = document.getElementById("includeArtwork");
const galleryEl = document.getElementById("gallery");
const showTableView = document.getElementById("showTableView");
const tableView = document.getElementById("tableView");
const tracksTableBody = document.querySelector("#tracksTable tbody");

// === PKCE helper functions ===
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}
function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}
async function generateCodeChallenge(codeVerifier) {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

// === AUTH ===
function getStoredToken() {
  try {
    const t = JSON.parse(localStorage.getItem("spotify_token") || "null");
    if (!t) return null;
    if (t.expires_at && Date.now() > t.expires_at) return null;
    return t;
  } catch { return null; }
}
function storeToken(token, expires_in) {
  localStorage.setItem("spotify_token", JSON.stringify({
    access_token: token,
    expires_at: Date.now() + (expires_in * 1000) - 60000 // 1 min margin
  }));
}
function clearToken() {
  localStorage.removeItem("spotify_token");
}

async function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") && localStorage.getItem("pkce_verifier")) {
    statusEl.textContent = "Completing login …";
    try {
      const code = params.get("code");
      const codeVerifier = localStorage.getItem("pkce_verifier");
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
      });
      const resp = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      if (resp.ok && data.access_token) {
        storeToken(data.access_token, data.expires_in);
        localStorage.removeItem("pkce_verifier");
        window.location.replace(redirectUri);
      } else {
        const msg = data.error_description || data.error || `HTTP ${resp.status}: ${text}`;
        throw new Error(msg);
      }
    } catch (e) {
      errorEl.textContent = "Login failed: " + e.message;
      if (/invalid_client/i.test(e.message) || /client/i.test(e.message)) {
        errorEl.textContent += " — Check that clientId is correct and that the Redirect URI (exact) is registered in the Spotify Dashboard.";
      }
      clearToken();
    }
  }
}

async function checkLogin() {
  const token = getStoredToken();
  if (token) {
    statusEl.textContent = "Logged in — expires: " + formatExpiry(token.expires_at);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    // show user profile (avatar/name)
    fetchUserProfile(token.access_token);
    return true;
  } else {
    statusEl.textContent = "Not logged in.";
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
    return false;
  }
}

function formatExpiry(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

function logout() {
  clearToken();
  statusEl.textContent = "Signed out.";
  loginBtn.style.display = "";
  logoutBtn.style.display = "none";
  previewEl.textContent = "";
  downloadBtn.style.display = "none";
  clearUserUI();
}

async function login() {
  if (!clientId || clientId === CLIENT_PLACEHOLDER) {
    errorEl.textContent = "Invalid clientId. Replace clientId in the code with your app's Client ID and ensure the Redirect URI matches exactly in the Spotify Dashboard.";
    statusEl.textContent = "Configure clientId first.";
    return;
  }
  try {
    loginBtn.disabled = true;
    statusEl.textContent = "Preparing login …";
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem("pkce_verifier", verifier);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge
    });
    // Navigate to Spotify auth
    window.location = `${authUrl}?${params}`;
  } catch (err) {
    errorEl.textContent = "Could not start login: " + (err.message || err);
    loginBtn.disabled = false;
  }
}

// === SPOTIFY API ===
function extractPlaylistId(input) {
  const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)(\?|$)/);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.match(/^([a-zA-Z0-9]{22,})$/);
  if (idMatch) return idMatch[1];
  return null;
}

async function fetchPlaylistTracks(token, playlistId) {
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  let items = [];
  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error("Could not fetch playlist");
    const data = await resp.json();
    items = items.concat(data.items);
    url = data.next;
  }
  return items;
}

// Fetch and display the current user's profile (avatar + display name)
async function fetchUserProfile(token) {
  try {
    const resp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const img = data.images?.[0]?.url;
    if (img) {
      userAvatar.src = img;
      userAvatar.alt = data.display_name ? `${data.display_name} avatar` : "User avatar";
      userInfo.style.display = "";
      userInfo.setAttribute("aria-hidden", "false");
    } else {
      userInfo.style.display = "";
      userInfo.setAttribute("aria-hidden", "false");
    }
    userName.textContent = data.display_name || data.id || "";
  } catch {
    /* ignore profile errors — non-critical */
  }
}

// Clear user UI on logout
function clearUserUI() {
  userAvatar.src = "";
  userName.textContent = "";
  userInfo.style.display = "none";
  galleryEl.hidden = true;
  galleryEl.innerHTML = "";
  clearTable();
  tableView.hidden = true;
  previewEl.hidden = true;
}

// render HTML table of tracks
function clearTable() {
  if (tracksTableBody) tracksTableBody.innerHTML = "";
}
function renderTable(tracks) {
  if (!tracksTableBody) return;
  clearTable();
  for (const item of tracks) {
    const t = item.track || {};
    const tr = document.createElement("tr");

    // Artwork cell — choose largest image defensively
    let artworkUrl = "";
    const imgs = t.album?.images;
    if (Array.isArray(imgs) && imgs.length) {
      const best = imgs.reduce((bestSoFar, img) => {
        if (!bestSoFar) return img;
        const bestW = bestSoFar.width || 0;
        const curW = img.width || 0;
        return curW > bestW ? img : bestSoFar;
      }, null);
      artworkUrl = best?.url || "";
    }
    const tdArt = document.createElement("td");
    if (artworkUrl) {
      const img = document.createElement("img");
      img.src = artworkUrl;
      img.className = "thumb-sm";
      img.alt = (t.name ? `${t.name} artwork` : "Artwork");
      tdArt.appendChild(img);
    } else {
      tdArt.textContent = "";
    }

    // Artist
    const tdArtist = document.createElement("td");
    tdArtist.textContent = (t.artists || []).map(a => a.name).join(", ");

    // Title (link to Spotify if available)
    const tdTitle = document.createElement("td");
    if (t.external_urls?.spotify) {
      const a = document.createElement("a");
      a.href = t.external_urls.spotify;
      a.textContent = t.name || "";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      tdTitle.appendChild(a);
    } else {
      tdTitle.textContent = t.name || "";
    }

    // Album
    const tdAlbum = document.createElement("td");
    tdAlbum.textContent = t.album?.name || "";

    // Date added
    const tdDate = document.createElement("td");
    tdDate.textContent = item.added_at ? item.added_at.slice(0,10) : "";

    tr.appendChild(tdArt);
    tr.appendChild(tdArtist);
    tr.appendChild(tdTitle);
    tr.appendChild(tdAlbum);
    tr.appendChild(tdDate);

    tracksTableBody.appendChild(tr);
  }
}

// --- Restored: CSV generation, UI handlers, init ---

function tracksToCSV(tracks) {
  // Always include artwork URL column (select largest available image)
  const header = ["Artist", "Title", "Album", "Date Added", "Artwork URL"];
  const rows = tracks.map(item => {
    const t = item.track || {};
    let artwork = "";
    const imgs = t.album?.images;
    if (Array.isArray(imgs) && imgs.length) {
      const best = imgs.reduce((bestSoFar, img) => {
        if (!bestSoFar) return img;
        const bestW = bestSoFar.width || 0;
        const curW = img.width || 0;
        return curW > bestW ? img : bestSoFar;
      }, null);
      artwork = best?.url || "";
    }
    const cols = [
      (t.artists || []).map(a => a.name).join(", "),
      t.name || "",
      t.album?.name || "",
      item.added_at ? item.added_at.slice(0, 10) : "",
      artwork
    ];
    return cols.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

// UI: load playlist -> fetch tracks, render CSV/table/gallery
async function handleLoad() {
  errorEl.textContent = "";
  previewEl.textContent = "";
  previewEl.hidden = true;
  downloadBtn.style.display = "none";
  galleryEl.hidden = true;
  galleryEl.innerHTML = "";
  tableView.hidden = true;
  clearTable();

  const input = playlistInput.value.trim();
  const playlistId = extractPlaylistId(input);
  if (!playlistId) {
    errorEl.textContent = "Invalid playlist URL or ID.";
    return;
  }
  const tokenObj = getStoredToken();
  if (!tokenObj) {
    errorEl.textContent = "You must sign in first.";
    return;
  }
  statusEl.textContent = "Fetching playlist …";
  try {
    const tracks = await fetchPlaylistTracks(tokenObj.access_token, playlistId);
    if (!tracks.length) throw new Error("No tracks found.");

    const csv = tracksToCSV(tracks);

    // Show table view if enabled; otherwise show CSV preview
    if (showTableView?.checked) {
      renderTable(tracks);
      tableView.hidden = false;
      previewEl.hidden = true;
    } else {
      previewEl.textContent = csv;
      previewEl.hidden = false;
    }

    downloadBtn.style.display = "";
    downloadBtn.onclick = () => {
      try {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spotify-playlist-${playlistId}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        console.error("Download failed:", err);
      }
    };

    // If user requested artwork thumbnails, render them in gallery
    if (includeArtwork?.checked) {
      const thumbs = [];
      for (const item of tracks) {
        const t = item.track || {};
        const img = t.album?.images?.[0]?.url || "";
        if (img) {
          const el = document.createElement("div");
          const imgEl = document.createElement("img");
          imgEl.src = img;
          imgEl.className = "thumb";
          imgEl.alt = (t.name ? `${t.name} artwork` : "Artwork");
          el.appendChild(imgEl);
          thumbs.push(el);
        }
      }
      if (thumbs.length) {
        galleryEl.innerHTML = "";
        for (const e of thumbs) galleryEl.appendChild(e);
        galleryEl.hidden = false;
      }
    }

    statusEl.textContent = "Ready!";
  } catch (e) {
    console.error(e);
    errorEl.textContent = e.message || String(e);
    statusEl.textContent = "";
    previewEl.hidden = true;
    galleryEl.hidden = true;
    tableView.hidden = true;
  }
}

// INIT bindings
loginBtn.onclick = login;
logoutBtn.onclick = logout;
loadBtn.onclick = handleLoad;
playlistInput.addEventListener("keydown", e => {
  if (e.key === "Enter") handleLoad();
});

// clientId placeholder helper (show redirect copy + disable login if not set)
if (!clientId || clientId === CLIENT_PLACEHOLDER) {
  statusEl.textContent = "Not configured: set clientId in the code.";
  errorEl.textContent = "Replace clientId = 'DIN_CLIENT_ID_HER' with your Spotify Client ID. Redirect URI must be registered exactly in the Spotify Dashboard.";
  copyRedirectBtn.style.display = "";
  loginBtn.disabled = true;
  copyRedirectBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      copyRedirectBtn.textContent = "Copied!";
      setTimeout(() => copyRedirectBtn.textContent = "Copy redirect URI", 1400);
    } catch {
      errorEl.textContent = "Could not copy redirect URI to clipboard.";
    }
  };
}

// Global error handlers — surface errors in the UI so app doesn't silently hang
window.addEventListener("error", (ev) => {
  const err = ev.error || ev.message || "Unknown error";
  console.error("Window error:", err, ev);
  statusEl.textContent = "An error occurred";
  errorEl.textContent = (ev.error && ev.error.message) || ev.message || String(err);
  loginBtn.disabled = false;
});
window.addEventListener("unhandledrejection", (ev) => {
  console.error("Unhandled rejection:", ev.reason);
  statusEl.textContent = "An error occurred";
  errorEl.textContent = ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason);
  loginBtn.disabled = false;
});

// Init sequence: attempt to handle auth redirect, then check login state.
// If anything throws, show the error and re-enable the login button so the user can retry.
(async function init() {
  try {
    statusEl.textContent = "Checking login …";
    // handleAuthRedirect may redirect the page; if it returns, continue
    await handleAuthRedirect();
    const logged = await checkLogin();
    if (!logged) {
      statusEl.textContent = "Not logged in.";
      loginBtn.disabled = false;
    } else {
      loginBtn.disabled = false; // keep it enabled if you want to re-login
    }
  } catch (err) {
    console.error("Initialization error:", err);
    statusEl.textContent = "Initialization error";
    errorEl.textContent = err && err.message ? err.message : String(err);
    loginBtn.disabled = false;
  }
})();
