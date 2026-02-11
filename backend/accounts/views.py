from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Storyline, GeneralSetting, DashboardTheme, Controller, PendingSignup, Checkpoint


@api_view(['POST'])
@permission_classes([AllowAny])
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
    return {
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'is_staff': u.is_staff,
        'is_superuser': u.is_superuser,
        'is_active': u.is_active,
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

def _serialize_pending(p, request=None):
    photo_url = ''
    if p.profile_photo:
        photo_url = request.build_absolute_uri(p.profile_photo.url) if request else p.profile_photo.url
    return {
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
    """Return approved sessions that still have time remaining."""
    from django.utils import timezone
    from datetime import timedelta
    now = timezone.now()
    approved = PendingSignup.objects.filter(status='approved', approved_at__isnull=False)
    live = []
    for p in approved:
        end_time = p.approved_at + timedelta(minutes=p.session_minutes)
        if now < end_time:
            remaining = end_time - now
            remaining_mins = max(0, int(remaining.total_seconds() // 60))
            data = _serialize_pending(p, request)
            data['remaining_minutes'] = remaining_mins
            live.append(data)
        else:
            # auto-end expired sessions
            p.status = 'ended'
            p.save(update_fields=['status'])
    return Response(live)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ended_sessions(request):
    """Return ended sessions."""
    from django.utils import timezone
    from datetime import timedelta
    now = timezone.now()
    # Also mark any expired approved sessions as ended
    for p in PendingSignup.objects.filter(status='approved', approved_at__isnull=False):
        end_time = p.approved_at + timedelta(minutes=p.session_minutes)
        if now >= end_time:
            p.status = 'ended'
            p.save(update_fields=['status'])
    ended = PendingSignup.objects.filter(status='ended').order_by('-approved_at')
    result = []
    for p in ended:
        data = _serialize_pending(p, request)
        if p.approved_at:
            ended_at = p.approved_at + timedelta(minutes=p.session_minutes)
            diff = now - ended_at
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
    p.status = 'ended'
    p.save(update_fields=['status'])
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
                    from django.utils import timezone
                    from datetime import timedelta
                    # Calculate elapsed time to ensure we don't go below it
                    if p.approved_at:
                        elapsed = (timezone.now() - p.approved_at).total_seconds() / 60
                        min_allowed = max(1, int(elapsed) + 1)  # At least 1 min more than elapsed
                        new_total = p.session_minutes + extra
                        p.session_minutes = max(min_allowed, new_total)
                    else:
                        # If not started yet, allow any reduction down to 1 minute
                        p.session_minutes = max(1, p.session_minutes + extra)
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


# ── RFID Session Start / Stop ──

@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_start_session(request):
    """Start the session timer for a player identified by RFID tag.

    Body: { "rfid": "<tag>" }
    Sets approved_at = now so the countdown begins.
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
    p.approved_at = timezone.now()
    p.save(update_fields=['approved_at'])
    return Response({
        'message': 'Session started.',
        'session_id': p.id,
        'party_name': p.party_name,
        'session_minutes': p.session_minutes,
        'started_at': p.approved_at.isoformat(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_stop_session(request):
    """Stop the session timer for a player identified by RFID tag.

    Body: { "rfid": "<tag>" }
    Sets status = 'ended'.
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

    p.status = 'ended'
    p.save(update_fields=['status'])
    return Response({
        'message': 'Session stopped.',
        'session_id': p.id,
        'party_name': p.party_name,
    })


# ── RFID Checkpoint ──

@api_view(['POST'])
@permission_classes([AllowAny])
def rfid_checkpoint(request):
    """Record that a player cleared a checkpoint (controller station).

    Body: { "rfid": "<tag>", "controller_ip": "<ip>" }
    Creates a Checkpoint row linking the session to the controller.
    If the checkpoint was already cleared, returns the existing record.
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

    checkpoint, created = Checkpoint.objects.get_or_create(
        session=p, controller=controller
    )

    # Increment points for the player
    if created:
        p.points += 1
        p.save(update_fields=['points'])

    return Response({
        'message': 'Checkpoint cleared.' if created else 'Checkpoint already cleared.',
        'checkpoint_id': checkpoint.id,
        'session_id': p.id,
        'party_name': p.party_name,
        'controller': controller.name,
        'cleared_at': checkpoint.cleared_at.isoformat(),
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
    from datetime import timedelta
    now = timezone.now()

    data = _serialize_pending(p, request)

    if p.status == 'approved' and p.approved_at:
        end_time = p.approved_at + timedelta(minutes=p.session_minutes)
        if now < end_time:
            remaining = end_time - now
            remaining_secs = max(0, int(remaining.total_seconds()))
            data['session_status'] = 'active'
            data['remaining_seconds'] = remaining_secs
            data['remaining_minutes'] = remaining_secs // 60
            data['end_time'] = end_time.isoformat()
        else:
            # Timer exceeded — auto-end
            p.status = 'ended'
            p.save(update_fields=['status'])
            data['session_status'] = 'expired'
            data['status'] = 'ended'
            data['remaining_seconds'] = 0
            data['remaining_minutes'] = 0
    elif p.status == 'approved' and not p.approved_at:
        data['session_status'] = 'approved_not_started'
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
        }
        for cp in checkpoints
    ]

    return Response(data)


def rfid_test_page(request):
    """Serve the RFID API test page."""
    from django.shortcuts import render
    return render(request, 'rfid_test.html')
