from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import SkillViewSet, CategoryViewSet

router = DefaultRouter()
router.register("skills", SkillViewSet, basename="skill")
router.register("categories", CategoryViewSet, basename="category")
urlpatterns = [path("", include(router.urls))]
