import pytest
from unittest.mock import MagicMock, patch
from plane.app.permissions.base import is_super_admin
from plane.license.models import Instance, InstanceAdmin
from plane.db.models import User
from plane.app.permissions.workspace import WorkSpaceBasePermission
from plane.app.permissions.project import ProjectBasePermission
from plane.app.views.project.base import ProjectViewSet


@pytest.mark.django_db
def test_is_super_admin():
    normal_user = User.objects.create(username="normal_user", email="normal@test.com")
    assert is_super_admin(normal_user) is False

    super_user = User.objects.create(username="super_user", email="super@test.com", is_superuser=True)
    assert is_super_admin(super_user) is True

    instance = Instance.objects.create(instance_id="inst_1", current_version="1.0")
    instance_admin_user = User.objects.create(username="inst_admin", email="inst@test.com")
    InstanceAdmin.objects.create(instance=instance, user=instance_admin_user, role=20)
    assert is_super_admin(instance_admin_user) is True


@pytest.mark.django_db
def test_is_super_admin_threshold_and_edge_cases():
    assert is_super_admin(None) is False

    anon_user = MagicMock()
    anon_user.is_anonymous = True
    assert is_super_admin(anon_user) is False

    instance = Instance.objects.create(instance_id="inst_threshold", current_version="1.0")

    admin_15 = User.objects.create(username="admin_15", email="admin_15@test.com")
    InstanceAdmin.objects.create(instance=instance, user=admin_15, role=15)
    assert is_super_admin(admin_15) is True

    admin_10 = User.objects.create(username="admin_10", email="admin_10@test.com")
    InstanceAdmin.objects.create(instance=instance, user=admin_10, role=10)
    assert is_super_admin(admin_10) is False


@pytest.mark.django_db
def test_workspace_base_permission_post():
    permission = WorkSpaceBasePermission()
    normal_user = User.objects.create(username="ws_normal", email="ws_normal@test.com")
    super_user = User.objects.create(username="ws_super", email="ws_super@test.com", is_superuser=True)

    view = MagicMock()
    request_post_normal = MagicMock(method="POST", user=normal_user)
    assert permission.has_permission(request_post_normal, view) is False

    request_post_super = MagicMock(method="POST", user=super_user)
    assert permission.has_permission(request_post_super, view) is True


@pytest.mark.django_db
def test_project_base_permission_post():
    permission = ProjectBasePermission()
    normal_user = User.objects.create(username="proj_normal", email="proj_normal@test.com")
    super_user = User.objects.create(username="proj_super", email="proj_super@test.com", is_superuser=True)

    view = MagicMock()
    request_post_normal = MagicMock(method="POST", user=normal_user)
    assert permission.has_permission(request_post_normal, view) is False

    request_post_super = MagicMock(method="POST", user=super_user)
    assert permission.has_permission(request_post_super, view) is True


@pytest.mark.django_db
def test_project_viewset_create_guard():
    viewset = ProjectViewSet()
    normal_user = User.objects.create(username="ws_creator_normal", email="ws_cr_norm@test.com")
    request = MagicMock(method="POST", user=normal_user)
    response = viewset.create(request, slug="any-slug")
    assert response.status_code == 403
    assert "Chỉ Quản trị viên cấp cao" in response.data.get("error", "")


@pytest.mark.django_db
def test_project_viewset_partial_update_lead_guard():
    viewset = ProjectViewSet()
    normal_user = User.objects.create(username="ws_lead_normal", email="ws_lead_norm@test.com")
    project = MagicMock(project_lead_id="lead-1")

    with patch("plane.app.views.project.base.Project.objects.get", return_value=project), \
         patch("plane.app.views.project.base.WorkspaceMember.objects.filter") as mock_wm, \
         patch("plane.app.views.project.base.Workspace.objects.get"):
        mock_wm.return_value.exists.return_value = True

        request = MagicMock(
            method="PATCH",
            user=normal_user,
            data={"project_lead": "lead-2"}
        )
        response = viewset.partial_update(request, slug="any-slug", pk="any-pk")
        assert response.status_code == 403
        assert "Chỉ Quản trị viên cấp cao" in response.data.get("error", "")
