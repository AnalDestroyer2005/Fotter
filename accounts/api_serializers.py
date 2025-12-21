from datetime import timedelta

from django.contrib.auth import get_user_model, password_validation
from django.utils import timezone
from rest_framework import serializers
from taxonomy.models import Skill, UserSkill

from .models import PortfolioImage, PortfolioItem, Service, UserCustomSkill

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, data):
        return User.objects.create_user(
            username=data["username"], email=data["email"], password=data["password"]
        )


class SkillBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name", "slug")


class UserSkillSerializer(serializers.ModelSerializer):
    skill = SkillBriefSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(
        source="skill", queryset=Skill.objects.all(), write_only=True
    )

    class Meta:
        model = UserSkill
        fields = ("id", "skill", "skill_id", "level", "years")


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "title", "icon", "description", "is_active", "created_at"]


class PortfolioImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioImage
        fields = ["id", "image", "sort_order"]


class PortfolioItemSerializer(serializers.ModelSerializer):
    images = PortfolioImageSerializer(many=True, read_only=True)

    class Meta:
        model = PortfolioItem
        fields = ["id", "title", "description", "category", "external_url", "created_at", "images"]


class PortfolioItemWriteSerializer(serializers.ModelSerializer):
    """Create/update serializer that also accepts image uploads."""

    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = PortfolioItem
        fields = ["id", "title", "description", "category", "external_url", "images"]

    def create(self, validated_data):
        images = validated_data.pop("images", [])
        item = PortfolioItem.objects.create(owner=self.context["request"].user, **validated_data)
        for i, img in enumerate(images):
            PortfolioImage.objects.create(item=item, image=img, sort_order=i)
        return item


class UserCustomSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCustomSkill
        fields = ["id", "name", "created_at"]


class MeSerializer(serializers.ModelSerializer):
    user_skills = UserSkillSerializer(many=True, required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    skills = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    custom_skills = serializers.ListField(
        child=serializers.CharField(max_length=80), required=False, write_only=True
    )
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "bio",
            "avatar",
            "user_skills",
            "skills",
            "custom_skills",
            "date_joined",
            "last_login",
            "is_online",
        )
        read_only_fields = ("id", "username", "date_joined", "last_login")

    def get_is_online(self, obj):
        last_seen = obj.last_login
        if not last_seen:
            return False
        return timezone.now() - last_seen <= timedelta(minutes=5)

    def update(self, instance, validated_data):
        # Use None sentinel so partial updates (e.g., only bio) don't wipe skills
        skill_ids_raw = validated_data.pop("skills", None)
        custom_names_raw = validated_data.pop("custom_skills", None)
        incoming_user_skills = validated_data.pop("user_skills", None)
        skill_ids = set(skill_ids_raw) if skill_ids_raw is not None else None
        custom_names = (
            [s.strip() for s in custom_names_raw if s and s.strip()]
            if custom_names_raw is not None
            else None
        )

        for field in ("first_name", "last_name", "bio", "email"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        if "avatar" in validated_data:
            instance.avatar = validated_data.get("avatar")
        instance.save()

        if incoming_user_skills is not None:
            existing = {us.skill_id: us for us in instance.user_skills.all()}
            for item in incoming_user_skills:
                skill = item["skill"]
                level = item.get("level")
                years = item.get("years")
                if skill.id in existing:
                    us = existing[skill.id]
                    if level is not None:
                        us.level = level
                    if years is not None:
                        us.years = years
                    us.save()
                else:
                    UserSkill.objects.create(user=instance, skill=skill, level=level, years=years)

        if skill_ids is not None:
            current_skill_ids = set(
                UserSkill.objects.filter(user=instance).values_list("skill_id", flat=True)
            )
            to_delete = current_skill_ids - skill_ids
            if to_delete:
                UserSkill.objects.filter(user=instance, skill_id__in=to_delete).delete()

            missing = skill_ids - current_skill_ids
            if missing:
                UserSkill.objects.bulk_create(
                    [UserSkill(user=instance, skill_id=sid) for sid in missing]
                )

        if custom_names is not None:
            current_custom = set(
                UserCustomSkill.objects.filter(owner=instance).values_list("name", flat=True)
            )
            to_delete_custom = current_custom - set(custom_names)
            if to_delete_custom:
                UserCustomSkill.objects.filter(owner=instance, name__in=to_delete_custom).delete()
            for name in custom_names:
                UserCustomSkill.objects.get_or_create(owner=instance, name=name)

        return instance


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Старый пароль неверен.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return user
