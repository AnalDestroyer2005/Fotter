from django.db.models import Q
from rest_framework import serializers

from accounts.models import Account
from .models import Chat, Message


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ["id", "username", "first_name", "last_name", "avatar", "bio"]


class MessageSerializer(serializers.ModelSerializer):
    sender = PartnerSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "chat", "sender", "text", "is_read", "created_at"]
        read_only_fields = ["id", "sender", "is_read", "created_at"]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["sender"] = request.user
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    participant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    partner = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "project",
            "participants",
            "participant_id",
            "created_at",
            "updated_at",
            "partner",
            "last_message",
            "unread_count",
        ]
        read_only_fields = ["created_at", "updated_at", "partner", "last_message", "unread_count"]

    def get_partner(self, obj: Chat):
        user = self.context["request"].user
        partner = obj.participants.exclude(id=user.id).first()
        return PartnerSerializer(partner).data if partner else None

    def get_last_message(self, obj: Chat):
        msg = getattr(obj, "_last_message", None) or obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "text": msg.text,
            "sender_id": msg.sender_id,
            "created_at": msg.created_at,
        }

    def get_unread_count(self, obj: Chat):
        user = self.context["request"].user
        return (
            getattr(obj, "_unread_count", None)
            if hasattr(obj, "_unread_count")
            else obj.messages.filter(~Q(sender=user), is_read=False).count()
        )

    def validate(self, attrs):
        request = self.context["request"]
        participant_id = attrs.pop("participant_id", None) or self.initial_data.get("participant_id")
        if participant_id:
            try:
                target = Account.objects.get(id=participant_id)
            except Account.DoesNotExist:
                raise serializers.ValidationError({"participant_id": "Участник не найден"})
            if target == request.user:
                raise serializers.ValidationError({"participant_id": "Нельзя создать чат сам с собой"})
            attrs.setdefault("participants", [])
            attrs["participants"].append(request.user)
            attrs["participants"].append(target)
        return attrs

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        chat = Chat.objects.create(**validated_data)
        if participants:
            chat.participants.set(participants)
        else:
            chat.participants.add(self.context["request"].user)
        return chat
