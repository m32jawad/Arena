from django.db import models
from django.contrib.auth.models import User


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
    points = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('ended', 'Ended'),
            ('rejected', 'Rejected'),
        ],
        default='pending',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Session timing fields (tracking actual playtime)
    started_at = models.DateTimeField(
        null=True, blank=True,
        help_text='First time the session was started (player began playing)',
    )
    last_started_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Most recent start/resume time (null when paused)',
    )
    total_elapsed_seconds = models.PositiveIntegerField(
        default=0,
        help_text='Accumulated playtime in seconds across all start/stop cycles',
    )
    is_playing = models.BooleanField(
        default=False,
        help_text='True if session is currently active (between start and stop)',
    )
    ended_at = models.DateTimeField(
        null=True, blank=True,
        help_text='When the session was fully ended',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.party_name} ({self.status})'
    
    def get_elapsed_seconds(self):
        """Calculate total elapsed playtime in seconds.
        
        If currently playing, includes time since last_started_at.
        Otherwise, returns accumulated total_elapsed_seconds.
        """
        from django.utils import timezone
        
        elapsed = self.total_elapsed_seconds
        
        if self.is_playing and self.last_started_at:
            # Add current session time
            current_duration = (timezone.now() - self.last_started_at).total_seconds()
            elapsed += current_duration
        
        return int(elapsed)
    
    def get_remaining_seconds(self):
        """Calculate remaining playtime in seconds based on session_minutes."""
        total_allowed = self.session_minutes * 60
        elapsed = self.get_elapsed_seconds()
        return max(0, total_allowed - elapsed)


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


class Checkpoint(models.Model):
    """Records when a player clears a checkpoint (controller station)."""
    session = models.ForeignKey(
        'PendingSignup', on_delete=models.CASCADE, related_name='checkpoints'
    )
    controller = models.ForeignKey(
        Controller, on_delete=models.CASCADE, related_name='checkpoints'
    )
    cleared_at = models.DateTimeField(auto_now_add=True)
    points_earned = models.PositiveIntegerField(
        default=0,
        help_text='Total points earned for clearing this checkpoint (base + time bonus)'
    )

    class Meta:
        ordering = ['cleared_at']
        unique_together = [('session', 'controller')]

    def __str__(self):
        return f'{self.session.party_name} @ {self.controller.name}'


class StaffProfile(models.Model):
    """Stores additional information for staff members, including RFID tag."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='staff_profile'
    )
    rfid_tag = models.CharField(
        max_length=100, blank=True, default='',
        help_text='RFID tag for staff identification and controller operations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Staff Profile'
        verbose_name_plural = 'Staff Profiles'

    def __str__(self):
        return f'{self.user.username} - RFID Profile'

