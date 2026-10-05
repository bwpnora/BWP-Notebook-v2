# apps/api/plane/tests/unit/utils/test_issue_filterset_bwp.py
from uuid import uuid4

import pytest

from plane.db.models import Issue, IssueSupporter, IssueType, Project, ProjectMember, User
from plane.utils.filters.filterset import IssueFilterSet


@pytest.fixture
def project(db, workspace, create_user):
    project = Project.objects.create(
        name="BWP Filter Project", identifier="BFP", workspace=workspace, created_by=create_user
    )
    ProjectMember.objects.create(project=project, member=create_user, role=20, is_active=True)
    return project


@pytest.fixture
def supporter(db):
    suffix = uuid4().hex[:8]
    return User.objects.create(email=f"sup-{suffix}@bwp.vn", username=f"sup_{suffix}")


@pytest.fixture
def types(db, workspace, create_user):
    operational = IssueType.objects.create(
        workspace=workspace, name="Công việc vận hành", external_id="operational", created_by=create_user
    )
    other_by_external_id = IssueType.objects.create(
        workspace=workspace, name="Khác (ext)", external_id="other", created_by=create_user
    )
    other_by_name = IssueType.objects.create(
        workspace=workspace, name="Công việc khác", external_id=None, created_by=create_user
    )
    return {"operational": operational, "other_ext": other_by_external_id, "other_name": other_by_name}


def _issue(project, user, name, **kwargs):
    return Issue.objects.create(
        name=name, project=project, workspace=project.workspace, created_by=user, **kwargs
    )


def _filter(project, data):
    qs = Issue.objects.filter(project=project)
    fs = IssueFilterSet(data=data, queryset=qs)
    assert fs.is_valid(), fs.errors
    return set(fs.qs.values_list("name", flat=True))


@pytest.mark.unit
class TestDeclaredKeys:
    def test_new_keys_are_declared_for_complex_filter_backend(self):
        for key in [
            "supporter_id",
            "supporter_id__exact",
            "supporter_id__in",
            "work_type",
            "work_type__exact",
            "work_type__in",
            "room_search",
            "room_search__exact",
        ]:
            assert key in IssueFilterSet.base_filters, key


@pytest.mark.unit
class TestSupporterFilter:
    def test_in_matches_active_supporter_only(self, project, create_user, supporter):
        with_supporter = _issue(project, create_user, "with")
        removed = _issue(project, create_user, "removed")
        _issue(project, create_user, "without")
        IssueSupporter.objects.create(
            issue=with_supporter, supporter=supporter, project=project, workspace=project.workspace
        )
        link = IssueSupporter.objects.create(
            issue=removed, supporter=supporter, project=project, workspace=project.workspace
        )
        link.delete()  # soft delete

        assert _filter(project, {"supporter_id__in": str(supporter.id)}) == {"with"}
        assert _filter(project, {"supporter_id": str(supporter.id)}) == {"with"}


@pytest.mark.unit
class TestRoomSearchFilter:
    @pytest.fixture
    def rooms(self, project, create_user):
        _issue(project, create_user, "r1733", room=1733)
        _issue(project, create_user, "r170", room=170)
        _issue(project, create_user, "r217", room=217)
        _issue(project, create_user, "r101", room=101)
        _issue(project, create_user, "no-room", room=None)

    def test_partial_match(self, project, rooms):
        assert _filter(project, {"room_search__exact": "17"}) == {"r1733", "r170", "r217"}

    def test_exact_number_matches_itself(self, project, rooms):
        assert _filter(project, {"room_search": "101"}) == {"r101"}

    def test_non_digit_value_is_noop(self, project, rooms):
        assert _filter(project, {"room_search": "abc"}) == {"r1733", "r170", "r217", "r101", "no-room"}


@pytest.mark.unit
class TestWorkTypeFilter:
    @pytest.fixture
    def typed(self, project, create_user, types):
        _issue(project, create_user, "op", type=types["operational"])
        _issue(project, create_user, "other-ext", type=types["other_ext"])
        _issue(project, create_user, "other-name", type=types["other_name"])
        _issue(project, create_user, "untyped", type=None)

    def test_other(self, project, typed):
        assert _filter(project, {"work_type__in": "other"}) == {"other-ext", "other-name"}

    def test_operational_includes_untyped(self, project, typed):
        assert _filter(project, {"work_type": "operational"}) == {"op", "untyped"}

    def test_both_values_is_noop(self, project, typed):
        assert _filter(project, {"work_type__in": "operational,other"}) == {
            "op",
            "other-ext",
            "other-name",
            "untyped",
        }


@pytest.mark.unit
class TestCombined:
    def test_and_across_keys(self, project, create_user, types):
        _issue(project, create_user, "match", room=1701, type=types["other_ext"])
        _issue(project, create_user, "wrong-type", room=1701, type=types["operational"])
        _issue(project, create_user, "wrong-room", room=200, type=types["other_ext"])
        assert _filter(project, {"room_search": "17", "work_type__in": "other"}) == {"match"}
