import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'arena.settings')
django.setup()
from accounts.models import Controller

Controller.objects.all().delete()

c1 = Controller.objects.create(name='Controller Alpha', ip_address='192.168.1.101', cpu_usage='28%', storage_usage='20 GB / 100 GB', cpu_temperature='60 C', ram_usage='45%', system_uptime='3d 12h', voltage_power_status='Normal')
c2 = Controller.objects.create(name='Controller Beta', ip_address='192.168.1.102', cpu_usage='63%', storage_usage='55 GB / 100 GB', cpu_temperature='72 C', ram_usage='71%', system_uptime='7d 4h', voltage_power_status='Normal')
c3 = Controller.objects.create(name='Controller Gamma', ip_address='192.168.1.103', cpu_usage='12%', storage_usage='8 GB / 50 GB', cpu_temperature='48 C', ram_usage='22%', system_uptime='1d 2h', voltage_power_status='Low')

print('Created %d dummy controllers:' % Controller.objects.count())
for c in Controller.objects.all():
    print('  - %s (%s)' % (c.name, c.ip_address))
