from datetime import timedelta

from django.contrib.auth import get_user_model, logout as django_logout
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, viewsets, pagination, serializers, parsers, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import login as django_login

from .api_serializers import (
    RegisterSerializer,
    MeSerializer,
    ServiceSerializer,
    PortfolioItemSerializer,
    PortfolioItemWriteSerializer,
    UserCustomSkillSerializer,
    PasswordChangeSerializer,
)
from .models import Service, PortfolioItem, UserCustomSkill
from projects.models import Order

User = get_user_model()


# ---------- AUTH ----------
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["uid"] = user.id
        token["username"] = user.username
        return token


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # set Django session as well, so @login_required works
        user = serializer.user
        django_login(request, user)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]

class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        django_logout(request)
        return Response({"detail": "ok"})


class MeView(generics.RetrieveUpdateAPIView):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Пароль изменён."})


# ---------- SERVICES / PORTFOLIO / CUSTOM SKILLS ----------
class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Service.objects.all()
        if self.request.method in ("GET",):
            owner_id = self.request.query_params.get("owner")
            if owner_id:
                return qs.filter(owner_id=owner_id, is_active=True)
        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PortfolioViewSet(viewsets.ModelViewSet):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = PortfolioItem.objects.all().select_related("owner").prefetch_related("images")
        owner_id = self.request.query_params.get("owner")
        if self.request.method == "GET" and owner_id:
            return qs.filter(owner_id=owner_id)
        return qs.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PortfolioItemWriteSerializer
        return PortfolioItemSerializer

    def perform_create(self, serializer):
        serializer.save()


class UserCustomSkillViewSet(viewsets.ModelViewSet):
    serializer_class = UserCustomSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserCustomSkill.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# ---------- PERFORMERS (read-only) ----------
class PerformerSerializer(serializers.ModelSerializer):
    skills = serializers.SerializerMethodField()
    services_count = serializers.IntegerField(read_only=True)
    portfolio_count = serializers.IntegerField(read_only=True)
    completed_orders = serializers.IntegerField(read_only=True)
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    awards = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "avatar",
            "bio",
            "skills",
            "services_count",
            "portfolio_count",
            "completed_orders",
            "date_joined",
            "last_seen",
            "is_online",
            "awards",
        ]

    def get_skills(self, obj):
        skill_names = list(
            obj.user_skills.select_related("skill").values_list("skill__name", flat=True)
        )
        custom = list(obj.custom_skills.values_list("name", flat=True))
        return skill_names + custom

    def get_is_online(self, obj):
        last_seen = obj.last_login
        if not last_seen:
            return False
        return timezone.now() - last_seen <= timedelta(minutes=5)

    def get_last_seen(self, obj):
        return obj.last_login

    def get_awards(self, obj):
        awards = []
        if getattr(obj, "completed_orders", 0) >= 5:
            awards.append(
                {
                    "code": "orders_5",
                    "title": "5 заказов",
                    "reason": "Выполнено 5 заказов",
                }
            )
        if obj.date_joined and timezone.now() - obj.date_joined >= timedelta(days=365):
            awards.append(
                {
                    "code": "year_with_us",
                    "title": "Больше года с нами",
                    "reason": "Больше года с нами",
                }
            )
        return awards


class DefaultPagination(pagination.PageNumberPagination):
    page_size = 12


class PerformerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = PerformerSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = DefaultPagination

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .annotate(
                services_count=Count("services", filter=Q(services__is_active=True)),
                portfolio_count=Count("portfolio"),
                completed_orders=Count(
                    "orders_as_freelancer",
                    filter=Q(orders_as_freelancer__status=Order.Status.COMPLETED),
                ),
            )
        )
