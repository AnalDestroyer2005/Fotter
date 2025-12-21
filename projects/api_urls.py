from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ReviewViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("reviews", ReviewViewSet, basename="review")
urlpatterns = router.urls
