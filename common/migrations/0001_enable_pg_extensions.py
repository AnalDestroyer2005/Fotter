from django.db import migrations

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.RunSQL("CREATE EXTENSION IF NOT EXISTS pg_trgm;"),
        migrations.RunSQL("CREATE EXTENSION IF NOT EXISTS citext;"),
    ]
