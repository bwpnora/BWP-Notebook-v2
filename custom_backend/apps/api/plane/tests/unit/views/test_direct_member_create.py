# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from plane.db.models import Project, ProjectMember, User, Workspace, WorkspaceMember


@pytest.mark.django_db
def test_direct_member_create_success_without_email():
    admin = User.objects.create(username="workspace_admin_1", email="admin1@bwp.com")
    admin.set_password("pass123")
    admin.save()
    ws = Workspace.objects.create(name="WS1", slug="ws1", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Test User",
        "username": "test_user_1",
        "password": "StrongPassword123!",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws1/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["username"] == "test_user_1"
    assert response.data["display_name"] == "Test User"
    assert response.data["email"] is None
    assert response.data["role"] == 15
    assert response.data["credentials"]["username"] == "test_user_1"
    assert response.data["credentials"]["password"] == "StrongPassword123!"

    created_user = User.objects.get(username="test_user_1")
    assert created_user.email is None
    assert created_user.display_name == "Test User"
    assert created_user.check_password("StrongPassword123!")
    assert WorkspaceMember.objects.filter(workspace=ws, member=created_user, role=15).exists()


@pytest.mark.django_db
def test_direct_member_create_success_with_email():
    admin = User.objects.create(username="workspace_admin_2", email="admin2@bwp.com")
    admin.set_password("pass123")
    admin.save()
    ws = Workspace.objects.create(name="WS2", slug="ws2", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "User With Email",
        "username": "user_with_email",
        "password": "Password123!",
        "email": "created@bwp.com",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws2/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["username"] == "user_with_email"
    assert response.data["email"] == "created@bwp.com"

    created_user = User.objects.get(username="user_with_email")
    assert created_user.email == "created@bwp.com"
    assert created_user.check_password("Password123!")


@pytest.mark.django_db
def test_direct_member_create_duplicate_username_rejected():
    admin = User.objects.create(username="workspace_admin_3", email="admin3@bwp.com")
    admin.set_password("pass123")
    admin.save()
    ws = Workspace.objects.create(name="WS3", slug="ws3", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    User.objects.create(username="existing_username", email="other@bwp.com")

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Duplicate User",
        "username": "existing_username",
        "password": "Password123!",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws3/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.data


@pytest.mark.django_db
def test_direct_member_create_duplicate_email_rejected():
    admin = User.objects.create(username="workspace_admin_4", email="admin4@bwp.com")
    admin.set_password("pass123")
    admin.save()
    ws = Workspace.objects.create(name="WS4", slug="ws4", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    User.objects.create(username="existing_email_user", email="dup_email@bwp.com")

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Dup Email User",
        "username": "unique_username_4",
        "password": "Password123!",
        "email": "dup_email@bwp.com",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws4/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.data


@pytest.mark.django_db
def test_direct_member_create_unit_admin_allowed():
    unit_admin = User.objects.create(username="unit_admin_ws5", email="admin5@bwp.com")
    unit_admin.set_password("pass123")
    unit_admin.save()
    ws = Workspace.objects.create(name="WS5", slug="ws5", owner=unit_admin)
    WorkspaceMember.objects.create(workspace=ws, member=unit_admin, role=20)

    client = APIClient()
    client.force_authenticate(user=unit_admin)
    payload = {
        "display_name": "Direct User",
        "username": "direct_user_5",
        "password": "Password123!",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws5/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["username"] == "direct_user_5"


@pytest.mark.django_db
def test_direct_member_create_member_role_15_rejected():
    owner = User.objects.create(username="ws_owner_6", email="owner6@bwp.com")
    ws = Workspace.objects.create(name="WS6", slug="ws6", owner=owner)

    regular_member = User.objects.create(username="regular_member_6", email="member6@bwp.com")
    regular_member.set_password("pass123")
    regular_member.save()
    WorkspaceMember.objects.create(workspace=ws, member=regular_member, role=15)

    client = APIClient()
    client.force_authenticate(user=regular_member)
    payload = {
        "display_name": "Target User",
        "username": "target_user_6",
        "password": "Password123!",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws6/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.data


@pytest.mark.django_db
def test_direct_member_create_dept_admin_own_department_allowed():
    owner = User.objects.create(username="ws_owner_7", email="owner7@bwp.com")
    ws = Workspace.objects.create(name="WS7", slug="ws7", owner=owner)

    dept_admin = User.objects.create(username="dept_admin_7", email="dept_admin7@bwp.com")
    dept_admin.set_password("pass123")
    dept_admin.save()
    WorkspaceMember.objects.create(workspace=ws, member=dept_admin, role=15)

    project_a = Project.objects.create(name="Project A", identifier="PRA", workspace=ws, created_by=owner)
    ProjectMember.objects.create(workspace=ws, project=project_a, member=dept_admin, role=20)

    client = APIClient()
    client.force_authenticate(user=dept_admin)
    payload = {
        "display_name": "New Dept User",
        "username": "new_dept_user_7",
        "password": "Password123!",
        "role": 15,
        "project_id": str(project_a.id),
        "project_role": 15,
    }
    response = client.post("/api/workspaces/ws7/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["username"] == "new_dept_user_7"

    new_user = User.objects.get(username="new_dept_user_7")
    assert WorkspaceMember.objects.filter(workspace=ws, member=new_user, role=15).exists()
    assert ProjectMember.objects.filter(workspace=ws, project=project_a, member=new_user, role=15).exists()


@pytest.mark.django_db
def test_direct_member_create_dept_admin_other_department_rejected():
    owner = User.objects.create(username="ws_owner_8", email="owner8@bwp.com")
    ws = Workspace.objects.create(name="WS8", slug="ws8", owner=owner)

    dept_admin = User.objects.create(username="dept_admin_8", email="dept_admin8@bwp.com")
    dept_admin.set_password("pass123")
    dept_admin.save()
    WorkspaceMember.objects.create(workspace=ws, member=dept_admin, role=15)

    project_a = Project.objects.create(name="Project A", identifier="PRA", workspace=ws, created_by=owner)
    project_b = Project.objects.create(name="Project B", identifier="PRB", workspace=ws, created_by=owner)

    ProjectMember.objects.create(workspace=ws, project=project_a, member=dept_admin, role=20)
    ProjectMember.objects.create(workspace=ws, project=project_b, member=dept_admin, role=15)

    client = APIClient()
    client.force_authenticate(user=dept_admin)
    payload = {
        "display_name": "Hacked User",
        "username": "hacked_user_8",
        "password": "Password123!",
        "role": 15,
        "project_id": str(project_b.id),
    }
    response = client.post("/api/workspaces/ws8/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.data


@pytest.mark.django_db
def test_direct_member_create_invalid_username_format():
    admin = User.objects.create(username="workspace_admin_9", email="admin9@bwp.com")
    ws = Workspace.objects.create(name="WS9", slug="ws9", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Invalid User",
        "username": "bad user!",
        "password": "Password123!",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws9/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.data


@pytest.mark.django_db
def test_direct_member_create_short_password():
    admin = User.objects.create(username="workspace_admin_10", email="admin10@bwp.com")
    ws = Workspace.objects.create(name="WS10", slug="ws10", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    client = APIClient()
    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Short Pass",
        "username": "short_pass_user",
        "password": "123",
        "role": 15,
    }
    response = client.post("/api/workspaces/ws10/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.data
