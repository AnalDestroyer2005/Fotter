from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta

# Загружаем .env из корня проекта (где manage.py)
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# --- БАЗОВОЕ ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["*"]  # в проде сузить до доменов

# --- ПРИЛОЖЕНИЯ ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "pages",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    # внешние
    "rest_framework",
    "corsheaders",

    # твои приложения
    "accounts",
    "projects",

    "django.contrib.postgres",
    "common",
    "taxonomy",


]

# --- МИДДЛВАРЫ ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # CORS должен быть как можно выше
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # если планируешь рендерить свои HTML-шаблоны, создай папку /templates в корне
        "DIRS": [BASE_DIR /"pages"/ "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# --- БАЗА ДАННЫХ (PostgreSQL) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
CORS_ALLOW_ALL_ORIGINS = True

# --- DJANGO REST FRAMEWORK ---
REST_FRAMEWORK = {
    # JWT-авторизация для API
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # По умолчанию читать можно всем, изменять — только авторизованным
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    # Базовый rate-limit (защита от флуда)
    "DEFAULT_THROTTLE_RATES": {
        "anon": "50/min",
        "user": "200/min",
    },
    # Пагинация — как было
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,

    "DEFAULT_SCHEMA_CLASS":"drf_spectacular.openapi.AutoSchema"
}

# --- CORS (для React на другом порту) ---
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
# Если хочешь вообще открыть всем (dev), можно так:
# CORS_ALLOW_ALL_ORIGINS = True

# --- СТАТИКА ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"     # для collectstatic (прод)
# локальная папка со статикой (создай при необходимости)
if (BASE_DIR / "static").exists():
    STATICFILES_DIRS = [BASE_DIR / "static"]
else:
    STATICFILES_DIRS = []

# --- МЕДИА (если нужны) ---
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- ЛОКАЛИЗАЦИЯ ---
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.Account"


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    # опционально, если хочешь жёстче:
    # "ROTATE_REFRESH_TOKENS": True,
    # "BLACKLIST_AFTER_ROTATION": True,
}
AUTHENTICATION_BACKENDS = [
    "accounts.auth_backends.EmailOrUsernameModelBackend",
    "django.contrib.auth.backends.ModelBackend",
    
]
