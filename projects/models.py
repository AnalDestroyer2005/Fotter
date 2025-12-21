from django.conf import settings
from django.db import models
from django.db.models import Q, F
from taxonomy.models import Category

class Project(models.Model):
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True)  # ["Django", "React"]
    deadline = models.PositiveIntegerField(null=True, blank=True, help_text="Срок в днях")
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="projects"
    )

    def __str__(self):
        return self.title


class Order(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        IN_PROGRESS = "in_progress", "В работе"
        COMPLETED = "completed", "Завершён"
        CANCELLED = "cancelled", "Отменён"

    project = models.ForeignKey("projects.Project", on_delete=models.PROTECT, related_name="orders")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders_as_customer"
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders_as_freelancer"
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    budget_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "freelancer"], name="order_status_freel_idx"),
            models.Index(fields=["status", "customer"], name="order_status_cust_idx"),
        ]
        constraints = [
            models.CheckConstraint(check=~Q(customer=F("freelancer")), name="order_customer_ne_freelancer")
        ]


class Review(models.Model):
    """Feedback for a completed order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written"
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("order", "author")]
        indexes = [
            models.Index(fields=["target", "created_at"], name="review_target_created_idx"),
            models.Index(fields=["order"], name="review_order_idx"),
        ]
        constraints = [
            models.CheckConstraint(check=Q(rating__gte=1) & Q(rating__lte=5), name="review_rating_1_5"),
        ]
