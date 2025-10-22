from rest_framework import serializers, viewsets

from .models import Category, Skill


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name", "slug")


class CategorySerializer(serializers.ModelSerializer):
    # Можно вернуть только id родителя; если нужно — сделаем вложенный сериалайзер
    parent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent")


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Skill.objects.all().order_by("name")
    serializer_class = SkillSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.select_related("parent").order_by("name")
    serializer_class = CategorySerializer
