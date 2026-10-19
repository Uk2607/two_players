"""Routers package — re-exports router factories."""

from routers.health_router import create_health_router

__all__ = ['create_health_router']
