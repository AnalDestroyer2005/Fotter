from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0004_project_deadline"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="owner",
            field=models.ForeignKey(
                related_name="projects",
                null=True,
                blank=True,
                on_delete=models.SET_NULL,
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
