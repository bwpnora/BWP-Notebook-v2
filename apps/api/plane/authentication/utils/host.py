# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpRequest

# Third party imports
from rest_framework.request import Request

# Module imports
from plane.utils.ip_address import get_client_ip


def get_request_origin(request: Request | HttpRequest | None) -> str | None:
    """Extract and validate the origin from incoming request headers."""
    if not request:
        return None

    try:
        # Determine scheme: check X-Forwarded-Proto first (from reverse proxies like Caddy/Nginx)
        scheme = None
        if hasattr(request, "headers"):
            scheme = request.headers.get("x-forwarded-proto")
        if not scheme and hasattr(request, "META"):
            scheme = request.META.get("HTTP_X_FORWARDED_PROTO")
        if not scheme:
            scheme = "https" if request.is_secure() else "http"

        # Determine host: check X-Forwarded-Host first, then get_host()
        host = None
        if hasattr(request, "headers"):
            host = request.headers.get("x-forwarded-host")
        if not host and hasattr(request, "META"):
            host = request.META.get("HTTP_X_FORWARDED_HOST")
        if not host and hasattr(request, "get_host"):
            try:
                host = request.get_host()
            except Exception:
                host = None

        if not host:
            return None

        # Discard multiple comma-separated proxy hosts if present
        host = host.split(",")[0].strip()
        if not host:
            return None

        candidate_origin = f"{scheme}://{host}"

        # Allowed host validation
        allowed_hosts = getattr(settings, "ALLOWED_HOSTS", ["*"])
        cors_allowed = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        web_url = getattr(settings, "WEB_URL", None)
        app_base_url = getattr(settings, "APP_BASE_URL", None)

        configured_origins = []
        if cors_allowed:
            configured_origins.extend(cors_allowed)
        if web_url:
            configured_origins.append(web_url.rstrip("/"))
        if app_base_url:
            configured_origins.append(app_base_url.rstrip("/"))

        if candidate_origin in [orig.rstrip("/") for orig in configured_origins if orig]:
            return candidate_origin

        host_without_port = host.split(":")[0]
        if "*" in allowed_hosts or host in allowed_hosts or host_without_port in allowed_hosts:
            return candidate_origin

    except Exception:
        pass

    return None


def base_host(
    request: Request | HttpRequest | None = None,
    is_admin: bool = False,
    is_space: bool = False,
    is_app: bool = False,
) -> str:
    """Utility function to return host / origin from the request or fallback to configured base URL"""
    # Calculate origin dynamically from request or fallback to settings
    base_origin = get_request_origin(request) or settings.WEB_URL or settings.APP_BASE_URL

    if not base_origin:
        raise ImproperlyConfigured("APP_BASE_URL or WEB_URL is not set")

    # Admin redirection
    if is_admin:
        admin_base_path = getattr(settings, "ADMIN_BASE_PATH", None)
        if not isinstance(admin_base_path, str):
            admin_base_path = "/god-mode/"
        if not admin_base_path.startswith("/"):
            admin_base_path = "/" + admin_base_path
        if not admin_base_path.endswith("/"):
            admin_base_path += "/"

        if settings.ADMIN_BASE_URL:
            return settings.ADMIN_BASE_URL + admin_base_path
        else:
            return base_origin + admin_base_path

    # Space redirection
    if is_space:
        space_base_path = getattr(settings, "SPACE_BASE_PATH", None)
        if not isinstance(space_base_path, str):
            space_base_path = "/spaces/"
        if not space_base_path.startswith("/"):
            space_base_path = "/" + space_base_path
        if not space_base_path.endswith("/"):
            space_base_path += "/"

        if settings.SPACE_BASE_URL:
            return settings.SPACE_BASE_URL + space_base_path
        else:
            return base_origin + space_base_path

    # App Redirection
    if is_app:
        if settings.APP_BASE_URL:
            return settings.APP_BASE_URL
        else:
            return base_origin

    return base_origin


def user_ip(request: Request | HttpRequest) -> str:
    return get_client_ip(request=request)
