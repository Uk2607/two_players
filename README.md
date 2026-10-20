# Two Players (Local WiFi Multiplayer Web App)

A lightweight, real-time multiplayer web application designed to be played seamlessly between two players connected to the same local WiFi network or hotspot.

---

## Features

- **Local WiFi Multiplayer**: Play with anyone on your shared Wi-Fi network with zero external cloud dependencies.
- **Player Matchmaking**: Choose a nickname, view active players in the lobby, and send/accept real-time challenges.
- **Game Selection Cards**: Interactive card grid to choose from classic and tactical 2-player games:
  - ✕○ **Tic Tac Toe** (*Classic 3×3 showdown*)
  - ✊ **Rock Paper Scissors** (*Best of 5 rounds*)
  - 🔴 **Connect Four** (*Grid strategy*)
  - 🃏 **Memory Match** (*Card-matching duel*)
  - 🔤 **Word Duel** (*Letter race challenge*)
  - 🚢 **Battleship** (*Naval tactics*)
- **Modern UI & Aesthetic**: Dark mode glassmorphic styling, neon glows, dynamic avatar colors, and micro-animations.
- **Offline / LAN Ready**: Client libraries (Socket.IO) are bundled locally so the game runs even on offline routers without internet access.

---

## Project Structure

Both frontend and backend follow a modular, layered architecture:

```
two_players/
├── backend/                         # Python Backend Service
│   ├── app.py                       # App factory & Socket.IO server entry point
│   ├── requirements.txt             # Backend dependencies
│   ├── .venv/                       # Python virtual environment (created with uv)
│   ├── config/                      # Configuration layer (env vars & settings)
│   ├── models/                      # Domain models (Player, Invite, Room)
│   ├── repositories/                # Repository layer (In-memory storage & state)
│   │   ├── player_repository.py
│   │   ├── invite_repository.py
│   │   └── room_repository.py
│   ├── services/                    # Service layer (Modular game business logic)
│   │   ├── player_service.py
│   │   ├── invite_service.py
│   │   ├── room_service.py
│   │   ├── tic_tac_toe_service.py   # Tic Tac Toe: turn alternation & 3-in-a-row checks
│   │   ├── rock_paper_scissors_service.py # Rock Paper Scissors: blind commits & showdowns
│   │   ├── connect_four_service.py  # Connect Four: 7-col gravity physics & 4-in-a-row
│   │   ├── memory_match_service.py  # Memory Match: card shuffling & pair bonus streak
│   │   ├── word_duel_service.py     # Word Duel: secret dictionary & strike penalties
│   │   └── battleship_service.py    # Battleship: fleet grids, fog-of-war & radar torpedoes
│   ├── routers/                     # REST API routers (/health, /stats)
│   │   └── health_router.py
│   └── events/                      # Real-time WebSocket events (Socket.IO)
│       ├── connection_events.py
│       ├── player_events.py
│       ├── invite_events.py
│       ├── game_events.py
│       ├── tic_tac_toe_events.py
│       ├── rock_paper_scissors_events.py
│       ├── connect_four_events.py
│       ├── memory_match_events.py
│       ├── word_duel_events.py
│       └── battleship_events.py
│
└── frontend/                        # Frontend Web App
    ├── index.html                   # SPA HTML shell with all 6 game arena theatres
    ├── css/                         # Design system & modular CSS
    │   ├── base.css                 # Color tokens, typography, glassmorphism
    │   ├── animations.css           # Background orbs, pulses, transitions
    │   ├── components.css           # Cards, buttons, modals, toasts
    │   └── screens/
    │       ├── register.css         # Nickname entry screen
    │       ├── lobby.css            # Online player list & challenge cards
    │       ├── games.css            # Game card grid & pair badge
    │       ├── tic-tac-toe.css      # 3x3 board, neon glows, scoreboard
    │       ├── rock-paper-scissors.css # Choice dials, lock-in status, showdown stage
    │       ├── connect-four.css     # 7x6 gravity grid, floating discs, column hovers
    │       ├── memory-match.css     # 4x4 3D flip card grid, pair celebration glow
    │       ├── word-duel.css        # Secret word blanks, strike hearts, QWERTY keyboard
    │       └── battleship.css       # Dual radar grids, ship docks, fog-of-war markers
    └── js/                          # Modular ES6 JavaScript
        ├── config.js                # Server URL & connection config
        ├── app.js                   # Application orchestrator & router
        ├── libs/
        │   └── socket.io.min.js     # Vendored client library for offline LAN use
        ├── utils/
        │   └── helpers.js           # Avatar colors, sanitization, DOM helpers
        ├── data/
        │   └── games-catalog.js     # Catalog definitions for all 6 multiplayer games
        ├── services/                # Frontend services
        │   ├── socket-service.js    # Socket.IO connection & event bus
        │   ├── screen-manager.js    # Single-page screen router
        │   └── toast-service.js     # Real-time toast notifications
        ├── components/              # UI components
        │   ├── player-card.js       # Player item in lobby
        │   ├── game-card.js         # Game card renderer
        │   └── invite-modal.js      # Challenge dialog modal
        ├── games/                   # Modular Game Controllers
        │   ├── tic-tac-toe.js       # Interactive 3x3 arena & turn manager
        │   ├── rock-paper-scissors.js # Blind commit dial, reveal animation, best-of-5
        │   ├── connect-four.js      # Column drop mechanics, gravity drop animations
        │   ├── memory-match.js      # Card flip duel, matched pair tracking
        │   ├── word-duel.js         # Virtual keyboard, strike counter, word reveal
        │   └── battleship.js        # Auto-fleet deployment, radar torpedo targeting
        └── screens/                 # Screen controllers
            ├── register-screen.js   # Nickname screen logic
            ├── lobby-screen.js      # Lobby & challenge invitations
            └── games-screen.js      # Game selection & pair controls
```

