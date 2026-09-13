# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import re

# Django imports
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

# Third party modules
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import is_super_admin
from plane.app.views.base import BaseAPIView
from plane.db.models import Profile, Project, ProjectMember, User, Workspace, WorkspaceMember
from plane.utils.cache import invalidate_cache_directly


class DirectMemberCreateEndpoint(BaseAPIView):
    """
    Endpoint to directly create user accounts and provision memberships
    without requiring email invitations. Plaintext credentials are returned
    in the response for one-time display.
    """

    def post(self, request, slug):
        try:
            workspace = Workspace.objects.get(slug=slug)
        except Workspace.DoesNotExist:
            return Response(
                {"error": "Không gian làm việc không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data or {}
        display_name = data.get("display_name")
        username = data.get("username")
        password = data.get("password")
        email = data.get("email")
        role = data.get("role", 15)
        project_id = data.get("project_id")
        project_role = data.get("project_role", 15)

        # Validate project if project_id is provided
        project = None
        if project_id:
            try:
                project = Project.objects.filter(id=project_id, workspace=workspace).first()
            except Exception:
                project = None
            if not project:
                return Response(
                    {"error": "Phòng ban / Dự án không tồn tại trong Không gian làm việc này."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Permission check
        is_caller_super = is_super_admin(request.user)
        is_authenticated = bool(request.user and not getattr(request.user, "is_anonymous", True))
        is_caller_ws_admin = (
            is_authenticated
            and WorkspaceMember.objects.filter(
                workspace=workspace, member=request.user, role=20, is_active=True
            ).exists()
        )

        if project_id:
            is_caller_dept_admin = (
                is_authenticated
                and ProjectMember.objects.filter(
                    workspace=workspace, project_id=project_id, member=request.user, role=20, is_active=True
                ).exists()
            )
            if not (is_caller_super or is_caller_ws_admin or is_caller_dept_admin):
                return Response(
                    {"error": "Bạn không có quyền thêm thành viên vào phòng ban hoặc không gian làm việc này."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            if not (is_caller_super or is_caller_ws_admin):
                return Response(
                    {"error": "Bạn không có quyền tạo thành viên trực tiếp trong không gian làm việc này."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Validate display_name
        if not display_name or not str(display_name).strip():
            return Response(
                {"error": "Tên hiển thị là bắt buộc."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        display_name = str(display_name).strip()

        # Validate username
        if not username or not str(username).strip():
            return Response(
                {"error": "Tên người dùng là bắt buộc."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username = str(username).strip().lower()
        if not re.match(r"^[a-z0-9_]{3,30}$", username):
            return Response(
                {"error": "Tên người dùng phải từ 3 đến 30 ký tự và chỉ chứa chữ cái thường, số và dấu gạch dưới."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"error": "Tên người dùng đã tồn tại."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate password
        if not password or len(str(password)) < 6:
            return Response(
                {"error": "Mật khẩu phải có ít nhất 6 ký tự."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        password = str(password)

        # Validate email
        if email is not None and str(email).strip():
            email = str(email).strip().lower()
            try:
                validate_email(email)
            except ValidationError:
                return Response(
                    {"error": "Địa chỉ email không hợp lệ."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if User.objects.filter(email__iexact=email).exists():
                return Response(
                    {"error": "Email đã tồn tại."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            email = None

        # Validate role
        if role is None:
            role = 15
        else:
            try:
                role = int(role)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Vai trò không gian làm việc không hợp lệ."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if role not in [5, 15, 20]:
            return Response(
                {"error": "Vai trò không gian làm việc không hợp lệ (chấp nhận: 5, 15, 20)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only SuperAdmin or Workspace Admin can grant role=20 in workspace
        if role == 20 and not (is_caller_super or is_caller_ws_admin):
            return Response(
                {"error": "Chỉ Quản trị viên Không gian làm việc mới có quyền cấp vai trò Quản trị viên đơn vị."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validate project_role if project is provided
        if project:
            if project_role is None:
                project_role = 15
            else:
                try:
                    project_role = int(project_role)
                except (ValueError, TypeError):
                    return Response(
                        {"error": "Vai trò phòng ban không hợp lệ."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if project_role not in [5, 15, 20]:
                return Response(
                    {"error": "Vai trò phòng ban không hợp lệ (chấp nhận: 5, 15, 20)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Atomic user and membership creation
        with transaction.atomic():
            user = User.objects.create(
                username=username,
                display_name=display_name,
                email=email,
                is_password_autoset=False,
                is_active=True,
            )
            user.set_password(password)
            user.save()

            Profile.objects.get_or_create(user=user)

            WorkspaceMember.objects.create(
                workspace=workspace,
                member=user,
                role=role,
                is_active=True,
            )

            if project:
                ProjectMember.objects.create(
                    workspace=workspace,
                    project=project,
                    member=user,
                    role=project_role,
                    is_active=True,
                )

        try:
            invalidate_cache_directly(
                path=f"/api/workspaces/{slug}/members/",
                multiple=True,
                user=False,
            )
        except Exception:
            pass

        response_data = {
            "id": str(user.id),
            "username": user.username,
            "display_name": user.display_name,
            "email": user.email,
            "role": role,
            "credentials": {
                "username": user.username,
                "password": password,
            },
        }
        if project:
            response_data["project_id"] = str(project.id)
            response_data["project_role"] = project_role

        return Response(response_data, status=status.HTTP_201_CREATED)
