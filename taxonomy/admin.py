from django.contrib import admin
from .models import Skill, Category, UserSkill

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")
    search_fields = ("name", "slug")

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent", "slug")
    search_fields = ("name", "slug")
    list_filter = ("parent",)

@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "skill", "level", "years")
    list_filter = ("level", "skill")
    search_fields = ("user__username", "user__email", "skill__name")
