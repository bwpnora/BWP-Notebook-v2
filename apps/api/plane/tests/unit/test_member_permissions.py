# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status
from django.test import Client
from plane.db.models import (
    User,
    Workspace,
    WorkspaceMember,
    Project,
    ProjectMember,
    Issue,
    IssueType,
)


@pytest.mark.django_db
def test_member_cannot_list_issues(client: Client):
    user = User.objects.create(email="member@example.com", username="member")
    workspace = Workspace.objects.create(name="WS", slug="ws-test")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)

    client.force_login(user)
    response = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()
    assert response.json()["error"] == "You do not have permission to view or modify tasks. Members can only submit new tasks."


@pytest.mark.django_db
def test_member_cannot_retrieve_issue_detail(client: Client):
    user = User.objects.create(email="member2@example.com", username="member2")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-2")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT2", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)
    issue = Issue.objects.create(name="Secret Task", project=project, workspace=workspace)

    client.force_login(user)
    response = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()
    assert response.json()["error"] == "You do not have permission to view or modify tasks. Members can only submit new tasks."


@pytest.mark.django_db
def test_member_can_create_issue_in_assigned_project(client: Client):
    user = User.objects.create(email="member3@example.com", username="member3")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-3")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT3", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)

    client.force_login(user)
    payload = {"name": "New Task from Member", "priority": "medium"}
    response = client.post(
        f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/",
        data=payload,
        content_type="application/json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["name"] == "New Task from Member"


@pytest.mark.django_db
def test_member_cannot_update_issue(client: Client):
    user = User.objects.create(email="member4@example.com", username="member4")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-4")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT4", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)
    issue = Issue.objects.create(name="Task To Update", project=project, workspace=workspace)

    client.force_login(user)
    payload = {"name": "Hacked Task"}
    response = client.put(
        f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/",
        data=payload,
        content_type="application/json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()
    assert response.json()["error"] == "You do not have permission to view or modify tasks. Members can only submit new tasks."


@pytest.mark.django_db
def test_member_cannot_partial_update_issue(client: Client):
    user = User.objects.create(email="member5@example.com", username="member5")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-5")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT5", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)
    issue = Issue.objects.create(name="Task To Patch", project=project, workspace=workspace)

    client.force_login(user)
    payload = {"name": "Patched Task"}
    response = client.patch(
        f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/",
        data=payload,
        content_type="application/json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()
    assert response.json()["error"] == "You do not have permission to view or modify tasks. Members can only submit new tasks."


@pytest.mark.django_db
def test_member_cannot_delete_issue(client: Client):
    user = User.objects.create(email="member6@example.com", username="member6")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-6")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT6", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)
    issue = Issue.objects.create(name="Task To Delete", project=project, workspace=workspace, created_by=user)

    client.force_login(user)
    response = client.delete(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()
    assert response.json()["error"] == "You do not have permission to view or modify tasks. Members can only submit new tasks."


@pytest.mark.django_db
def test_admin_retains_full_privileges(client: Client):
    user = User.objects.create(email="admin@example.com", username="admin_user")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-admin")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=20)
    project = Project.objects.create(name="Dept", identifier="DEPTA", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=20)
    issue = Issue.objects.create(name="Admin Task", project=project, workspace=workspace)

    client.force_login(user)
    # Admin can list
    list_resp = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/")
    assert list_resp.status_code == status.HTTP_200_OK

    # Admin can retrieve
    get_resp = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/")
    assert get_resp.status_code == status.HTTP_200_OK
