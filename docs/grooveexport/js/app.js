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
    const img = data.images && data.images[0] && data.images[0].url;
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
}

function tracksToCSV(tracks) {
  // Always include artwork URL column
  const header = ["Artist", "Title", "Album", "Date Added", "Artwork URL"];
  const rows = tracks.map(item => {
    const t = item.track || {};
    const artwork = (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || "";
    const cols = [
      (t.artists || []).map(a => a.name).join(", "),
      t.name || "",
      (t.album && t.album.name) || "",
      item.added_at ? item.added_at.slice(0, 10) : "",
      artwork
    ];
    return cols.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

// === UI HANDLERS ===
async function handleLoad() {
  errorEl.textContent = "";
  previewEl.textContent = "";
  previewEl.hidden = true;
  downloadBtn.style.display = "none";
  galleryEl.hidden = true;
  galleryEl.innerHTML = "";
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
    // CSV now always includes artwork URL column
    const csv = tracksToCSV(tracks);
    previewEl.textContent = csv;
    previewEl.hidden = false;
    downloadBtn.style.display = "";
    downloadBtn.onclick = () => {
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
    };
    // If user requested artwork, render thumbnails below the CSV preview
    if (includeArtwork && includeArtwork.checked) {
      const thumbs = [];
      for (const item of tracks) {
        const t = item.track || {};
        const img = (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || "";
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
    errorEl.textContent = e.message;
    statusEl.textContent = "";
    previewEl.hidden = true;
    galleryEl.hidden = true;
  }
}

// === INIT ===
loginBtn.onclick = login;
logoutBtn.onclick = logout;
loadBtn.onclick = handleLoad;
playlistInput.addEventListener("keydown", e => {
  if (e.key === "Enter") handleLoad();
});

// If clientId hasn't been changed from the placeholder, show immediate hint and disable login
if (!clientId || clientId === CLIENT_PLACEHOLDER) {
   statusEl.textContent = "Not configured: set clientId in the code.";
   errorEl.textContent = "Replace clientId = 'DIN_CLIENT_ID_HER' with your Spotify Client ID. Redirect URI must be registered exactly in the Spotify Dashboard.";
   // show copy button for easy redirect URI copy
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

handleAuthRedirect().then(checkLogin);
