"""
Two Players — Application Entry Point

Wires together all layers:
  Config → Repositories → Services → Events/Routers → Server
"""

from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

from config import Config
from repositories import PlayerRepository, InviteRepository, RoomRepository
from services import (
    PlayerService,
    InviteService,
    RoomService,
    TicTacToeService,
    RockPaperScissorsService,
    ConnectFourService,
)
from events import register_all_events
from routers import create_health_router, create_player_router


def create_app() -> tuple[Flask, SocketIO]:
    """Application factory — builds and wires the entire app."""

    # ── Flask app ────────────────────────────────────────────
    app = Flask(__name__)
    app.config['SECRET_KEY'] = Config.SECRET_KEY
    CORS(app, origins=Config.CORS_ORIGINS)

    socketio = SocketIO(
        app,
        cors_allowed_origins=Config.CORS_ORIGINS,
        async_mode=Config.SOCKETIO_ASYNC_MODE,
        ping_timeout=10,
        ping_interval=5,
    )

    # ── Repositories (data layer) ────────────────────────────
    player_repo = PlayerRepository()
    invite_repo = InviteRepository()
    room_repo = RoomRepository()

    # ── Services (business logic layer) ──────────────────────
    player_service = PlayerService(player_repo)
    invite_service = InviteService(invite_repo, player_repo)
    room_service = RoomService(room_repo, player_repo)
    ttt_service = TicTacToeService()
    rps_service = RockPaperScissorsService(target_wins=3)
    c4_service = ConnectFourService()

    game_services = {
        'tic-tac-toe': ttt_service,
        'rock-paper-scissors': rps_service,
        'connect-four': c4_service,
    }

    # ── REST Routers ─────────────────────────────────────────
    health_bp = create_health_router(player_service, room_service)
    app.register_blueprint(health_bp)

    player_bp = create_player_router(socketio, player_service, invite_service, room_service)
    app.register_blueprint(player_bp)

    # ── Socket.IO Events ─────────────────────────────────────
    register_all_events(socketio, player_service, invite_service, room_service, game_services)

    return app, socketio



# ── Run ──────────────────────────────────────────────────────

if __name__ == '__main__':
    import socket

    app, socketio = create_app()

    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = '127.0.0.1'

    print(f"\n{'='*50}")
    print(f"  Two Players — Game Server")
    print(f"  Local:   http://localhost:{Config.PORT}")
    print(f"  Network: http://{local_ip}:{Config.PORT}")
    print(f"{'='*50}\n")

    socketio.run(
        app,
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        allow_unsafe_werkzeug=True,
    )
