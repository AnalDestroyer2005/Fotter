from django.db.models import Count, Max, Q
from rest_framework import mixins, permissions, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Chat, Message
from accounts.models import Account
from .serializers import ChatSerializer, MessageSerializer


class IsParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Chat):
            return obj.participants.filter(id=request.user.id).exists()
        if isinstance(obj, Message):
            return obj.chat.participants.filter(id=request.user.id).exists()
        return False


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated, IsParticipant]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Chat.objects.filter(participants=user)
            .prefetch_related("participants")
            .annotate(_last_message_created=Max("messages__created_at"))
            .order_by("-_last_message_created", "-updated_at")
        )
        qs = qs.annotate(
            _unread_count=Count(
                "messages",
                filter=Q(messages__is_read=False) & ~Q(messages__sender=user),
            )
        )
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        last_messages = (
            Message.objects.filter(chat_id__in=[c.id for c in queryset])
            .order_by("chat_id", "-created_at")
            .distinct("chat_id")
        )
        lm_map = {m.chat_id: m for m in last_messages}
        for chat in queryset:
            chat._last_message = lm_map.get(chat.id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        participant = None
        project_id = self.request.data.get("project") or self.request.data.get("project_id")
        participant_id = self.request.data.get("participant_id")

        if participant_id:
            try:
                participant = Account.objects.get(id=participant_id)
            except Account.DoesNotExist:
                raise serializers.ValidationError({"participant_id": "Участник не найден"})
        elif project_id:
            from projects.models import Project

            project = Project.objects.filter(id=project_id).first()
            if project and project.owner_id:
                participant = project.owner

        if not participant:
            raise serializers.ValidationError({"participant_id": "Не удалось определить собеседника"})

        existing = (
            Chat.objects.filter(project_id=project_id if project_id else None, participants=user)
            .filter(participants=participant)
            .first()
        )
        if existing:
            serializer.instance = existing
            return

        chat = serializer.save(project_id=project_id if project_id else None)
        chat.participants.set([user, participant])

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsParticipant])
    def mark_read(self, request, pk=None):
        chat = self.get_object()
        Message.objects.filter(chat=chat, is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response({"status": "ok"})


class MessageViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsParticipant]

    def get_queryset(self):
        user = self.request.user
        chat_id = self.request.query_params.get("chat")
        qs = Message.objects.select_related("chat", "sender", "chat__project").filter(chat__participants=user)
        if chat_id:
            qs = qs.filter(chat_id=chat_id)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset().order_by("-created_at")[:200]
        serializer = self.get_serializer(reversed(list(qs)), many=True)
        if request.query_params.get("chat"):
            Message.objects.filter(chat_id=request.query_params["chat"], is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        chat_id = self.request.data.get("chat") or self.request.data.get("chat_id")
        if not chat_id:
            raise ValueError("chat is required")
        try:
            chat = Chat.objects.get(id=chat_id, participants=self.request.user)
        except Chat.DoesNotExist:
            raise permissions.PermissionDenied("Chat not found")
        serializer.save(chat=chat)
