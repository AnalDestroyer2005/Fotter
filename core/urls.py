from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from accounts.api_views import RegisterView, LoginView, RefreshView, MeView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from pages.views import (
    home,
    auth_login_page,
    auth_register_page,
    settings_page,
    account_page,
    projects_page,
    freelancers_page,
    messages_page,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API
    path("api/", include("accounts.api_urls")),
    path("api/", include("projects.api_urls")),
    path("api/", include("taxonomy.api_urls")),
    path("api/", include("messaging.api_urls")),

    # JWT
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/login/", LoginView.as_view(), name="login"),
    path("api/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeView.as_view(), name="me"),

    # Pages
    path("", home, name="home"),
    path("auth/login/", auth_login_page, name="auth_login"),
    path("auth/register/", auth_register_page, name="auth_register"),
    path("projects/", projects_page, name="projects"),
    path("performers/", freelancers_page, name="freelancers"),
    path("account/", account_page, name="account_hub"),
    path("settings/", settings_page, name="settings"),
    path("messages/", messages_page, name="messages"),

    # OpenAPI/Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
