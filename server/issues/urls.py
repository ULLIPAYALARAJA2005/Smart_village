from django.urls import path
from .views import (
    issue_list,
    update_issue_status,
    issues_map,
    issues_all,
    assign_worker,
    worker_assignments,
    assignment_action,
    verify_assignment,
    assignment_stats,
    list_workers,
    manage_issue,
)

urlpatterns = [
    # Manage registered complaint before worker assignment (Edit / Delete)
    path("manage/<int:issue_id>/", manage_issue, name="manage_issue"),
    path("<int:issue_id>/manage/", manage_issue, name="manage_issue_alt"),
    path("<int:issue_id>/delete/", manage_issue, name="delete_issue"),
    path("<int:issue_id>/update/", manage_issue, name="update_issue"),

    # Specific endpoints first
    path("map/all/", issues_map, name="issues_map"),
    path("all/", issues_all, name="issues_all"),
    path("assign/<int:issue_id>/", assign_worker, name="assign_worker_alt"),
    path("<int:issue_id>/assign/", assign_worker, name="assign_worker"),
    path("worker/assignments/", worker_assignments, name="worker_assignments"),
    path("worker/assignments/<int:assignment_id>/<str:action>/", assignment_action, name="assignment_action"),
    path("admin/assignments/<int:assignment_id>/verify/", verify_assignment, name="verify_assignment"),
    path("admin/stats/", assignment_stats, name="assignment_stats"),
    path("admin/workers/", list_workers, name="list_workers"),

    # Category endpoints
    path("status/<str:category>/<int:id>/", update_issue_status, name="update_issue_status"),
    path("<str:category>/", issue_list, name="issue_list"),
]
