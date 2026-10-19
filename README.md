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
│   ├── services/                    # Service layer (Business logic)
│   │   ├── player_service.py
│   │   ├── invite_service.py
│   │   ├── room_service.py
│   │   └── tic_tac_toe_service.py   # Tic Tac Toe game logic & score tracking
│   ├── routers/                     # REST API routers (/health, /stats)
│   │   └── health_router.py
│   └── events/                      # Real-time WebSocket events (Socket.IO)
│       ├── connection_events.py
│       ├── player_events.py
│       ├── invite_events.py
│       ├── game_events.py
│       └── tic_tac_toe_events.py    # Move execution & rematch handlers
│
└── frontend/                        # Frontend Web App
    ├── index.html                   # SPA HTML shell
    ├── css/                         # Design system & modular CSS
    │   ├── base.css                 # Color tokens, typography, glassmorphism
    │   ├── animations.css           # Background orbs, pulses, transitions
    │   ├── components.css           # Cards, buttons, modals, toasts
    │   └── screens/
    │       ├── register.css         # Arena nickname entry screen
    │       ├── lobby.css            # Online player list & challenge cards
    │       ├── games.css            # Game card grid & pair badge
    │       └── tic-tac-toe.css      # 3x3 board, neon glows, scoreboard
    └── js/                          # Modular ES6 JavaScript
        ├── config.js                # Server URL & connection config
        ├── app.js                   # Application entry point
        ├── libs/
        │   └── socket.io.min.js     # Vendored client library for offline LAN use
        ├── utils/
        │   └── helpers.js           # Avatar colors, sanitization, DOM helpers
        ├── data/
        │   └── games-catalog.js     # Games catalog definitions
        ├── services/                # Frontend services
        │   ├── socket-service.js    # Socket.IO connection & event bus
        │   ├── screen-manager.js    # Single-page screen router
        │   └── toast-service.js     # Real-time toast notifications
        ├── components/              # UI components
        │   ├── player-card.js       # Player item in lobby
        │   ├── game-card.js         # Game card renderer
        │   └── invite-modal.js      # Challenge dialog modal
        ├── games/                   # Modular Game Clients
        │   └── tic-tac-toe.js       # Interactive 3x3 arena & turn manager
        └── screens/                 # Screen controllers
            ├── register-screen.js   # Nickname screen logic
            ├── lobby-screen.js      # Lobby & challenge invitations
            └── games-screen.js      # Game selection & pair controls
```

---

## Getting Started

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Fast Python package manager)
- Python 3.10+

### 1. Setup Backend with `uv`

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

### 2. Run Frontend

In a separate terminal window:

```bash
cd frontend

# Serve frontend over local network
python3 -m http.server 3000 --bind 0.0.0.0
```

---

## Playing with Two Players on Shared WiFi

1. Make sure both devices (laptop, phone, tablet) are connected to the same WiFi network.
2. Check the host machine's IP address (shown in the backend server output or via `ifconfig` / `ipconfig`, e.g. `192.168.1.35`).
3. Open `http://<HOST-IP>:3000` on **Device 1** and enter a player name (e.g., `Alice`).
4. Open `http://<HOST-IP>:3000` on **Device 2** and enter a player name (e.g., `Bob`).
5. On either device's screen, click **Challenge** next to the other player.
6. The other player clicks **Accept** on the challenge modal.
7. Both players are paired and can select any of the available game cards!