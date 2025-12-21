from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("taxonomy", "0001_initial"),
        ("projects", "0002_order_review"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projects",
                to="taxonomy.Category",
            ),
        ),
    ]
