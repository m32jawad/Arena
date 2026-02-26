from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Storyline, GeneralSetting, DashboardTheme, AppTheme, Controller, PendingSignup, Checkpoint, StaffProfile


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    # Issue a CSRF cookie without performing any state change
    return Response({'detail': 'CSRF cookie set'})


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
        })
    else:
        return Response(
            {'error': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
    })


def _serialize_user(u):
    # Get or create staff profile for the user
    staff_profile, _ = StaffProfile.objects.get_or_create(user=u)
    return {
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'is_staff': u.is_staff,
        'is_superuser': u.is_superuser,
        'is_active': u.is_active,
        'rfid_tag': staff_profile.rfid_tag,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def staff_list_create(request):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        users = User.objects.all().order_by('id')
        return Response([_serialize_user(u) for u in users])

    # POST — create new user
    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    is_staff = data.get('is_staff', True)
    rfid_tag = data.get('rfid_tag', '').strip()

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_staff=is_staff,
    )
    
    # Create or update staff profile with RFID tag
    staff_profile, _ = StaffProfile.objects.get_or_create(user=user)
    staff_profile.rfid_tag = rfid_tag
    staff_profile.save()
    
    return Response(_serialize_user(user), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def staff_detail(request, pk):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_serialize_user(user))

    if request.method == 'PUT':
        data = request.data
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.is_staff = data.get('is_staff', user.is_staff)
        if 'is_active' in data:
            user.is_active = data['is_active']
        new_password = data.get('password', '').strip()
        if new_password:
            user.set_password(new_password)
        user.save()
        
        # Update staff profile RFID tag if provided
        if 'rfid_tag' in data:
            staff_profile, _ = StaffProfile.objects.get_or_create(user=user)
            staff_profile.rfid_tag = data.get('rfid_tag', '').strip()
            staff_profile.save()
        
        return Response(_serialize_user(user))

    if request.method == 'DELETE':
        if user.is_superuser:
            return Response({'error': 'Cannot delete a superuser.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'message': 'User deleted.'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_toggle_block(request, pk):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    user.is_active = not user.is_active
    user.save()
    return Response(_serialize_user(user))


# ── General Settings (singleton) ──

def _serialize_general_setting(gs):
    return {
        'arena_name': gs.arena_name,
        'time_zone': gs.time_zone,
        'date_format': gs.date_format,
        'session_length': gs.session_length,
        'session_presets': gs.session_presets,
        'allow_extension': gs.allow_extension,
        'allow_reduction': gs.allow_reduction,
    }


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def general_settings_view(request):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    gs = GeneralSetting.load()

    if request.method == 'GET':
        return Response(_serialize_general_setting(gs))

    # PUT – update
    data = request.data
    gs.arena_name = data.get('arena_name', gs.arena_name)
    gs.time_zone = data.get('time_zone', gs.time_zone)
    gs.date_format = data.get('date_format', gs.date_format)
    gs.session_length = data.get('session_length', gs.session_length)
    gs.session_presets = data.get('session_presets', gs.session_presets)
    if 'allow_extension' in data:
        gs.allow_extension = data['allow_extension']
    if 'allow_reduction' in data:
        gs.allow_reduction = data['allow_reduction']
    gs.save()
    return Response(_serialize_general_setting(gs))


# ── Storyline CRUD ──

def _serialize_storyline(s, request=None):
    image_url = ''
    if s.image:
        image_url = request.build_absolute_uri(s.image.url) if request else s.image.url
    return {
        'id': s.id,
        'title': s.title,
        'text': s.text,
        'image': image_url,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def public_storyline_list(request):
    storylines = Storyline.objects.all()
    return Response([_serialize_storyline(s, request) for s in storylines])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def storyline_list_create(request):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        storylines = Storyline.objects.all()
        return Response([_serialize_storyline(s, request) for s in storylines])

    # POST
    title = request.data.get('title', '').strip()
    text = request.data.get('text', '').strip()
    image = request.FILES.get('image')

    if not title:
        return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)

    storyline = Storyline.objects.create(title=title, text=text, image=image)
    return Response(_serialize_storyline(storyline, request), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def storyline_detail(request, pk):
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        storyline = Storyline.objects.get(pk=pk)
    except Storyline.DoesNotExist:
        return Response({'error': 'Storyline not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_serialize_storyline(storyline, request))

    if request.method == 'PUT':
        title = request.data.get('title', '').strip()
        if title:
            storyline.title = title
        text = request.data.get('text')
        if text is not None:
            storyline.text = text.strip()
        image = request.FILES.get('image')
        if image:
            storyline.image = image
        storyline.save()
        return Response(_serialize_storyline(storyline, request))

    if request.method == 'DELETE':
        storyline.delete()
        return Response({'message': 'Storyline deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ── Dashboard Theme (singleton) ──

def _serialize_theme(t, request=None):
    image_url = ''
    if t.background_image:
        image_url = request.build_absolute_uri(t.background_image.url) if request else t.background_image.url
    return {
        'background_type': t.background_type,
        'background_value': t.background_value,
        'background_image': image_url,
        'sidebar_bg': t.sidebar_bg,
        'sidebar_text': t.sidebar_text,
        'sidebar_active_bg': t.sidebar_active_bg,
        'sidebar_active_text': t.sidebar_active_text,
        'primary_color': t.primary_color,
        'heading_font': t.heading_font,
        'text_font': t.text_font,
    }


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def dashboard_theme_view(request):
    theme = DashboardTheme.load()

    if request.method == 'GET':
        return Response(_serialize_theme(theme, request))

    # PUT — only superusers may update
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    theme.background_type = data.get('background_type', theme.background_type)
    theme.background_value = data.get('background_value', theme.background_value)
    theme.sidebar_bg = data.get('sidebar_bg', theme.sidebar_bg)
    theme.sidebar_text = data.get('sidebar_text', theme.sidebar_text)
    theme.sidebar_active_bg = data.get('sidebar_active_bg', theme.sidebar_active_bg)
    theme.sidebar_active_text = data.get('sidebar_active_text', theme.sidebar_active_text)
    theme.primary_color = data.get('primary_color', theme.primary_color)
    theme.heading_font = data.get('heading_font', theme.heading_font)
    theme.text_font = data.get('text_font', theme.text_font)

    image = request.FILES.get('background_image')
    if image:
        theme.background_image = image
    # Allow clearing the image when switching away from image type
    if data.get('clear_background_image') == 'true':
        theme.background_image = None

    theme.save()
    return Response(_serialize_theme(theme, request))


# ── App Theme (Signup Page) ──

def _serialize_app_theme(t, request=None):
    image_url = ''
    if t.background_image:
        image_url = request.build_absolute_uri(t.background_image.url) if request else t.background_image.url
    
    video_url = ''
    if t.background_video:
        video_url = request.build_absolute_uri(t.background_video.url) if request else t.background_video.url
    
    return {
        'background_type': t.background_type,
        'background_value': t.background_value,
        'background_image': image_url,
        'background_video': video_url,
        'font_family': t.font_family,
        'font_color': t.font_color,
        'button_color': t.button_color,
        'button_text_color': t.button_text_color,
    }


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def app_theme_view(request):
    theme = AppTheme.load()

    if request.method == 'GET':
        return Response(_serialize_app_theme(theme, request))

    # PUT — only superusers may update
    if not request.user or not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    theme.background_type = data.get('background_type', theme.background_type)
    theme.background_value = data.get('background_value', theme.background_value)
    theme.font_family = data.get('font_family', theme.font_family)
    theme.font_color = data.get('font_color', theme.font_color)
    theme.button_color = data.get('button_color', theme.button_color)
    theme.button_text_color = data.get('button_text_color', theme.button_text_color)

    # Handle image upload
    image = request.FILES.get('background_image')
    if image:
        theme.background_image = image
    # Allow clearing the image when switching away from image type
    if data.get('clear_background_image') == 'true':
        theme.background_image = None

    # Handle video upload
    video = request.FILES.get('background_video')
    if video:
        theme.background_video = video
    # Allow clearing the video when switching away from video type
    if data.get('clear_background_video') == 'true':
        theme.background_video = None

    theme.save()
    return Response(_serialize_app_theme(theme, request))


# ── Controller CRUD ──

def _serialize_controller(c):
    return {
        'id': c.id,
        'name': c.name,
        'ip_address': c.ip_address,
        'cpu_usage': c.cpu_usage,
        'storage_usage': c.storage_usage,
        'cpu_temperature': c.cpu_temperature,
        'ram_usage': c.ram_usage,
        'system_uptime': c.system_uptime,
        'voltage_power_status': c.voltage_power_status,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def controller_list_create(request):
    if request.method == 'GET':
        controllers = Controller.objects.all()
        return Response([_serialize_controller(c) for c in controllers])

    # POST — only superusers may create
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    name = data.get('name', '').strip()
    ip_address = data.get('ip_address', '').strip()

    if not name or not ip_address:
        return Response({'error': 'Name and IP address are required.'}, status=status.HTTP_400_BAD_REQUEST)

    controller = Controller.objects.create(
        name=name,
        ip_address=ip_address,
        cpu_usage=data.get('cpu_usage', ''),
        storage_usage=data.get('storage_usage', ''),
        cpu_temperature=data.get('cpu_temperature', ''),
        ram_usage=data.get('ram_usage', ''),
        system_uptime=data.get('system_uptime', ''),
        voltage_power_status=data.get('voltage_power_status', ''),
    )
    return Response(_serialize_controller(controller), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def controller_detail(request, pk):
    try:
        controller = Controller.objects.get(pk=pk)
    except Controller.DoesNotExist:
        return Response({'error': 'Controller not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_serialize_controller(controller))

    # PUT / DELETE — only superusers
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        data = request.data
        controller.name = data.get('name', controller.name)
        controller.ip_address = data.get('ip_address', controller.ip_address)
        controller.cpu_usage = data.get('cpu_usage', controller.cpu_usage)
        controller.storage_usage = data.get('storage_usage', controller.storage_usage)
        controller.cpu_temperature = data.get('cpu_temperature', controller.cpu_temperature)
        controller.ram_usage = data.get('ram_usage', controller.ram_usage)
        controller.system_uptime = data.get('system_uptime', controller.system_uptime)
        controller.voltage_power_status = data.get('voltage_power_status', controller.voltage_power_status)
        controller.save()
        return Response(_serialize_controller(controller))

    if request.method == 'DELETE':
        controller.delete()
        return Response({'message': 'Controller deleted.'}, status=status.HTTP_204_NO_CONTENT)


def controller_test_page(request):
    from django.shortcuts import render
    return render(request, 'controller_test.html')


# ── Pending Signup (public create + admin list/approve/reject) ──

def _serialize_pending(p, request=None, include_checkpoints=False):
    photo_url = ''
    if p.profile_photo:
        photo_url = request.build_absolute_uri(p.profile_photo.url) if request else p.profile_photo.url
    
    data = {
        'id': p.id,
        'party_name': p.party_name,
        'email': p.email,
        'team_size': p.team_size,
        'receive_offers': p.receive_offers,
        'storyline': p.storyline_id,
        'storyline_title': p.storyline.title if p.storyline else '',
        'profile_photo': photo_url,
        'avatar_id': p.avatar_id,
        'rfid_tag': p.rfid_tag,
        'session_minutes': p.session_minutes,
        'points': p.points,
        'status': p.status,
        'created_at': p.created_at.isoformat() if p.created_at else '',
        'approved_at': p.approved_at.isoformat() if p.approved_at else '',
    }
    
    if include_checkpoints:
        from .models import Checkpoint
        checkpoints = Checkpoint.objects.filter(session=p).select_related('controller')
        data['checkpoints'] = [
            {
                'id': cp.id,
                'controller_id': cp.controller.id,
                'controller_name': cp.controller.name,
                'controller_ip': cp.controller.ip_address,
                'cleared_at': cp.cleared_at.isoformat(),
                'points_earned': cp.points_earned,
            }
            for cp in checkpoints
        ]
        data['checkpoints_cleared'] = checkpoints.count()
    
    return data


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def public_signup(request):
    """Public endpoint — anyone can submit a signup request."""
    data = request.data
    party_name = data.get('party_name', '').strip()
    email = data.get('email', '').strip()
    team_size = data.get('team_size', 1)
    receive_offers = data.get('receive_offers', 'false').lower() in ('true', '1', 'yes')
    storyline_id = data.get('storyline_id')
    avatar_id = data.get('avatar_id', '').strip()
    profile_photo = request.FILES.get('profile_photo')

    if not party_name:
        return Response({'error': 'Party name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    storyline = None
    if storyline_id:
        try:
            storyline = Storyline.objects.get(pk=storyline_id)
        except Storyline.DoesNotExist:
            pass

    pending = PendingSignup.objects.create(
        party_name=party_name,
        email=email,
        team_size=int(team_size),
        receive_offers=receive_offers,
        storyline=storyline,
        profile_photo=profile_photo,
        avatar_id=avatar_id,
    )
    return Response(_serialize_pending(pending, request), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_list(request):
    """List all pending signups for dashboard."""
    signups = PendingSignup.objects.filter(status='pending')
    return Response([_serialize_pending(p, request) for p in signups])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pending_approve(request, pk):
    """Approve a pending signup."""
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        p = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Save RFID tag and session time from the approval modal
    rfid_tag = request.data.get('rfid_tag', '').strip()
    session_minutes = request.data.get('session_minutes')
    if rfid_tag:
        p.rfid_tag = rfid_tag
    if session_minutes is not None:
        try:
            p.session_minutes = int(session_minutes)
        except (ValueError, TypeError):
            pass

    from django.utils import timezone
    p.status = 'approved'
    p.approved_at = timezone.now()
    p.save()
    return Response(_serialize_pending(p, request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_sessions(request):
    """Return approved sessions that still have playtime remaining."""
    from django.utils import timezone
    approved = PendingSignup.objects.filter(status='approved')
    live = []
    
    for p in approved:
        remaining_seconds = p.get_remaining_seconds()
        
        if remaining_seconds > 0:
            # Session still has time
            remaining_mins = max(0, int(remaining_seconds // 60))
            data = _serialize_pending(p, request, include_checkpoints=True)
            data['remaining_minutes'] = remaining_mins
            data['elapsed_seconds'] = p.get_elapsed_seconds()
            data['is_playing'] = p.is_playing
            live.append(data)
        else:
            # Auto-end expired sessions
            if p.is_playing:
                # Stop the timer first
                if p.last_started_at:
                    elapsed = (timezone.now() - p.last_started_at).total_seconds()
                    p.total_elapsed_seconds += int(elapsed)
                p.is_playing = False
                p.last_started_at = None
            
            p.status = 'ended'
            p.ended_at = timezone.now()
            p.save(update_fields=['status', 'ended_at', 'total_elapsed_seconds', 'is_playing', 'last_started_at'])
    
    return Response(live)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ended_sessions(request):
    """Return ended sessions."""
    from django.utils import timezone
    now = timezone.now()
    
    # Check for any approved sessions that have expired
    for p in PendingSignup.objects.filter(status='approved'):
        if p.get_remaining_seconds() <= 0:
            # Stop timer if playing
            if p.is_playing and p.last_started_at:
                elapsed = (now - p.last_started_at).total_seconds()
                p.total_elapsed_seconds += int(elapsed)
                p.is_playing = False
                p.last_started_at = None
            
            p.status = 'ended'
            if not p.ended_at:
                p.ended_at = now
            p.save(update_fields=['status', 'ended_at', 'total_elapsed_seconds', 'is_playing', 'last_started_at'])
    
    ended = PendingSignup.objects.filter(status='ended').order_by('-ended_at', '-approved_at')
    result = []
    
    for p in ended:
        data = _serialize_pending(p, request, include_checkpoints=True)
        
        # Calculate how long ago it ended
        end_time = p.ended_at if p.ended_at else (p.approved_at if p.approved_at else p.created_at)
        if end_time:
            diff = now - end_time
            mins = max(0, int(diff.total_seconds() // 60))
            if mins < 60:
                data['ended_ago'] = f'{mins} min{"s" if mins != 1 else ""} ago'
            elif mins < 1440:
                hrs = mins // 60
                data['ended_ago'] = f'{hrs} hr{"s" if hrs != 1 else ""} ago'
            else:
                days = mins // 1440
                data['ended_ago'] = f'{days} day{"s" if days != 1 else ""} ago'
        else:
            data['ended_ago'] = ''
        
        result.append(data)
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_session(request, pk):
    """Manually end a live session."""
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        p = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    from django.utils import timezone
    
    # Stop the timer if currently playing
    if p.is_playing and p.last_started_at:
        elapsed = (timezone.now() - p.last_started_at).total_seconds()
        p.total_elapsed_seconds += int(elapsed)
        p.is_playing = False
        p.last_started_at = None
    
    p.status = 'ended'
    p.ended_at = timezone.now()
    p.save(update_fields=['status', 'ended_at', 'total_elapsed_seconds', 'is_playing', 'last_started_at'])
    return Response({'message': 'Session ended.'})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_session(request, pk):
    """Update a live session (session_minutes, points, etc.)."""
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        p = PendingSignup.objects.get(pk=pk, status='approved')
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    gs = GeneralSetting.load()
    
    # extra_minutes: add or subtract time from current session
    if 'extra_minutes' in data:
        try:
            extra = int(data['extra_minutes'])
            if extra > 0:
                # Always allow adding time if allow_extension is True
                if gs.allow_extension:
                    p.session_minutes = p.session_minutes + extra
            elif extra < 0:
                # Only allow reducing time if allow_reduction is True
                if gs.allow_reduction:
                    # Calculate elapsed time to ensure we don't go below it
                    elapsed_mins = p.get_elapsed_seconds() // 60
                    min_allowed = max(1, int(elapsed_mins) + 1)  # At least 1 min more than elapsed
                    new_total = p.session_minutes + extra
                    p.session_minutes = max(min_allowed, new_total)
        except (ValueError, TypeError):
            pass
        except (ValueError, TypeError):
            pass
    if 'points' in data:
        try:
            p.points = int(data['points'])
        except (ValueError, TypeError):
            pass
    p.save()
    return Response(_serialize_pending(p, request))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pending_reject(request, pk):
    """Reject (delete) a pending signup."""
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        p = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    p.status = 'rejected'
    p.save()
    return Response({'message': 'Rejected.'})


# ── Checkpoint Management ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_checkpoint(request, pk):
    """Manually add/clear a checkpoint for a session.
    
    Body: { "controller_id": <id> }
    Used by staff to manually mark a checkpoint as cleared (e.g., if controller failed to register).
    """
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        session = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    controller_id = request.data.get('controller_id')
    if not controller_id:
        return Response({'error': 'controller_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        controller = Controller.objects.get(pk=controller_id)
    except Controller.DoesNotExist:
        return Response({'error': 'Controller not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create or get the checkpoint
    checkpoint, created = Checkpoint.objects.get_or_create(
        session=session,
        controller=controller
    )
    
    if created:
        from django.utils import timezone
        
        # Calculate points (same logic as rfid_checkpoint)
        base_points = 10
        time_bonus = 0
        
        if session.started_at:
            elapsed_seconds = int((timezone.now() - session.started_at).total_seconds())
            elapsed_minutes = elapsed_seconds / 60.0
            time_bonus = int(100.0 / (1.0 + elapsed_minutes))
        elif session.approved_at:
            elapsed_seconds = int((timezone.now() - session.approved_at).total_seconds())
            elapsed_minutes = elapsed_seconds / 60.0
            time_bonus = int(100.0 / (1.0 + elapsed_minutes))
        
        points_earned = base_points + time_bonus
        
        # Store points in checkpoint
        checkpoint.points_earned = points_earned
        checkpoint.save(update_fields=['points_earned'])
        
        # Add points to session
        session.points += points_earned
        session.save(update_fields=['points'])
        
        return Response({
            'message': 'Checkpoint added.',
            'checkpoint': {
                'id': checkpoint.id,
                'controller_id': controller.id,
                'controller_name': controller.name,
                'controller_ip': controller.ip_address,
                'cleared_at': checkpoint.cleared_at.isoformat(),
                'points_earned': points_earned,
            }
        })
    else:
        return Response({
            'message': 'Checkpoint already exists.',
            'checkpoint': {
                'id': checkpoint.id,
                'controller_id': controller.id,
                'controller_name': controller.name,
                'controller_ip': controller.ip_address,
                'cleared_at': checkpoint.cleared_at.isoformat(),
                'points_earned': checkpoint.points_earned,
            }
        })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_checkpoint(request, pk, checkpoint_id):
    """Remove a checkpoint from a session.
    
    Used by staff to remove a checkpoint (e.g., if player cheated or checkpoint was incorrectly registered).
    """
    if not request.user.is_superuser:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        session = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        checkpoint = Checkpoint.objects.get(pk=checkpoint_id, session=session)
    except Checkpoint.DoesNotExist:
        return Response({'error': 'Checkpoint not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Subtract the points that were earned for this checkpoint
    if checkpoint.points_earned > 0:
        session.points = max(0, session.points - checkpoint.points_earned)
        session.save(update_fields=['points'])
    
    checkpoint.delete()
    return Response({
        'message': 'Checkpoint removed.',
        'points_deducted': checkpoint.points_earned,
        'new_total': session.points,
    })


# ── RFID Session Start / Stop ──

@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_start_session(request):
    """Start or resume the session timer for a player identified by RFID tag.

    Body: { "rfid": "<tag>" }
    Starts the playtime counter on first call, resumes on subsequent calls.
    """
    rfid = request.data.get('rfid', '').strip()
    if not rfid:
        return Response({'error': 'RFID tag is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        p = PendingSignup.objects.get(rfid_tag=rfid, status='approved')
    except PendingSignup.DoesNotExist:
        return Response(
            {'error': 'No approved session found for this RFID tag.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    from django.utils import timezone
    now = timezone.now()
    
    # Check if session time has already expired
    remaining = p.get_remaining_seconds()
    if remaining <= 0:
        return Response({
            'error': 'Session time has expired.',
            'session_id': p.id,
            'party_name': p.party_name,
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # If first time starting, set started_at
    if not p.started_at:
        p.started_at = now
    
    # Set last_started_at to now and mark as playing
    p.last_started_at = now
    p.is_playing = True
    p.save(update_fields=['started_at', 'last_started_at', 'is_playing'])
    
    return Response({
        'message': 'Session started.' if not p.started_at else 'Session resumed.',
        'session_id': p.id,
        'party_name': p.party_name,
        'session_minutes': p.session_minutes,
        'elapsed_seconds': p.get_elapsed_seconds(),
        'remaining_seconds': remaining,
        'started_at': p.last_started_at.isoformat(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_stop_session(request):
    """Stop and end the session for a player identified by RFID tag.

    Body: { "rfid": "<tag>" }
    Stops the timer, calculates remaining time, converts it to points,
    and marks the session as ended.
    """
    rfid = request.data.get('rfid', '').strip()
    if not rfid:
        return Response({'error': 'RFID tag is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        p = PendingSignup.objects.get(rfid_tag=rfid, status='approved')
    except PendingSignup.DoesNotExist:
        return Response(
            {'error': 'No active session found for this RFID tag.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    from django.utils import timezone
    
    # Stop the timer if currently playing
    if p.is_playing and p.last_started_at:
        elapsed = (timezone.now() - p.last_started_at).total_seconds()
        p.total_elapsed_seconds += int(elapsed)
        p.is_playing = False
        p.last_started_at = None
    
    # Calculate remaining time and convert to points
    remaining_seconds = p.get_remaining_seconds()
    remaining_points = remaining_seconds // 60  # Convert seconds to minutes
    
    # Add remaining points to existing points
    p.points += remaining_points
    
    # End the session
    p.status = 'ended'
    p.ended_at = timezone.now()
    
    p.save(update_fields=['total_elapsed_seconds', 'is_playing', 'last_started_at', 'points', 'status', 'ended_at'])
    
    return Response({
        'message': 'Session ended.',
        'session_id': p.id,
        'party_name': p.party_name,
        'elapsed_seconds': p.total_elapsed_seconds,
        'remaining_seconds': remaining_seconds,
        'remaining_points_added': remaining_points,
        'total_points': p.points,
    })


# ── RFID Checkpoint ──

@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_checkpoint(request):
    """Record that a player cleared a checkpoint (controller station).

    Body: { "rfid": "<tag>", "controller_ip": "<ip>" }
    Creates a Checkpoint row linking the session to the controller.
    Calculates points based on checkpoint clear + time bonus.
    
    Scoring System:
    - Base points: 10 per checkpoint
    - Time bonus: Up to 100 points based on speed
      Formula: 100 / (1 + elapsed_minutes)
      - Cleared in 1 min: ~50 bonus points
      - Cleared in 2 mins: ~33 bonus points
      - Cleared in 5 mins: ~16 bonus points
      - Cleared in 10 mins: ~9 bonus points
    """
    rfid = request.data.get('rfid', '').strip()
    controller_ip = request.data.get('controller_ip', '').strip()

    if not rfid or not controller_ip:
        return Response(
            {'error': 'Both rfid and controller_ip are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Look up the active session
    try:
        p = PendingSignup.objects.get(rfid_tag=rfid, status='approved')
    except PendingSignup.DoesNotExist:
        return Response(
            {'error': 'No active session found for this RFID tag.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Look up the controller
    try:
        controller = Controller.objects.get(ip_address=controller_ip)
    except Controller.DoesNotExist:
        return Response(
            {'error': 'Controller not found for the given IP.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    from django.utils import timezone
    
    checkpoint, created = Checkpoint.objects.get_or_create(
        session=p, controller=controller
    )

    # Calculate points for the player (only if newly created)
    points_earned = 0
    time_bonus = 0
    elapsed_seconds = 0
    
    if created:
        # Base points for clearing checkpoint
        base_points = 10
        
        # Calculate time bonus based on how quickly they cleared it
        if p.started_at:
            # Time elapsed from when session actually started playing
            elapsed_seconds = int((timezone.now() - p.started_at).total_seconds())
            elapsed_minutes = elapsed_seconds / 60.0
            
            # Time bonus: faster = more points
            # Formula: 100 / (1 + elapsed_minutes)
            # This gives diminishing returns as time increases
            time_bonus = int(100.0 / (1.0 + elapsed_minutes))
        else:
            # Fallback: use approved_at if started_at is not set
            if p.approved_at:
                elapsed_seconds = int((timezone.now() - p.approved_at).total_seconds())
                elapsed_minutes = elapsed_seconds / 60.0
                time_bonus = int(100.0 / (1.0 + elapsed_minutes))
        
        points_earned = base_points + time_bonus
        
        # Store points earned in checkpoint for future reference
        checkpoint.points_earned = points_earned
        checkpoint.save(update_fields=['points_earned'])
        
        # Add points to session
        p.points += points_earned
        p.save(update_fields=['points'])

    return Response({
        'message': 'Checkpoint cleared!' if created else 'Checkpoint already cleared.',
        'checkpoint_id': checkpoint.id,
        'session_id': p.id,
        'party_name': p.party_name,
        'controller': controller.name,
        'cleared_at': checkpoint.cleared_at.isoformat(),
        'points_earned': points_earned if created else 0,
        'base_points': 10 if created else 0,
        'time_bonus': time_bonus if created else 0,
        'elapsed_seconds': elapsed_seconds if created else 0,
        'total_points': p.points,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ── RFID Session Status ──

@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_status(request):
    """Get the session status for a player identified by RFID tag.

    Body: { "rfid": "<tag>" }
    Returns whether the session is active, expired, or not found.
    """
    rfid = request.data.get('rfid', '').strip()
    if not rfid:
        return Response({'error': 'RFID tag is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Try to find any session with this RFID (most recent first)
    try:
        p = PendingSignup.objects.filter(rfid_tag=rfid).latest('created_at')
    except PendingSignup.DoesNotExist:
        return Response(
            {'error': 'No session found for this RFID tag.', 'status': 'not_found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    from django.utils import timezone
    now = timezone.now()

    data = _serialize_pending(p, request)

    if p.status == 'approved':
        remaining_secs = p.get_remaining_seconds()
        
        if remaining_secs > 0:
            data['session_status'] = 'active'
            data['remaining_seconds'] = remaining_secs
            data['remaining_minutes'] = remaining_secs // 60
            data['elapsed_seconds'] = p.get_elapsed_seconds()
            data['is_playing'] = p.is_playing
        else:
            # Timer exceeded — auto-end
            if p.is_playing and p.last_started_at:
                elapsed = (now - p.last_started_at).total_seconds()
                p.total_elapsed_seconds += int(elapsed)
                p.is_playing = False
                p.last_started_at = None
            
            p.status = 'ended'
            p.ended_at = now
            p.save(update_fields=['status', 'ended_at', 'total_elapsed_seconds', 'is_playing', 'last_started_at'])
            data['session_status'] = 'expired'
            data['status'] = 'ended'
            data['remaining_seconds'] = 0
            data['remaining_minutes'] = 0
    elif p.status == 'ended':
        data['session_status'] = 'expired'
        data['remaining_seconds'] = 0
        data['remaining_minutes'] = 0
    elif p.status == 'pending':
        data['session_status'] = 'pending'
    elif p.status == 'rejected':
        data['session_status'] = 'rejected'
    else:
        data['session_status'] = p.status

    # Include checkpoints cleared
    checkpoints = Checkpoint.objects.filter(session=p).select_related('controller')
    data['checkpoints'] = [
        {
            'controller_name': cp.controller.name,
            'controller_ip': cp.controller.ip_address,
            'cleared_at': cp.cleared_at.isoformat(),
            'points_earned': cp.points_earned,
        }
        for cp in checkpoints
    ]

    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_check_staff(request):
    """Check if the provided RFID belongs to a valid staff member.

    Body: { "rfid": "<tag>" }
    Returns whether the RFID belongs to a staff member, and if so, the staff details.
    """
    rfid = request.data.get('rfid', '').strip()
    if not rfid:
        return Response({'error': 'RFID tag is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Look up staff profile by RFID tag
        staff_profile = StaffProfile.objects.select_related('user').get(rfid_tag=rfid)
        user = staff_profile.user
        
        # Check if the user is active and is staff
        if not user.is_active:
            return Response({
                'is_staff': False,
                'error': 'Staff account is inactive.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if not user.is_staff:
            return Response({
                'is_staff': False,
                'error': 'User is not a staff member.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Return staff info
        return Response({
            'is_staff': True,
            'staff_id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'is_superuser': user.is_superuser,
        })
        
    except StaffProfile.DoesNotExist:
        return Response({
            'is_staff': False,
            'error': 'No staff member found with this RFID tag.'
        }, status=status.HTTP_404_NOT_FOUND)


def rfid_test_page(request):
    """Serve the RFID API test page."""
    from django.shortcuts import render
    return render(request, 'rfid_test.html')


# ── Public Leaderboard ──

@api_view(['GET'])
@permission_classes([AllowAny])
def public_leaderboard(request):
    """Return leaderboard data for all approved (live) and ended sessions,
    sorted by points descending. Includes checkpoint progress."""
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    total_controllers = Controller.objects.count()

    # Include both live (approved) and ended sessions
    sessions = PendingSignup.objects.filter(
        status__in=['approved', 'ended']
    ).order_by('-points', 'created_at')

    result = []
    for p in sessions:
        # Build photo / avatar info
        photo_url = ''
        if p.profile_photo:
            photo_url = request.build_absolute_uri(p.profile_photo.url)

        # Count checkpoints cleared
        checkpoints = Checkpoint.objects.filter(session=p).select_related('controller')
        checkpoints_cleared = checkpoints.count()
        checkpoint_list = [
            {
                'controller_id': cp.controller.id,
                'controller_name': cp.controller.name,
                'cleared_at': cp.cleared_at.isoformat(),
            }
            for cp in checkpoints
        ]

        # Calculate remaining time for live sessions
        remaining_minutes = 0
        session_status = p.status
        if p.status == 'approved':
            remaining_seconds = p.get_remaining_seconds()
            if remaining_seconds > 0:
                remaining_minutes = remaining_seconds // 60
                session_status = 'live'
            else:
                session_status = 'ended'

        result.append({
            'id': p.id,
            'name': p.party_name,
            'email': p.email,
            'team_size': p.team_size,
            'points': p.points,
            'profile_photo': photo_url,
            'avatar_id': p.avatar_id,
            'storyline_title': p.storyline.title if p.storyline else '',
            'session_minutes': p.session_minutes,
            'remaining_minutes': remaining_minutes,
            'session_status': session_status,
            'checkpoints_cleared': checkpoints_cleared,
            'total_controllers': total_controllers,
            'checkpoints': checkpoint_list,
            'created_at': p.created_at.isoformat() if p.created_at else '',
            'approved_at': p.approved_at.isoformat() if p.approved_at else '',
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_controllers(request):
    """Return the list of controllers/checkpoints (public, for leaderboard circles)."""
    controllers = Controller.objects.all()
    return Response([
        {'id': c.id, 'name': c.name}
        for c in controllers
    ])


# ── Leaderboard Test helpers ──

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def test_create_team(request):
    """Quick-create an approved team with custom points for leaderboard testing."""
    from django.utils import timezone
    data = request.data
    party_name = data.get('party_name', 'Test Team').strip()
    points = int(data.get('points', 0))
    team_size = int(data.get('team_size', 1))
    session_minutes = int(data.get('session_minutes', 60))
    avatar_id = data.get('avatar_id', '').strip()

    p = PendingSignup.objects.create(
        party_name=party_name,
        team_size=team_size,
        points=points,
        status='approved',
        approved_at=timezone.now(),
        session_minutes=session_minutes,
        avatar_id=avatar_id or '',
    )
    return Response(_serialize_pending(p, request), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def test_update_points(request, pk):
    """Update points for a session (for testing)."""
    try:
        p = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    points = request.data.get('points')
    if points is not None:
        p.points = int(points)
        p.save(update_fields=['points'])
    return Response(_serialize_pending(p, request))


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def test_clear_checkpoint(request):
    """Clear a checkpoint for a session (for testing)."""
    session_id = request.data.get('session_id')
    controller_id = request.data.get('controller_id')
    if not session_id or not controller_id:
        return Response({'error': 'session_id and controller_id required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        p = PendingSignup.objects.get(pk=session_id)
        c = Controller.objects.get(pk=controller_id)
    except (PendingSignup.DoesNotExist, Controller.DoesNotExist):
        return Response({'error': 'Session or controller not found.'}, status=status.HTTP_404_NOT_FOUND)
    cp, created = Checkpoint.objects.get_or_create(session=p, controller=c)
    if created:
        p.points += 1
        p.save(update_fields=['points'])
    return Response({'message': 'Checkpoint cleared.' if created else 'Already cleared.', 'total_points': p.points})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def test_delete_team(request, pk):
    """Delete a test team."""
    try:
        p = PendingSignup.objects.get(pk=pk)
    except PendingSignup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    p.delete()
    return Response({'message': 'Deleted.'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def test_reset_all(request):
    """Delete all sessions and checkpoints (for testing)."""
    Checkpoint.objects.all().delete()
    PendingSignup.objects.all().delete()
    return Response({'message': 'All sessions and checkpoints cleared.'})


def leaderboard_test_page(request):
    """Serve the leaderboard test page."""
    from django.shortcuts import render
    return render(request, 'leaderboard_test.html')
