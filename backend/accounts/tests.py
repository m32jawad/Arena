from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User

from .models import Controller, PendingSignup


class RfidStationReplayTests(TestCase):
    def setUp(self):
        self.controller1 = Controller.objects.create(
            name='Station 1',
            ip_address='192.168.1.10',
            is_start=True,
        )
        self.controller2 = Controller.objects.create(
            name='Station 2',
            ip_address='192.168.1.11',
            is_end=True,
        )
        self.session = PendingSignup.objects.create(
            party_name='Team Alpha',
            rfid_tag='RFID-123',
            status='approved',
            session_minutes=10,
            approved_at=timezone.now(),
        )

    def test_same_station_cannot_be_started_twice(self):
        start_url = reverse('rfid-start-session')
        stop_url = reverse('rfid-stop-session')

        first_start = self.client.post(
            start_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller1.ip_address},
            content_type='application/json',
        )
        self.assertEqual(first_start.status_code, 200)

        first_stop = self.client.post(
            stop_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller1.ip_address},
            content_type='application/json',
        )
        self.assertEqual(first_stop.status_code, 200)

        replay_start = self.client.post(
            start_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller1.ip_address},
            content_type='application/json',
        )
        self.assertEqual(replay_start.status_code, 400)
        replay_data = replay_start.json()
        self.assertIn('already completed', replay_data.get('error', '').lower())

        next_station_start = self.client.post(
            start_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller2.ip_address},
            content_type='application/json',
        )
        self.assertEqual(next_station_start.status_code, 200)

    def test_cannot_start_second_station_while_current_station_is_active(self):
        start_url = reverse('rfid-start-session')

        first_station_start = self.client.post(
            start_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller1.ip_address},
            content_type='application/json',
        )
        self.assertEqual(first_station_start.status_code, 200)

        second_station_start = self.client.post(
            start_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller2.ip_address},
            content_type='application/json',
        )
        self.assertEqual(second_station_start.status_code, 400)
        second_station_data = second_station_start.json()
        self.assertEqual(second_station_data.get('error_code'), 'session_already_active')
        self.assertIn('already active', second_station_data.get('error', '').lower())

    def test_stop_session_awards_one_point_per_remaining_second(self):
        stop_url = reverse('rfid-stop-session')

        # Simulate active play for 30 seconds before stopping at station 1.
        self.session.is_playing = True
        self.session.last_started_at = timezone.now() - timedelta(seconds=30)
        self.session.save(update_fields=['is_playing', 'last_started_at'])

        response = self.client.post(
            stop_url,
            data={'rfid': self.session.rfid_tag, 'controller_ip': self.controller1.ip_address},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        # Controller station_minutes defaults to 10 => per_station_seconds=600.
        # 600 - 30 elapsed = 570 remaining => 570 points expected.
        self.assertEqual(data['per_station_seconds'], 600)
        self.assertEqual(data['station_points'], data['station_remaining_seconds'])
        self.assertEqual(data['station_points'], 570)

        self.session.refresh_from_db()
        self.assertEqual(self.session.points, 570)

    def test_session_remaining_time_is_based_on_approved_time_even_when_paused(self):
        self.session.approved_at = timezone.now() - timedelta(minutes=4)
        self.session.is_playing = False
        self.session.last_started_at = None
        self.session.total_elapsed_seconds = 0
        self.session.save(update_fields=['approved_at', 'is_playing', 'last_started_at', 'total_elapsed_seconds'])

        # 10-minute session approved 4 minutes ago => ~6 minutes remaining.
        remaining = self.session.get_remaining_seconds()
        self.assertGreaterEqual(remaining, 355)
        self.assertLessEqual(remaining, 360)


class SessionApprovalRfidValidationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
        )
        self.client.force_login(self.admin)
        self.pending = PendingSignup.objects.create(
            party_name='No RFID Team',
            status='pending',
            session_minutes=30,
        )

    def test_pending_approve_requires_rfid(self):
        res = self.client.post(
            reverse('pending-approve', args=[self.pending.id]),
            data={'rfid_tag': '   ', 'session_minutes': 30},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 400)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, 'pending')

    def test_update_session_can_assign_rfid(self):
        session = PendingSignup.objects.create(
            party_name='Assign RFID Team',
            status='approved',
            approved_at=timezone.now(),
            session_minutes=30,
            rfid_tag='',
        )

        res = self.client.put(
            reverse('update-session', args=[session.id]),
            data={'rfid_tag': 'RFID-NEW-001'},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.rfid_tag, 'RFID-NEW-001')
