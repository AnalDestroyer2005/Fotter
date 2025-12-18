from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter

from pages.views import home, projects, account_hub, auth_login_page, auth_register_page
from accounts.api_views import RegisterView, LoginView, RefreshView, MeView, PerformerViewSet

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# DRF router для публичных read-only ручек (исполнители и т.п.)
router = DefaultRouter()
router.register(r"performers", PerformerViewSet, basename="performer")

urlpatterns = [
    path("admin/", admin.site.urls),

    # API проектов (вьюсет и роуты внутри приложения projects)
    path("api/", include("projects.api_urls")),

    # API справочников (категории/скиллы)
    path("api/", include("taxonomy.api_urls")),

    # Публичные read-only API, зарегистрированные локально через router (исполнители)
    path("api/", include(router.urls)),

    # API аутентификации (включено!)
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/login/", LoginView.as_view(), name="login"),
    path("api/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeView.as_view(), name="me"),

    # Страницы аутентификации
    path("auth/login/", auth_login_page, name="auth_login"),
    path("auth/register/", auth_register_page, name="auth_register"),

    # Обычные страницы
    path("", home, name="home"),
    path("projects/", projects, name="projects"),
    path("account/", account_hub, name="account_hub"),

    # OpenAPI/Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Медиа для дев-сервера (например, аватары)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
