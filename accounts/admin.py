from django.contrib import admin
from .models import Account

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_active", "is_staff")
    search_fields = ("username", "email")
    list_filter = ("is_active", "is_staff")
