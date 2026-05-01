# Generated migration — adds leaderboard_rotation_seconds field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0022_alter_checkpoint_points_earned'),
    ]

    operations = [
        migrations.AddField(
            model_name='generalsetting',
            name='leaderboard_rotation_seconds',
            field=models.PositiveIntegerField(default=60),
        ),
    ]
