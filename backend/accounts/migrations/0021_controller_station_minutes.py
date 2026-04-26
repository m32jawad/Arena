from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_generalsetting_leaderboard_display'),
    ]

    operations = [
        migrations.AddField(
            model_name='controller',
            name='station_minutes',
            field=models.PositiveIntegerField(
                default=10,
                help_text='Time limit in minutes for this specific station',
            ),
        ),
    ]
