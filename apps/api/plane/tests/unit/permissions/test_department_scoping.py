# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from plane.app.permissions.project import ProjectMemberPermission
from plane.db.models import Project, ProjectMember, User, Workspace, WorkspaceMember
from plane.license.models import Instance, InstanceAdmin


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_project_member_permission_post():
    """Verify ProjectMemberPermission enforces is_super_admin on POST requests."""
    permission = ProjectMemberPermission()
    view = MagicMock()
    view.workspace_slug = "test-ws"
    view.project_id = "test-proj"

    # Anonymous user
    anon_user = MagicMock()
    anon_user.is_anonymous = True
    request_anon = MagicMock(method="POST", user=anon_user)
    assert permission.has_permission(request_anon, view) is False

    # Normal user
    normal_user = User.objects.create(username="normal_user", email="normal@bwp.com")
    request_normal = MagicMock(method="POST", user=normal_user)
    assert permission.has_permission(request_normal, view) is False

    # Superuser
    super_user = User.objects.create(username="super_user", email="super@bwp.com", is_superuser=True)
    request_super = MagicMock(method="POST", user=super_user)
    assert permission.has_permission(request_super, view) is True

    # InstanceAdmin user (role >= 15)
    instance = Instance.objects.create(instance_id="inst_scoping", current_version="1.0")
    inst_admin_user = User.objects.create(username="inst_admin", email="inst_admin@bwp.com")
    InstanceAdmin.objects.create(instance=instance, user=inst_admin_user, role=20)
    request_inst_admin = MagicMock(method="POST", user=inst_admin_user)
    assert permission.has_permission(request_inst_admin, view) is True


