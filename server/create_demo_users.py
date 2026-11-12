import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main_app.settings")
django.setup()

from users.models import User

def setup():
    # Admin
    admin, created = User.objects.get_or_create(
        username="admin",
        defaults={"role": "admin", "status": "approved", "is_staff": True, "is_superuser": True, "email": "admin@smartvillage.gov"}
    )
    admin.set_password("admin123")
    admin.role = "admin"
    admin.status = "approved"
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    print("Admin user ready: admin / admin123")

    # Worker
    worker, created = User.objects.get_or_create(
        username="worker1",
        defaults={"role": "worker", "status": "approved", "email": "worker1@smartvillage.gov"}
    )
    worker.set_password("worker123")
    worker.role = "worker"
    worker.status = "approved"
    worker.save()
    print("Worker user ready: worker1 / worker123")

    # Villager
    villager, created = User.objects.get_or_create(
        username="villager1",
        defaults={"role": "villager", "status": "approved", "aadhar": "123456789012", "email": "villager1@smartvillage.gov"}
    )
    villager.set_password("villager123")
    villager.role = "villager"
    villager.status = "approved"
    villager.aadhar = "123456789012"
    villager.save()
    print("Villager user ready: villager1 / villager123")

if __name__ == "__main__":
    setup()
