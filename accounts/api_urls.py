from rest_framework.routers import DefaultRouter
from django.urls import path
from .api_views import (
    PerformerViewSet,
    ServiceViewSet,
    PortfolioViewSet,
    UserCustomSkillViewSet,
    PasswordChangeView,
    LogoutView,
)

router = DefaultRouter()
router.register(r"performers", PerformerViewSet, basename="performer")
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"portfolio", PortfolioViewSet, basename="portfolio")
router.register(r"custom-skills", UserCustomSkillViewSet, basename="custom-skill")
urlpatterns = router.urls + [
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("logout/", LogoutView.as_view(), name="api-logout"),
]
