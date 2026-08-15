from django.core.management.base import BaseCommand
from api.models import Bus, Route, Stop, Schedule, Booking, Payment
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Seed the database with sample transport data'

    def handle(self, *args, **kwargs):
        # Clear existing data (idempotent)
        Payment.objects.all().delete()
        Booking.objects.all().delete()
        Schedule.objects.all().delete()
        Stop.objects.all().delete()
        Route.objects.all().delete()
        Bus.objects.all().delete()

        b1 = Bus.objects.create(bus_number="CB-001", capacity=40, bus_type="Standard", description="White campus shuttle bus")
        b2 = Bus.objects.create(bus_number="CB-002", capacity=30, bus_type="Mini", description="Smaller bus for off-peak routes")
        b3 = Bus.objects.create(bus_number="CB-003", capacity=50, bus_type="Articulated", description="Large bus for peak hours")

        r1 = Route.objects.create(name="Main Campus Loop", start_location="Student Union", end_location="Library", distance_km=3.5, duration_minutes=20, fare=1.50, description="Circles the main campus area")
        r2 = Route.objects.create(name="North Campus Express", start_location="Student Union", end_location="North Dorms", distance_km=5.2, duration_minutes=15, fare=2.00, description="Direct route to north campus dorms")
        r3 = Route.objects.create(name="Off-Campus Shuttle", start_location="Student Union", end_location="Downtown Station", distance_km=8.0, duration_minutes=25, fare=2.50, description="Connects campus to downtown area")

        Stop.objects.create(route=r1, name="Student Union", order=1, estimated_time_from_start=0)
        Stop.objects.create(route=r1, name="Science Block", order=2, estimated_time_from_start=5)
        Stop.objects.create(route=r1, name="Engineering Building", order=3, estimated_time_from_start=10)
        Stop.objects.create(route=r1, name="Library", order=4, estimated_time_from_start=15)
        Stop.objects.create(route=r2, name="Student Union", order=1, estimated_time_from_start=0)
        Stop.objects.create(route=r2, name="Sports Complex", order=2, estimated_time_from_start=5)
        Stop.objects.create(route=r2, name="North Dorms", order=3, estimated_time_from_start=12)
        Stop.objects.create(route=r3, name="Student Union", order=1, estimated_time_from_start=0)
        Stop.objects.create(route=r3, name="Hospital", order=2, estimated_time_from_start=8)
        Stop.objects.create(route=r3, name="Shopping Mall", order=3, estimated_time_from_start=15)
        Stop.objects.create(route=r3, name="Downtown Station", order=4, estimated_time_from_start=22)

        now = timezone.now()
        base_date = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=1)
        schedules = []
        for r, bus in [(r1, b1), (r1, b2), (r2, b1), (r2, b2), (r3, b3), (r3, b1)]:
            for hour_offset in range(0, 10, 2):
                dep = base_date + timedelta(hours=hour_offset)
                arr = dep + timedelta(minutes=r.duration_minutes)
                schedules.append(Schedule.objects.create(bus=bus, route=r, departure_time=dep, arrival_time=arr, available_seats=bus.capacity - 10))

        bk1 = Booking.objects.create(schedule=schedules[0], passenger_name="Alice Johnson", passenger_email="alice@campus.edu", passenger_phone="555-1001", seats=1, status="completed", total_fare=r1.fare, created_at=timezone.now()-timedelta(days=1))
        bk2 = Booking.objects.create(schedule=schedules[-1], passenger_name="Bob Smith", passenger_email="bob@campus.edu", passenger_phone="555-1002", seats=2, status="confirmed", total_fare=r3.fare * 2)

        Payment.objects.create(booking=bk1, amount=r1.fare, payment_method="card", payment_status="paid", paid_at=timezone.now()-timedelta(days=1))
        Payment.objects.create(booking=bk2, amount=r3.fare * 2, payment_method="mobile", payment_status="paid", paid_at=timezone.now()-timedelta(hours=2))

        # Create admin superuser (skip if already exists)
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@campus.edu', 'admin123')
            self.stdout.write('Created superuser: admin / admin123')
        else:
            self.stdout.write('Superuser already exists, skipping')

        self.stdout.write(self.style.SUCCESS('Successfully seeded Transport data'))
