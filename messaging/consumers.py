import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Chat, Message

User = get_user_model()


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        allowed = await self._is_participant(user.id, self.chat_id)
        if not allowed:
            await self.close(code=4003)
            return
        self.group_name = f"chat_{self.chat_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        user = self.scope["user"]
        text = content.get("text", "").strip()
        if not text:
            return
        message = await self._create_message(self.chat_id, user.id, text)
        payload = {
            "type": "chat.message",
            "id": message["id"],
            "chat": message["chat"],
            "sender": message["sender"],
            "text": message["text"],
            "created_at": message["created_at"],
        }
        await self.channel_layer.group_send(self.group_name, payload)

    async def chat_message(self, event):
        await self.send_json(event)

    @database_sync_to_async
    def _is_participant(self, user_id, chat_id):
        return Chat.objects.filter(id=chat_id, participants__id=user_id).exists()

    @database_sync_to_async
    def _create_message(self, chat_id, sender_id, text):
        msg = Message.objects.create(chat_id=chat_id, sender_id=sender_id, text=text)
        return {
            "id": msg.id,
            "chat": msg.chat_id,
            "sender": {"id": msg.sender_id},
            "text": msg.text,
            "created_at": msg.created_at.isoformat(),
        }
