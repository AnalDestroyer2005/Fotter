from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from pages.views import home, projects, account_hub
from accounts.api_views import RegisterView, LoginView, RefreshView, MeView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path("admin/", admin.site.urls),

    # API справочников (Итерация 0)
    path("api/", include("taxonomy.api_urls")),

    # API аутентификации (Итерация 1)
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/login/", LoginView.as_view(), name="login"),
    path("api/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeView.as_view(), name="me"),

    # обычные страницы
    path("", home, name="home"),
    path("projects/", projects, name="projects"),
    path("account/", account_hub, name="account_hub"),  # ← страница с вкладками


    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# статические медиа для дев-сервера (например, аватары)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
