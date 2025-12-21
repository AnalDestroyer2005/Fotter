from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_project_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="deadline",
            field=models.PositiveIntegerField(blank=True, null=True, help_text="Срок в днях"),
        ),
    ]
