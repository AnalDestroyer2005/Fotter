from django.contrib import admin
from .models import Project, Order, Review

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id","title","is_open","created_at")
    search_fields = ("title","description")
    list_filter = ("is_open",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "customer", "freelancer", "status", "started_at", "finished_at")
    list_filter = ("status",)
    search_fields = ("project__title", "customer__username", "freelancer__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "author", "target", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("author__username", "target__username", "text")
