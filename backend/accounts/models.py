from django.db import models


class GeneralSetting(models.Model):
    """Singleton model – only one row should ever exist."""
    arena_name = models.CharField(max_length=255, blank=True, default='')
    time_zone = models.CharField(max_length=100, blank=True, default='')
    date_format = models.CharField(max_length=100, blank=True, default='')
    session_length = models.CharField(max_length=100, blank=True, default='')
    session_presets = models.CharField(max_length=255, blank=True, default='')
    allow_extension = models.BooleanField(default=False)
    allow_reduction = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'General Setting'
        verbose_name_plural = 'General Settings'

    def __str__(self):
        return self.arena_name or 'General Settings'

    def save(self, *args, **kwargs):
        # enforce singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class DashboardTheme(models.Model):
    """Singleton model for the admin dashboard theme."""
    BACKGROUND_TYPES = [
        ('solid', 'Solid Color'),
        ('gradient', 'Gradient'),
        ('image', 'Image'),
    ]
    background_type = models.CharField(max_length=10, choices=BACKGROUND_TYPES, default='solid')
    background_value = models.CharField(
        max_length=500, blank=True, default='#F9FAFB',
        help_text='Hex color, CSS gradient, or leave blank when using image',
    )
    background_image = models.ImageField(upload_to='themes/', blank=True, null=True)
    sidebar_bg = models.CharField(max_length=20, blank=True, default='#FFFFFF')
    sidebar_text = models.CharField(max_length=20, blank=True, default='#4B5563')
    sidebar_active_bg = models.CharField(max_length=20, blank=True, default='#F3F4F6')
    sidebar_active_text = models.CharField(max_length=20, blank=True, default='#1F2937')
    primary_color = models.CharField(max_length=20, blank=True, default='#CB30E0')
    heading_font = models.CharField(max_length=100, blank=True, default='')
    text_font = models.CharField(max_length=100, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Dashboard Theme'

    def __str__(self):
        return 'Dashboard Theme'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Storyline(models.Model):
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='storylines/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PendingSignup(models.Model):
    """Stores signup requests waiting for admin approval."""
    party_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, default='')
    team_size = models.PositiveIntegerField(default=1)
    receive_offers = models.BooleanField(default=False)
    storyline = models.ForeignKey(
        Storyline, on_delete=models.SET_NULL, null=True, blank=True
    )
    # profile pic: either an uploaded selfie or an avatar identifier
    profile_photo = models.ImageField(upload_to='signups/', blank=True, null=True)
    avatar_id = models.CharField(max_length=50, blank=True, default='')
    rfid_tag = models.CharField(max_length=100, blank=True, default='')
    session_minutes = models.PositiveIntegerField(default=10)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.party_name} ({self.status})'


class Controller(models.Model):
    name = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    cpu_usage = models.CharField(max_length=50, blank=True, default='')
    storage_usage = models.CharField(max_length=100, blank=True, default='')
    cpu_temperature = models.CharField(max_length=50, blank=True, default='')
    ram_usage = models.CharField(max_length=50, blank=True, default='')
    system_uptime = models.CharField(max_length=100, blank=True, default='')
    voltage_power_status = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.name} ({self.ip_address})'
