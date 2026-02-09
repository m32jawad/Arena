from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Storyline


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
