from django.conf import settings
from django.db import models


class Chat(models.Model):
    """Private chat between two or more users."""

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="chats", blank=False
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chats",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return f"Chat #{self.pk}"


class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"], name="msg_chat_created_idx"),
            models.Index(fields=["chat", "is_read"], name="msg_chat_read_idx"),
        ]

    def __str__(self):
        return f"{self.chat_id}:{self.sender_id}:{self.text[:20]}"
