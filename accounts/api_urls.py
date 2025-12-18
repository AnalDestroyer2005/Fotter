from rest_framework.routers import DefaultRouter
from .api_views import PerformerViewSet

router = DefaultRouter()
router.register("performers", PerformerViewSet, basename="performer")
urlpatterns = router.urls
