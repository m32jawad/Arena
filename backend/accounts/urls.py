from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf_token, name='csrf-token'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('staff/', views.staff_list_create, name='staff-list-create'),
    path('staff/<int:pk>/', views.staff_detail, name='staff-detail'),
    path('staff/<int:pk>/toggle-block/', views.staff_toggle_block, name='staff-toggle-block'),
    path('general-settings/', views.general_settings_view, name='general-settings'),
    path('storylines/', views.storyline_list_create, name='storyline-list-create'),
    path('public/storylines/', views.public_storyline_list, name='public-storyline-list'),
    path('storylines/<int:pk>/', views.storyline_detail, name='storyline-detail'),
    path('dashboard-theme/', views.dashboard_theme_view, name='dashboard-theme'),
    path('app-theme/', views.app_theme_view, name='app-theme'),
    path('controllers/', views.controller_list_create, name='controller-list-create'),
    path('controllers/<int:pk>/', views.controller_detail, name='controller-detail'),
    path('controllers/<int:pk>/restart-service/', views.controller_restart_service, name='controller-restart-service'),
    path('controller-test/', views.controller_test_page, name='controller-test'),

    # Pending Signup
    path('public/signup/', views.public_signup, name='public-signup'),
    path('pending/', views.pending_list, name='pending-list'),
    path('pending/<int:pk>/approve/', views.pending_approve, name='pending-approve'),
    path('pending/<int:pk>/reject/', views.pending_reject, name='pending-reject'),

    # Sessions
    path('sessions/live/', views.live_sessions, name='live-sessions'),
    path('sessions/ended/', views.ended_sessions, name='ended-sessions'),
    path('sessions/<int:pk>/end/', views.end_session, name='end-session'),
    path('sessions/<int:pk>/update/', views.update_session, name='update-session'),
    path('sessions/<int:pk>/checkpoints/add/', views.add_checkpoint, name='add-checkpoint'),
    path('sessions/<int:pk>/checkpoints/<int:checkpoint_id>/remove/', views.remove_checkpoint, name='remove-checkpoint'),

    # RFID endpoints (hardware / controller facing)
    path('rfid/start/', views.rfid_start_session, name='rfid-start-session'),
    path('rfid/stop/', views.rfid_stop_session, name='rfid-stop-session'),
    path('rfid/checkpoint/', views.rfid_checkpoint, name='rfid-checkpoint'),
    path('rfid/status/', views.rfid_status, name='rfid-status'),
    path('rfid/check-staff/', views.rfid_check_staff, name='rfid-check-staff'),
    path('rfid/station-recent/', views.station_recent_scans, name='station-recent-scans'),
    path('rfid-test/', views.rfid_test_page, name='rfid-test'),

    # Station health reporting (called by station hardware)
    path('controllers/health/', views.controller_health_update, name='controller-health-update'),

    # Public leaderboard
    path('public/leaderboard/', views.public_leaderboard, name='public-leaderboard'),
    path('public/leaderboard-settings/', views.public_leaderboard_settings, name='public-leaderboard-settings'),

    # Leaderboard test page
    path('leaderboard-test/', views.leaderboard_test_page, name='leaderboard-test'),
    path('test/create-team/', views.test_create_team, name='test-create-team'),
    path('test/update-points/<int:pk>/', views.test_update_points, name='test-update-points'),
    path('test/clear-checkpoint/', views.test_clear_checkpoint, name='test-clear-checkpoint'),
    path('test/delete-team/<int:pk>/', views.test_delete_team, name='test-delete-team'),
    path('test/reset-all/', views.test_reset_all, name='test-reset-all'),
    path('public/controllers/', views.public_controllers, name='public-controllers'),

    # Audit log
    path('audit-logs/', views.audit_log_list, name='audit-log-list'),

    # Email subscribers
    path('email-subscribers/', views.email_subscribers, name='email-subscribers'),
    path('email-subscribers/csv/', views.email_subscribers_csv, name='email-subscribers-csv'),
    path('email-subscribers/bulk-delete/', views.email_subscribers_bulk_delete, name='email-subscribers-bulk-delete'),
    path('email-subscribers/<int:pk>/delete/', views.email_subscriber_delete, name='email-subscriber-delete'),

    # Admin leaderboard management
    path('leaderboard/', views.admin_leaderboard, name='admin-leaderboard'),
    path('sessions/bulk-delete/', views.sessions_bulk_delete, name='sessions-bulk-delete'),
    path('sessions/<int:pk>/toggle-leaderboard/', views.toggle_leaderboard_hidden, name='toggle-leaderboard-hidden'),
    path('sessions/<int:pk>/delete/', views.session_delete, name='session-delete'),
]
