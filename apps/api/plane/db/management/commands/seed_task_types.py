# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# Code & Architecture by IT Leon (BWP Engineering Team)

from django.core.management.base import BaseCommand
from plane.db.models import Workspace, IssueType, Project, ProjectIssueType
from plane.db.models.issue_type import DEFAULT_TASK_TYPES, TASK_TYPE_OPERATIONAL


class Command(BaseCommand):
    help = "Seed standard task types (Công việc vận hành, Công việc khác) across workspaces and notebooks"

    def handle(self, *args, **options):
        workspaces = Workspace.objects.all()
        if not workspaces.exists():
            self.stdout.write(self.style.WARNING("No workspaces found. Please create a workspace first."))
            return

        for ws in workspaces:
            for item in DEFAULT_TASK_TYPES:
                issue_type, created = IssueType.objects.get_or_create(
                    workspace=ws,
                    external_id=item["external_id"],
                    defaults={
                        "name": item["name"],
                        "description": item["description"],
                        "is_default": item["is_default"],
                        "is_active": item["is_active"],
                    },
                )
                if created:
                    self.stdout.write(f"Created task type '{item['name']}' in workspace '{ws.name}'")
                else:
                    # Update name/description if changed
                    if issue_type.name != item["name"] or issue_type.description != item["description"]:
                        issue_type.name = item["name"]
                        issue_type.description = item["description"]
                        issue_type.save(update_fields=["name", "description"])

            # Link task types to all projects in workspace
            for project in Project.objects.filter(workspace=ws):
                for it in IssueType.objects.filter(workspace=ws, external_id__in=["operational", "other"]):
                    ProjectIssueType.objects.get_or_create(
                        project=project,
                        issue_type=it,
                        defaults={
                            "workspace": ws,
                            "is_default": (it.external_id == TASK_TYPE_OPERATIONAL),
                        },
                    )

        self.stdout.write(self.style.SUCCESS("Standard task types seeded successfully! - Code by IT Leon"))
