from django.urls import path
from . import views

urlpatterns = [
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
    path('controllers/', views.controller_list_create, name='controller-list-create'),
    path('controllers/<int:pk>/', views.controller_detail, name='controller-detail'),
    path('controller-test/', views.controller_test_page, name='controller-test'),

    # Pending Signup
    path('public/signup/', views.public_signup, name='public-signup'),
    path('pending/', views.pending_list, name='pending-list'),
    path('pending/<int:pk>/approve/', views.pending_approve, name='pending-approve'),
    path('pending/<int:pk>/reject/', views.pending_reject, name='pending-reject'),
]
