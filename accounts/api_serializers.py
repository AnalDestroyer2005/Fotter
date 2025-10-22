from django.contrib.auth import get_user_model
from rest_framework import serializers
from taxonomy.models import Skill, UserSkill

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
        fields = ("id","name","slug")

class UserSkillSerializer(serializers.ModelSerializer):
    skill = SkillBriefSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(source="skill", queryset=Skill.objects.all(), write_only=True)
    class Meta:
        model = UserSkill
        fields = ("id","skill","skill_id","level","years")

class MeSerializer(serializers.ModelSerializer):
    user_skills = UserSkillSerializer(many=True)
    # подгони под свои поля модели Account, если есть bio/avatar
    bio = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.ImageField(read_only=True, required=False)

    class Meta:
        model = User
        fields = ("id","username","email","first_name","last_name","bio","avatar","user_skills")
        read_only_fields = ("id","username","email","avatar")

    def update(self, instance, validated_data):
        for field in ("first_name","last_name","bio"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        if "user_skills" in validated_data:
            incoming = validated_data["user_skills"]
            existing = {us.skill_id: us for us in instance.user_skills.all()}
            for item in incoming:
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
        return instance