---

## Getting Started

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Fast Python package manager) or standard `python3` / `pip`
- Python 3.10+

### 1. Environment Configuration (`.env`)

Backend and frontend environments are self-contained within their respective directories:

#### Backend (`backend/.env`)
Copy the template in [`backend/.env.example`](file:///backend/.env.example) to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | *(auto-generated)* | Cryptographic secret for Flask sessions (auto-generates random 256-bit token if empty). |
| `HOST` | `0.0.0.0` | Bind host address (`0.0.0.0` enables local Wi-Fi & LAN connections). |
| `PORT` | `5050` | Backend Socket.IO service port. |
| `DEBUG` | `false` | Enable/disable Flask debug mode. |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (e.g. `*` for LAN or `https://mygame.com,http://localhost:3000`). |
| `SOCKETIO_ASYNC_MODE` | `threading` | Concurrency mode (`threading`, `eventlet`, or `gevent`). |

#### Frontend (`frontend/.env` / `frontend/env.js`)
Copy [`frontend/.env.example`](file:///frontend/.env.example) or [`frontend/env.example.js`](file:///frontend/env.example.js) for deployment overrides:
```bash
cp frontend/.env.example frontend/.env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Local HTTP port for the frontend static server. |
| `BACKEND_URL` | *(empty)* | Optional remote backend URL when deploying frontend on a separate cloud host (e.g. Vercel, Netlify). Leave empty for local WiFi auto-discovery. |

> [!NOTE]
> All `.env` files and `frontend/env.js` are in `.gitignore` and are **never committed** to source control. Secret keys are never hardcoded into the source code.

### 2. Setup Backend with `uv`

Navigate to the `backend` folder, create the `.venv` using `uv`, and install dependencies:

```bash
cd backend

# Create virtual environment
uv venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies with uv
uv pip install -r requirements.txt

# Run the backend server
python app.py
```

The server will display your LAN IP (e.g. `http://192.168.1.35:5050`).

### 3. Run Frontend

In a separate terminal window:

```bash
cd frontend

# Serve frontend over local network
python3 -m http.server 3000 --bind 0.0.0.0
```

---

### Single-Service Cloud Deployment (Recommended)

The app is packaged as a **self-contained monolith**: the Python Flask backend serves both the WebSocket API and the frontend UI directly on a single port.

#### Deploying to [Render.com](https://render.com/) (Free)
1. Fork or push this repository to your GitHub account.
2. Sign in to [Render](https://dashboard.render.com/) and click **New +** → **Blueprint** (or **Web Service**).
3. Connect your repository (`two_players`).
4. Render will automatically detect [`render.yaml`](file:///render.yaml) and configure:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python backend/app.py`
5. Render assigns you a free public HTTPS URL (e.g. `https://two-players-xxxx.onrender.com`).
6. Open the URL on two devices anywhere in the world and play!

#### Deploying to [Railway.app](https://railway.app/)
1. Sign in to [Railway](https://railway.app/) and click **New Project** → **Deploy from GitHub repo**.
2. Select your `two_players` repository.
3. Railway detects [`Procfile`](file:///Procfile) and [`requirements.txt`](file:///requirements.txt) automatically.
4. Under **Settings** → **Networking**, click **Generate Domain**.
5. Your game is live!

---

### Local Single-Command Running
Because Flask serves the frontend directly, you only need to run **one command** locally:
```bash
python backend/app.py
```
Open **`http://localhost:5050`** (or your LAN IP) in your browser — both the game interface and the real-time multiplayer server run seamlessly together on port 5050 with zero CORS configuration.

---

## Playing with Two Players on Shared WiFi

1. Make sure both devices (laptop, phone, tablet) are connected to the same WiFi network.
2. Check the host machine's IP address (shown in the backend server output or via `ifconfig` / `ipconfig`, e.g. `192.168.1.35`).
3. Open `http://<HOST-IP>:3000` on **Device 1** and enter a player name (e.g., `Alice`).
4. Open `http://<HOST-IP>:3000` on **Device 2** and enter a player name (e.g., `Bob`).
5. On either device's screen, click **Challenge** next to the other player.
6. The other player clicks **Accept** on the challenge modal.
7. Both players are paired and can select any of the available game cards!

---

## 📚 Architecture & Design Documentation

Comprehensive technical specifications and interactive diagrams are available in the [`docs/`](file:///Users/uk07/Desktop/Projects/two_players/docs) directory:

- **[System Architecture Markdown (`docs/architecture.md`)](file:///Users/uk07/Desktop/Projects/two_players/docs/architecture.md)**: Detailed specifications with Mermaid diagrams covering:
  - System topology & layer boundaries (Models, Repositories, Services, Events, Routers)
  - Pluggable multi-game scaling architecture (`BaseGameService`, dynamic state isolation)
  - Lifecycle & edge-case resilience (instant tab-close unregister beacon vs. voluntary lobby return)
  - Zero-configuration / "No-IP" deployment blueprint (mDNS `.local` domains, terminal QR codes, Cloudflare tunnels)
  - Full Socket.IO event contract matrix
- **[Interactive HTML Architecture Viewer (`docs/architecture.html`)](file:///Users/uk07/Desktop/Projects/two_players/docs/architecture.html)**: Interactive, glassmorphism-styled dashboard with auto-rendered Mermaid.js diagrams, sidebar navigation, code snippets, and interactive sequence flows.