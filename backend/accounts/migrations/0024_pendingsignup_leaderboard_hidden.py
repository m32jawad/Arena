from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0023_generalsetting_leaderboard_rotation_seconds'),
    ]

    operations = [
        migrations.AddField(
            model_name='pendingsignup',
            name='leaderboard_hidden',
            field=models.BooleanField(default=False, help_text='If True, this entry is hidden from the public leaderboard'),
        ),
    ]
