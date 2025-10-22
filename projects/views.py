from rest_framework import viewsets, permissions
from .models import Project
from .serializers import ProjectSerializer
from django.db.models import Q

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.order_by("-created_at")
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset().filter(is_open=True)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(description__icontains=q) | Q(skills__icontains=q)
            )
        return qs
