from rest_framework import viewsets, generics
from rest_framework.response import Response
from .models import Bus, Route, Stop, Schedule, Booking, Payment
from .serializers import (BusSerializer, RouteSerializer, StopSerializer,
                          ScheduleSerializer, BookingSerializer, BookingCreateSerializer, PaymentSerializer)


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all()
    serializer_class = BusSerializer


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer


class StopViewSet(viewsets.ModelViewSet):
    queryset = Stop.objects.all()
    serializer_class = StopSerializer


class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer


class DashboardStatsView(generics.GenericAPIView):
    def get(self, request):
        total_revenue = sum(p.amount for p in Payment.objects.filter(payment_status='paid'))
        return Response({
            'total_buses': Bus.objects.count(),
            'total_routes': Route.objects.count(),
            'total_bookings': Booking.objects.count(),
            'total_revenue': total_revenue,
        })
