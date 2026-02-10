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
    path('storylines/<int:pk>/', views.storyline_detail, name='storyline-detail'),
    path('dashboard-theme/', views.dashboard_theme_view, name='dashboard-theme'),
]
