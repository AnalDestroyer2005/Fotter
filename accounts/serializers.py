from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class PerformerSerializer(serializers.ModelSerializer):
    skills = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id","username","first_name","last_name","email","skills","avatar","bio")

    def get_skills(self, obj):
        # related_name у UserSkill = "user_skills"
        return [
            {"id": us.skill_id, "name": us.skill.name, "level": us.level, "years": str(us.years)}
            for us in obj.user_skills.select_related("skill").all()
        ]
