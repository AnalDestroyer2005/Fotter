from django.db import models

class Project(models.Model):
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True)  # ["Django", "React"]
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
