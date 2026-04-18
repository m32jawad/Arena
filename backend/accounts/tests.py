from django.test import TestCase
from django.urls import reverse

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
