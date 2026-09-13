# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# Code & Architecture by IT Leon

"""
Unit tests for BWP-Notebook-v2 Work Item Domain and Business Rules:
1. Operational task auto-assignment for regular members.
2. Manager task creation default to 'other' task.
3. Permission guard: Regular members cannot change task type to 'other' (403).
4. Reassignment guard: Unauthorized users cannot reassign someone else's 'other' task (403).
5. Supporter M2M, Room number, and Notes persistence and serialization.
"""

from uuid import uuid4
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from plane.db.models import (
    Issue,
    IssueSupporter,
    IssueType,
    Project,
    ProjectIssueType,
    ProjectMember,
    State,
    User,
    Workspace,
    WorkspaceMember,
)
from plane.db.models.issue_type import TASK_TYPE_OPERATIONAL, TASK_TYPE_OTHER


@pytest.fixture
def bwp_setup(db, workspace, create_user):
    # Manager user (role=20)
    manager = create_user

    # Regular user (role=15)
    u1_id = uuid4().hex[:8]
    regular_user = User.objects.create(
        email=f"member-{u1_id}@bwp.vn",
        username=f"member_{u1_id}",
        first_name="Regular",
        last_name="Member",
    )
    regular_user.set_password("bwp2026")
    regular_user.save()

    # Supporter user (role=15)
    u2_id = uuid4().hex[:8]
    supporter_user = User.objects.create(
        email=f"supporter-{u2_id}@bwp.vn",
        username=f"supporter_{u2_id}",
        first_name="Supporter",
        last_name="User",
    )
    supporter_user.set_password("bwp2026")
    supporter_user.save()

    # Third user (unauthorized reassignment test)
    u3_id = uuid4().hex[:8]
    other_member = User.objects.create(
        email=f"other-{u3_id}@bwp.vn",
        username=f"other_{u3_id}",
        first_name="Other",
        last_name="Member",
    )
    other_member.set_password("bwp2026")
    other_member.save()

    # Create project
    project = Project.objects.create(
        name="BWP Notebook",
        identifier="BWP",
        workspace=workspace,
        created_by=manager,
    )

    # Workspace & Project members
    WorkspaceMember.objects.create(workspace=workspace, member=regular_user, role=15)
    WorkspaceMember.objects.create(workspace=workspace, member=supporter_user, role=15)
    WorkspaceMember.objects.create(workspace=workspace, member=other_member, role=15)

    ProjectMember.objects.create(project=project, member=manager, workspace=workspace, role=20)
    ProjectMember.objects.create(project=project, member=regular_user, workspace=workspace, role=15)
    ProjectMember.objects.create(project=project, member=supporter_user, workspace=workspace, role=15)
    ProjectMember.objects.create(project=project, member=other_member, workspace=workspace, role=15)

    # Create State
    state = State.objects.create(
        name="Backlog",
        project=project,
        workspace=workspace,
        color="#A3A3A3",
        group="backlog",
        created_by=manager,
    )

    # Create task types
    operational_type = IssueType.objects.create(
        workspace=workspace,
        name="Công việc vận hành",
        external_id=TASK_TYPE_OPERATIONAL,
        is_default=True,
        is_active=True,
        created_by=manager,
    )
    other_type = IssueType.objects.create(
        workspace=workspace,
        name="Công việc khác",
        external_id=TASK_TYPE_OTHER,
        is_default=False,
        is_active=True,
        created_by=manager,
    )

    ProjectIssueType.objects.create(project=project, issue_type=operational_type, workspace=workspace, is_default=True)
    ProjectIssueType.objects.create(project=project, issue_type=other_type, workspace=workspace, is_default=False)

    return {
        "workspace": workspace,
        "project": project,
        "state": state,
        "manager": manager,
        "regular_user": regular_user,
        "supporter_user": supporter_user,
        "other_member": other_member,
        "operational_type": operational_type,
        "other_type": other_type,
    }


@pytest.mark.unit
def test_regular_user_create_task_auto_assigns_operational(bwp_setup):
    client = APIClient()
    client.force_authenticate(user=bwp_setup["regular_user"])

    url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/"
    payload = {
        "name": "Check server temperature",
        "state_id": str(bwp_setup["state"].id),
        "room": 302,
        "notes": "Daily morning inspection",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["type_id"] == str(bwp_setup["operational_type"].id)
    assert response.data["room"] == 302
    assert response.data["notes"] == "Daily morning inspection"


@pytest.mark.unit
def test_manager_create_task_defaults_to_other(bwp_setup):
    client = APIClient()
    client.force_authenticate(user=bwp_setup["manager"])

    url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/"
    payload = {
        "name": "Special maintenance by director order",
        "state_id": str(bwp_setup["state"].id),
        "assignee_ids": [str(bwp_setup["regular_user"].id)],
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["type_id"] == str(bwp_setup["other_type"].id)


@pytest.mark.unit
def test_regular_user_cannot_change_type_to_other(bwp_setup):
    # Manager creates an operational task
    issue = Issue.objects.create(
        name="Daily cleaning",
        project=bwp_setup["project"],
        workspace=bwp_setup["workspace"],
        type=bwp_setup["operational_type"],
        created_by=bwp_setup["regular_user"],
        state=bwp_setup["state"],
    )

    client = APIClient()
    client.force_authenticate(user=bwp_setup["regular_user"])

    url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/{issue.id}/"
    payload = {
        "type_id": str(bwp_setup["other_type"].id),
    }

    response = client.patch(url, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.data


@pytest.mark.unit
def test_reassignment_guard_for_other_task(bwp_setup):
    # Manager creates an "other" task assigned to regular_user
    issue = Issue.objects.create(
        name="Executive VIP Presentation Setup",
        project=bwp_setup["project"],
        workspace=bwp_setup["workspace"],
        type=bwp_setup["other_type"],
        created_by=bwp_setup["manager"],
        state=bwp_setup["state"],
    )
    issue.assignees.add(bwp_setup["regular_user"])

    # other_member attempts to reassign it
    client = APIClient()
    client.force_authenticate(user=bwp_setup["other_member"])

    url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/{issue.id}/"
    payload = {
        "assignee_ids": [str(bwp_setup["other_member"].id)],
    }

    response = client.patch(url, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.data


@pytest.mark.unit
def test_supporters_room_notes_save_and_retrieve(bwp_setup):
    client = APIClient()
    client.force_authenticate(user=bwp_setup["manager"])

    url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/"
    payload = {
        "name": "Network upgrade in server room",
        "state_id": str(bwp_setup["state"].id),
        "room": 105,
        "notes": "Bring replacement CAT6 cables",
        "supporter_ids": [str(bwp_setup["supporter_user"].id)],
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    issue_id = response.data["id"]

    # Verify IssueSupporter record created in DB
    assert IssueSupporter.objects.filter(issue_id=issue_id, supporter=bwp_setup["supporter_user"]).exists()

    # Retrieve issue details
    get_url = f"/api/workspaces/{bwp_setup['workspace'].slug}/projects/{bwp_setup['project'].id}/issues/{issue_id}/"
    get_resp = client.get(get_url)
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.data["room"] == 105
    assert get_resp.data["notes"] == "Bring replacement CAT6 cables"
    assert len(get_resp.data["supporter_details"]) == 1
    assert get_resp.data["supporter_details"][0]["id"] == str(bwp_setup["supporter_user"].id)
