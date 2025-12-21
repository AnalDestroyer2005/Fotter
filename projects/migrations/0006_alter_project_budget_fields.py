from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0005_project_owner"),
    ]

    operations = [
        migrations.AlterField(
            model_name="project",
            name="budget_min",
            field=models.DecimalField(
                max_digits=12, decimal_places=2, null=True, blank=True
            ),
        ),
        migrations.AlterField(
            model_name="project",
            name="budget_max",
            field=models.DecimalField(
                max_digits=12, decimal_places=2, null=True, blank=True
            ),
        ),
    ]
