# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import uuid
import pytest
from django.test import Client
from rest_framework import status
from rest_framework.test import APIClient

from plane.db.models import User
from plane.license.models import Instance


@pytest.fixture
def instance(db):
    instance_obj = Instance.objects.first()
    if not instance_obj:
        instance_obj = Instance.objects.create(
            instance_name="Test Instance",
            instance_id=str(uuid.uuid4()),
            current_version="1.0.0",
            domain="http://localhost:8000",
            is_setup_done=True,
        )
    else:
        instance_obj.is_setup_done = True
        instance_obj.save()
    return instance_obj


@pytest.mark.django_db
def test_check_endpoint_with_username_existing(instance):
    User.objects.create(username="emp_alex", email=None, display_name="Alex")

    client = APIClient()
    res = client.post("/api/auth/check/", {"email": "emp_alex"}, format="json")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["existing"] is True
    assert res.data["status"] == "CREDENTIAL"


@pytest.mark.django_db
def test_check_endpoint_with_email_existing(instance):
    User.objects.create(username="emp_bob", email="bob@bwp.com", display_name="Bob")

    client = APIClient()
    res = client.post("/api/auth/check/", {"email": "bob@bwp.com"}, format="json")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["existing"] is True


@pytest.mark.django_db
def test_check_endpoint_with_non_existent_username(instance):
    client = APIClient()
    res = client.post("/api/auth/check/", {"email": "non_existent_user"}, format="json")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["existing"] is False
    assert res.data["status"] == "CREDENTIAL"


@pytest.mark.django_db
def test_check_endpoint_with_invalid_email_format(instance):
    client = APIClient()
    res = client.post("/api/auth/check/", {"email": "invalid@email@domain"}, format="json")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.data.get("error_code") == "INVALID_EMAIL"


@pytest.mark.django_db
def test_check_endpoint_with_empty_identifier(instance):
    client = APIClient()
    res = client.post("/api/auth/check/", {"email": ""}, format="json")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.data.get("error_code") == "EMAIL_REQUIRED"


@pytest.mark.django_db
def test_signin_with_username_success(instance):
    user = User.objects.create(username="emp_alex", email=None, display_name="Alex")
    user.set_password("MySecurePass123!")
    user.save()

    client = Client()
    res = client.post("/api/auth/sign-in/", {"email": "emp_alex", "password": "MySecurePass123!"})
    assert res.status_code in [status.HTTP_200_OK, status.HTTP_302_FOUND]
    if res.status_code == status.HTTP_302_FOUND:
        assert "error_code" not in res.url


@pytest.mark.django_db
def test_signin_with_email_success(instance):
    user = User.objects.create(username="emp_david", email="david@bwp.com", display_name="David")
    user.set_password("DavidPass123!")
    user.save()

    client = Client()
    res = client.post("/api/auth/sign-in/", {"email": "david@bwp.com", "password": "DavidPass123!"})
    assert res.status_code in [status.HTTP_200_OK, status.HTTP_302_FOUND]
    if res.status_code == status.HTTP_302_FOUND:
        assert "error_code" not in res.url


@pytest.mark.django_db
def test_signin_with_wrong_password(instance):
    user = User.objects.create(username="emp_alex", email=None, display_name="Alex")
    user.set_password("MySecurePass123!")
    user.save()

    client = Client()
    res = client.post("/api/auth/sign-in/", {"email": "emp_alex", "password": "WrongPassword!"})
    assert res.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_302_FOUND]
    if res.status_code == status.HTTP_302_FOUND:
        assert "AUTHENTICATION_FAILED_SIGN_IN" in res.url


@pytest.mark.django_db
def test_signin_with_non_existent_username(instance):
    client = Client()
    res = client.post("/api/auth/sign-in/", {"email": "unknown_user", "password": "AnyPassword123!"})
    assert res.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_302_FOUND]
    if res.status_code == status.HTTP_302_FOUND:
        assert "USER_DOES_NOT_EXIST" in res.url


@pytest.mark.django_db
def test_signin_with_invalid_email_format(instance):
    client = Client()
    res = client.post("/api/auth/sign-in/", {"email": "bad@email@domain", "password": "AnyPassword123!"})
    assert res.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_302_FOUND]
    if res.status_code == status.HTTP_302_FOUND:
        assert "INVALID_EMAIL_SIGN_IN" in res.url


@pytest.mark.django_db
def test_dual_identifier_brief_contract(instance):
    """Exact test contract from task 3 brief"""
    user = User.objects.create(username="emp_alex_contract", email=None, display_name="Alex")
    user.set_password("MySecurePass123!")
    user.save()

    client = Client()

    # Check endpoint with username
    res_check = client.post("/api/auth/check/", {"email": "emp_alex_contract"}, content_type="application/json")
    assert res_check.status_code == status.HTTP_200_OK
    assert res_check.json()["existing"] is True

    # Sign in endpoint with username
    res_login = client.post("/api/auth/sign-in/", {"email": "emp_alex_contract", "password": "MySecurePass123!"})
    assert res_login.status_code in [status.HTTP_200_OK, status.HTTP_302_FOUND]
