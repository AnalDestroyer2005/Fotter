from django.db.models import Q
from rest_framework import viewsets, permissions

from .models import Project, Review
from .serializers import ProjectSerializer, ReviewSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.order_by("-created_at")
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset().filter(is_open=True)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(description__icontains=q) | Q(skills__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = Review.objects.select_related("order", "author", "target").all()

    def get_queryset(self):
        qs = super().get_queryset()
        target = self.request.query_params.get("target")
        order_id = self.request.query_params.get("order")
        if target:
            qs = qs.filter(target_id=target)
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs.order_by("-created_at")
