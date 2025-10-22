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

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
