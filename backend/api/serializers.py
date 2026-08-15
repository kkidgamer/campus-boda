from rest_framework import serializers
from .models import Bus, Route, Stop, Schedule, Booking, Payment


class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = '__all__'


class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = '__all__'


class RouteSerializer(serializers.ModelSerializer):
    stops = StopSerializer(many=True, read_only=True)

    class Meta:
        model = Route
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source='bus.bus_number', read_only=True)
    route_name = serializers.CharField(source='route.name', read_only=True)
    available_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = Schedule
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    payment = PaymentSerializer(read_only=True)
    schedule_details = ScheduleSerializer(source='schedule', read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['schedule', 'passenger_name', 'passenger_email', 'passenger_phone', 'seats']

    def create(self, validated_data):
        schedule = validated_data['schedule']
        seats = validated_data['seats']
        validated_data['total_fare'] = float(schedule.route.fare) * seats
        booking = Booking.objects.create(**validated_data)
        schedule.available_seats -= seats
        schedule.save()
        return booking
