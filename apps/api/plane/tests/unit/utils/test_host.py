# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from django.test import RequestFactory
from plane.utils.host import base_host, get_request_origin
from plane.utils.path_validator import get_allowed_hosts, get_safe_redirect_url


@pytest.mark.unit
class TestHostResolution:
    """Test dynamic host resolution and safe redirect handling"""

    def test_base_host_fallback_when_request_is_none(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.APP_BASE_URL = None
        settings.CORS_ALLOWED_ORIGINS = ["http://192.168.3.168:18080", "http://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        assert base_host(request=None) == "http://192.168.3.168:18080"

    def test_base_host_with_domain_header(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.APP_BASE_URL = None
        settings.CORS_ALLOWED_ORIGINS = ["http://192.168.3.168:18080", "http://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="report.imperialdalat.com:18080")

        assert base_host(request=request) == "http://report.imperialdalat.com:18080"

    def test_base_host_with_ip_header(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.APP_BASE_URL = None
        settings.CORS_ALLOWED_ORIGINS = ["http://192.168.3.168:18080", "http://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="192.168.3.168:18080")

        assert base_host(request=request) == "http://192.168.3.168:18080"

    def test_base_host_with_x_forwarded_headers(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.APP_BASE_URL = None
        settings.CORS_ALLOWED_ORIGINS = ["http://192.168.3.168:18080", "https://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        factory = RequestFactory()
        request = factory.get(
            "/",
            HTTP_X_FORWARDED_HOST="report.imperialdalat.com:18080",
            HTTP_X_FORWARDED_PROTO="https",
        )

        assert base_host(request=request) == "https://report.imperialdalat.com:18080"

    def test_base_host_admin_and_space_paths(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.ADMIN_BASE_URL = None
        settings.SPACE_BASE_URL = None
        settings.CORS_ALLOWED_ORIGINS = ["http://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        factory = RequestFactory()
        request = factory.get("/", HTTP_HOST="report.imperialdalat.com:18080")

        assert base_host(request=request, is_admin=True) == "http://report.imperialdalat.com:18080/god-mode/"
        assert base_host(request=request, is_space=True) == "http://report.imperialdalat.com:18080/spaces/"

    def test_safe_redirect_url_with_dynamic_domain(self, settings):
        settings.WEB_URL = "http://192.168.3.168:18080"
        settings.CORS_ALLOWED_ORIGINS = ["http://192.168.3.168:18080", "http://report.imperialdalat.com:18080"]
        settings.ALLOWED_HOSTS = ["*"]

        redirect_url = get_safe_redirect_url(
            base_url="http://report.imperialdalat.com:18080",
            next_path="/my-workspace",
            params={},
        )
        assert "http://report.imperialdalat.com:18080" in redirect_url
        assert "next_path=/my-workspace" in redirect_url
