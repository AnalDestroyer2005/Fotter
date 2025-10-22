from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend:
    """ Позволяет логиниться и email'ом, и username'ом. """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username:
            return None
        user = User.objects.filter(
            Q(username__iexact=username) | Q(email__iexact=username)
        ).first()
        if user and user.check_password(password):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
