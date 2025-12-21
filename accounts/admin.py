from django.contrib import admin
from .models import (
    Account,
    Service,
    PortfolioItem,
    PortfolioImage,
    UserCustomSkill,
)

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_active", "is_staff")
    search_fields = ("username", "email")
    list_filter = ("is_active", "is_staff")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "description", "owner__username", "owner__email")


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "category", "created_at")
    search_fields = ("title", "description", "owner__username")
    list_filter = ("category",)


@admin.register(PortfolioImage)
class PortfolioImageAdmin(admin.ModelAdmin):
    list_display = ("id", "item", "sort_order")
    search_fields = ("item__title",)


@admin.register(UserCustomSkill)
class UserCustomSkillAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "name", "created_at")
    search_fields = ("name", "owner__username", "owner__email")
