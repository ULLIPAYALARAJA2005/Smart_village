from django.urls import path

from .views import (
    approve_user,
    reject_user,
    signup_requests,
    create_worker,
    list_admin_workers,
    reset_worker_password,
)


urlpatterns = [
    path("requests/", signup_requests),
    path("approve/<int:id>/", approve_user),
    path("reject/<int:id>/", reject_user),
    path("workers/", list_admin_workers),
    path("workers/create/", create_worker),
    path("workers/<int:id>/reset-password/", reset_worker_password),
]
