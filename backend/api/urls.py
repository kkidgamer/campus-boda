from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (BusViewSet, RouteViewSet, StopViewSet,
                    ScheduleViewSet, BookingViewSet, PaymentViewSet, DashboardStatsView)

router = DefaultRouter()
router.register(r'buses', BusViewSet)
router.register(r'routes', RouteViewSet)
router.register(r'stops', StopViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'payments', PaymentViewSet)

urlpatterns = [path('', include(router.urls)), path('dashboard/', DashboardStatsView.as_view())]
