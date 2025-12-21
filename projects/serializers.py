from rest_framework import serializers

from .models import Order, Project, Review


class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    def validate(self, attrs):
        # sanitize skills: only keep strings, strip empties
        skills = attrs.get("skills")
        if skills is not None:
            if not isinstance(skills, (list, tuple)):
                raise serializers.ValidationError({"skills": "Список навыков должен быть массивом строк."})
            attrs["skills"] = [s.strip() for s in skills if isinstance(s, str) and s.strip()]
        return attrs

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["owner", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    target_username = serializers.CharField(source="target.username", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "order",
            "author",
            "author_username",
            "target",
            "target_username",
            "rating",
            "text",
            "created_at",
        ]
        read_only_fields = ["author", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        order = attrs.get("order")
        if order.status != Order.Status.COMPLETED:
            raise serializers.ValidationError("Отзыв возможен только по завершённому заказу.")
        if request.user not in (order.customer, order.freelancer):
            raise serializers.ValidationError("Вы не участник сделки.")
        return attrs

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        order = validated_data["order"]
        validated_data.setdefault(
            "target",
            order.customer if self.context["request"].user == order.freelancer else order.freelancer,
        )
        return super().create(validated_data)
