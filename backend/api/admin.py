from django.contrib import admin
from .models import Bus, Route, Stop, Schedule, Booking, Payment

# --- Admin Site Branding ---
admin.site.site_header = "CampusTransit Administration"
admin.site.site_title = "CampusTransit Admin"
admin.site.index_title = "Welcome to CampusTransit Admin Portal"


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ['bus_number', 'capacity', 'bus_type', 'description_short', 'is_active']
    list_filter = ['is_active', 'bus_type']
    search_fields = ['bus_number', 'description']
    list_per_page = 20
    ordering = ['bus_number']

    actions = ['activate_buses', 'deactivate_buses']

    @admin.action(description="Mark selected buses as active")
    def activate_buses(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} bus(es) activated.")

    @admin.action(description="Mark selected buses as inactive")
    def deactivate_buses(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} bus(es) deactivated.")

    @admin.display(description="Description")
    def description_short(self, obj):
        return obj.description[:50] + "..." if obj.description and len(obj.description) > 50 else obj.description


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_location', 'end_location', 'distance_km', 'duration_minutes', 'fare', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'start_location', 'end_location', 'description']
    list_per_page = 20
    ordering = ['name']

    actions = ['activate_routes', 'deactivate_routes']

    @admin.action(description="Mark selected routes as active")
    def activate_routes(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} route(s) activated.")

    @admin.action(description="Mark selected routes as inactive")
    def deactivate_routes(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} route(s) deactivated.")


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    list_display = ['name', 'route', 'order', 'estimated_time_from_start']
    list_filter = ['route']
    search_fields = ['name']
    list_per_page = 30
    ordering = ['route', 'order']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['bus', 'route', 'departure_time', 'arrival_time', 'available_seats', 'is_active']
    list_filter = ['is_active', 'route']
    search_fields = ['bus__bus_number', 'route__name']
    list_per_page = 25
    ordering = ['departure_time']
    readonly_fields = ['available_seats']

    actions = ['activate_schedules', 'deactivate_schedules']

    @admin.action(description="Mark selected schedules as active")
    def activate_schedules(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} schedule(s) activated.")

    @admin.action(description="Mark selected schedules as inactive")
    def deactivate_schedules(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} schedule(s) deactivated.")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'passenger_name', 'passenger_email', 'schedule', 'seats', 'total_fare', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['passenger_name', 'passenger_email', 'passenger_phone']
    list_per_page = 25
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['total_fare', 'created_at']

    actions = ['confirm_bookings', 'cancel_bookings', 'complete_bookings']

    @admin.action(description="Confirm selected bookings")
    def confirm_bookings(self, request, queryset):
        updated = queryset.update(status='confirmed')
        self.message_user(request, f"{updated} booking(s) confirmed.")

    @admin.action(description="Cancel selected bookings")
    def cancel_bookings(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f"{updated} booking(s) cancelled.")

    @admin.action(description="Complete selected bookings")
    def complete_bookings(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f"{updated} booking(s) completed.")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['booking', 'amount', 'payment_method', 'payment_status', 'paid_at']
    list_filter = ['payment_status', 'payment_method']
    search_fields = ['booking__passenger_name']
    date_hierarchy = 'paid_at'
    readonly_fields = ['paid_at']
    list_per_page = 20
