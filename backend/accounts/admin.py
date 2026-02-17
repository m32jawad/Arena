from django.contrib import admin
from .models import GeneralSetting, DashboardTheme, Storyline, PendingSignup, Controller, Checkpoint, StaffProfile


@admin.register(GeneralSetting)
class GeneralSettingAdmin(admin.ModelAdmin):
    list_display = ('arena_name', 'time_zone', 'session_length', 'updated_at')


@admin.register(DashboardTheme)
class DashboardThemeAdmin(admin.ModelAdmin):
    list_display = ('background_type', 'primary_color', 'updated_at')


@admin.register(Storyline)
class StorylineAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title',)


@admin.register(PendingSignup)
class PendingSignupAdmin(admin.ModelAdmin):
    list_display = ('party_name', 'status', 'team_size', 'points', 'rfid_tag', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('party_name', 'email', 'rfid_tag')


@admin.register(Controller)
class ControllerAdmin(admin.ModelAdmin):
    list_display = ('name', 'ip_address', 'cpu_usage', 'cpu_temperature', 'updated_at')
    search_fields = ('name', 'ip_address')


@admin.register(Checkpoint)
class CheckpointAdmin(admin.ModelAdmin):
    list_display = ('session', 'controller', 'cleared_at')
    list_filter = ('cleared_at',)


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'rfid_tag', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'rfid_tag')
    list_filter = ('created_at',)

