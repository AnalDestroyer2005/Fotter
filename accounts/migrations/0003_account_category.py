from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("taxonomy", "0001_initial"),
        ("accounts", "0002_services_portfolio_customskills"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="category",
            field=models.ForeignKey(
                blank=True,
                help_text="Специализация пользователя",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="accounts",
                to="taxonomy.category",
            ),
        ),
    ]
