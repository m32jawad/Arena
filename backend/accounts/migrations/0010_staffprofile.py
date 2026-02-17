# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0009_checkpoint'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rfid_tag', models.CharField(blank=True, default='', help_text='RFID tag for staff identification and controller operations', max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='staff_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Staff Profile',
                'verbose_name_plural': 'Staff Profiles',
            },
        ),
    ]
