from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id","title","is_open","created_at")
    search_fields = ("title","description")
    list_filter = ("is_open",)