@pytest.mark.django_db
def test_dept_admin_cannot_interfere_other_department():
    """Brief specification test: Dept Admin of Dept A cannot interfere with Dept B."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner", email="owner@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS", slug="ws", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin", email="admin_a@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DA", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DB", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    # Attempting to add member to Dept B
    res = client.post(
        f"/api/workspaces/ws/projects/{dept_b.id}/members/",
        {"members": [{"member_id": dept_a_admin.id, "role": 15}]},
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Attempting to update Dept B settings
    res_update = client.patch(
        f"/api/workspaces/ws/projects/{dept_b.id}/",
        {"name": "Dept B Hacked"},
        format="json",
    )
    assert res_update.status_code == status.HTTP_403_FORBIDDEN

    # Attempting direct-create with project_id of Dept B
    res_direct = client.post(
        "/api/workspaces/ws/members/direct-create/",
        {
            "display_name": "New Emp",
            "username": "new_emp_scoped",
            "password": "Password123!",
            "role": 15,
            "project_id": str(dept_b.id),
        },
        format="json",
    )
    assert res_direct.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_dept_admin_add_member_own_department_allowed():
    """Dept Admin of Dept A adding member to Dept A is Allowed (200/201)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_add", email="owner_add@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Add", slug="ws-add", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_add", email="admin_a_add@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DAA", workspace=ws)
    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    # Pre-existing workspace member to add to Dept A
    target_emp = User.objects.create(username="target_emp_add", email="target_add@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=target_emp, role=15)

    client.force_authenticate(user=dept_a_admin)
    with patch("plane.app.views.project.member.project_add_user_email.delay"):
        res = client.post(
            f"/api/workspaces/{ws.slug}/projects/{dept_a.id}/members/",
            {"members": [{"member_id": str(target_emp.id), "role": 15}]},
            format="json",
        )
    assert res.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
    assert ProjectMember.objects.filter(workspace=ws, project=dept_a, member=target_emp, role=15).exists()


@pytest.mark.django_db
def test_dept_admin_add_member_other_department_rejected():
    """Dept Admin of Dept A adding member to Dept B is Rejected (403)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_rej", email="owner_rej@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Rej", slug="ws-rej", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_rej", email="admin_a_rej@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DAR", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DBR", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    target_emp = User.objects.create(username="target_emp_rej", email="target_rej@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=target_emp, role=15)

    client.force_authenticate(user=dept_a_admin)
    res = client.post(
        f"/api/workspaces/{ws.slug}/projects/{dept_b.id}/members/",
        {"members": [{"member_id": str(target_emp.id), "role": 15}]},
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert not ProjectMember.objects.filter(project=dept_b, member=target_emp).exists()


@pytest.mark.django_db
def test_dept_admin_update_settings_other_department_rejected():
    """Dept Admin of Dept A updating settings of Dept B is Rejected (403)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_upd", email="owner_upd@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Upd", slug="ws-upd", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_upd", email="admin_a_upd@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DAU", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DBU", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    res = client.patch(
        f"/api/workspaces/{ws.slug}/projects/{dept_b.id}/",
        {"name": "Hacked Dept B"},
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    dept_b.refresh_from_db()
    assert dept_b.name == "Dept B"


@pytest.mark.django_db
def test_dept_admin_update_settings_own_department_allowed():
    """Dept Admin of Dept A updating settings of Dept A is Allowed (200)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_own_upd", email="owner_own_upd@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Own Upd", slug="ws-own-upd", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_own_upd", email="admin_a_own_upd@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DAO", workspace=ws)
    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    with patch("plane.app.views.project.base.model_activity.delay"):
        res = client.patch(
            f"/api/workspaces/{ws.slug}/projects/{dept_a.id}/",
            {"name": "Dept A Updated"},
            format="json",
        )
    assert res.status_code == status.HTTP_200_OK
    dept_a.refresh_from_db()
    assert dept_a.name == "Dept A Updated"


@pytest.mark.django_db
def test_dept_admin_direct_create_other_department_rejected():
    """Dept Admin of Dept A calling direct-create with project_id of Dept B is Rejected (403)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_dc_rej", email="owner_dc_rej@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS DC Rej", slug="ws-dc-rej", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_dc_rej", email="admin_a_dc_rej@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DCR1", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DCR2", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    res = client.post(
        f"/api/workspaces/{ws.slug}/members/direct-create/",
        {
            "display_name": "New Emp Cross Dept",
            "username": "new_emp_cross_dept",
            "password": "Password123!",
            "role": 15,
            "project_id": str(dept_b.id),
        },
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert not User.objects.filter(username="new_emp_cross_dept").exists()


@pytest.mark.django_db
def test_dept_admin_direct_create_own_department_allowed():
    """Dept Admin of Dept A calling direct-create with project_id of Dept A is Allowed (201)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_dc_allow", email="owner_dc_allow@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS DC Allow", slug="ws-dc-allow", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_dc_allow", email="admin_a_dc_allow@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DCA", workspace=ws)
    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    res = client.post(
        f"/api/workspaces/{ws.slug}/members/direct-create/",
        {
            "display_name": "New Dept A Emp",
            "username": "new_dept_a_emp",
            "password": "Password123!",
            "role": 15,
            "project_id": str(dept_a.id),
            "project_role": 15,
        },
        format="json",
    )
    assert res.status_code == status.HTTP_201_CREATED
    created_user = User.objects.get(username="new_dept_a_emp")
    assert ProjectMember.objects.filter(workspace=ws, project=dept_a, member=created_user, role=15).exists()


@pytest.mark.django_db
def test_dept_admin_remove_member_other_department_rejected():
    """Dept Admin of Dept A removing member from Dept B is Rejected (403)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_rem_rej", email="owner_rem_rej@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Rem Rej", slug="ws-rem-rej", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_rem_rej", email="admin_a_rem_rej@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DRA", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DRB", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    target_emp_b = User.objects.create(username="emp_in_dept_b", email="emp_b@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=target_emp_b, role=15)
    pm_b = ProjectMember.objects.create(workspace=ws, project=dept_b, member=target_emp_b, role=15)

    client.force_authenticate(user=dept_a_admin)
    res = client.delete(
        f"/api/workspaces/{ws.slug}/projects/{dept_b.id}/members/{pm_b.id}/",
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    pm_b.refresh_from_db()
    assert pm_b.is_active is True


@pytest.mark.django_db
def test_dept_admin_remove_member_own_department_allowed():
    """Dept Admin of Dept A removing member from Dept A is Allowed (204)."""
    client = APIClient()
    ws_owner = User.objects.create(username="owner_rem_allow", email="owner_rem_allow@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS Rem Allow", slug="ws-rem-allow", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin_rem_allow", email="admin_a_rem_allow@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DRO", workspace=ws)
    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    target_emp_a = User.objects.create(username="emp_in_dept_a", email="emp_a@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=target_emp_a, role=15)
    pm_a = ProjectMember.objects.create(workspace=ws, project=dept_a, member=target_emp_a, role=15)

    client.force_authenticate(user=dept_a_admin)
    res = client.delete(
        f"/api/workspaces/{ws.slug}/projects/{dept_a.id}/members/{pm_a.id}/",
        format="json",
    )
    assert res.status_code == status.HTTP_204_NO_CONTENT
    pm_a.refresh_from_db()
    assert pm_a.is_active is False
