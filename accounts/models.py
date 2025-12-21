from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

class Account(AbstractUser):
    """Кастомная модель пользователя"""

    # Роли
    ROLE_CHOICES = [
        ('customer', 'Заказчик'),
        ('freelancer', 'Исполнитель'),
    ]

    email = models.EmailField(unique=True)           # уникальный email
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    category = models.ForeignKey("taxonomy.Category", on_delete=models.SET_NULL, null=True, blank=True, related_name="accounts", help_text="????????????? ????????????")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class UserCustomSkill(models.Model):
    """Free-form skill provided by the user."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="custom_skills"
    )
    name = models.CharField(max_length=80, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "name")]
        indexes = [models.Index(fields=["owner", "name"], name="ucs_owner_name_idx")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.owner_id}:{self.name}"


class Service(models.Model):
    """Service offered by a freelancer profile."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="services"
    )
    title = models.CharField(max_length=120)
    icon = models.ImageField(upload_to="service_icons/", blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["owner", "is_active"], name="service_owner_active_idx")]

    def __str__(self):
        return f"{self.title} ({self.owner_id})"


class PortfolioItem(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="portfolio"
    )
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        "taxonomy.Category", on_delete=models.SET_NULL, null=True, blank=True
    )
    external_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["owner", "created_at"], name="pitem_owner_created_idx")]

    def __str__(self):
        return self.title


class PortfolioImage(models.Model):
    item = models.ForeignKey(
        PortfolioItem, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="portfolio/")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
