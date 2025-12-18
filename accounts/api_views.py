from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets, pagination, serializers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .api_serializers import RegisterSerializer, MeSerializer

# Если используете навыки, импортируем модель связывания
# (название модуля/модели при необходимости поправьте на своё)
try:
    from taxonomy.models import UserSkill
except Exception:  # на случай, если taxonomy ещё не смонтирован
    UserSkill = None

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


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


# ---------- PERFORMERS (read-only) ----------
class PerformerSerializer(serializers.ModelSerializer):
    """Упрощённый сериализатор исполнителя со списком скиллов."""
    skills = serializers.SerializerMethodField()

    class Meta:
        model = User
        # Если в кастомной модели есть avatar/bio — они попадут в ответ.
        # Если полей нет, удалите их из списка.
        fields = ("id", "username", "first_name", "last_name", "email", "avatar", "bio", "skills")

    def get_skills(self, obj):
        if UserSkill is None:
            return []
        qs = UserSkill.objects.select_related("skill").filter(user=obj)
        return [{"id": us.skill_id, "name": us.skill.name} for us in qs]


class DefaultPagination(pagination.PageNumberPagination):
    page_size = 12


class PerformerViewSet(viewsets.ReadOnlyModelViewSet):
    """Публичный список активных пользователей со скиллами."""
    queryset = User.objects.filter(is_active=True)
    serializer_class = PerformerSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = DefaultPagination
