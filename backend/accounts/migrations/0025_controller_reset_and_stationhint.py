# Generated for per-station reset config and per-storyline audio hints

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0024_pendingsignup_leaderboard_hidden'),
    ]

    operations = [
        migrations.AddField(
            model_name='controller',
            name='requires_staff_reset',
            field=models.BooleanField(
                default=True,
                help_text='If True, a staff card must be scanned to reset this station between groups. '
                          'If False, the station auto-resets after auto_reset_seconds.',
            ),
        ),
        migrations.AddField(
            model_name='controller',
            name='auto_reset_seconds',
            field=models.PositiveIntegerField(
                default=20,
                help_text='Cooldown in seconds before the station auto-resets for the next group '
                          '(only used when requires_staff_reset is False).',
            ),
        ),
        migrations.AlterField(
            model_name='controller',
            name='hint_audio',
            field=models.FileField(
                blank=True, null=True, upload_to='hints/',
                help_text='Default audio hint for this station (used when no storyline-specific hint is set)',
            ),
        ),
        migrations.CreateModel(
            name='StationHint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hint_audio', models.FileField(help_text='Audio hint played at this station for this storyline', upload_to='hints/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('controller', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='storyline_hints', to='accounts.controller')),
                ('storyline', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='station_hints', to='accounts.storyline')),
            ],
            options={
                'ordering': ['controller_id', 'storyline_id'],
                'unique_together': {('controller', 'storyline')},
            },
        ),
    ]
