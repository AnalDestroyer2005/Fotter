# taxonomy/models.py
from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.contrib.postgres.indexes import GinIndex

User = settings.AUTH_USER_MODEL

class Skill(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        indexes = [
            GinIndex(name="skill_name_trgm", fields=["name"], opclasses=["gin_trgm_ops"])
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self): 
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )

    class Meta:
        unique_together = ("name", "parent")
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["parent"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            self.slug = base if not self.parent else f"{self.parent.slug}-{base}"
        super().save(*args, **kwargs)

    def __str__(self): 
        return self.name


class UserSkill(models.Model):
    class Level(models.IntegerChoices):
        JUNIOR = 1, "Junior"
        MIDDLE = 2, "Middle"
        SENIOR = 3, "Senior"
        EXPERT = 4, "Expert"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="skill_users")
    level = models.IntegerField(choices=Level.choices, default=Level.JUNIOR)
    years = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)

    class Meta:
        unique_together = ("user", "skill")
        indexes = [models.Index(fields=["user"]), models.Index(fields=["skill"])]

    def __str__(self):
        return f"{self.user} - {self.skill} ({self.get_level_display()})"
