from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.core.paginator import Paginator
from django.db.models import Q, F, Prefetch, Count, Max

from projects.models import Project, Order
from taxonomy.models import Category, UserSkill, Skill
from accounts.models import Account
from messaging.models import Chat, Message


# ---------- Статичные страницы ----------
def home(request):
    top_freelancers = (
        Account.objects.filter(is_active=True)
        .prefetch_related(
            Prefetch(
                "user_skills",
                queryset=UserSkill.objects.select_related("skill").only("skill__name"),
                to_attr="prefetched_user_skills",
            ),
            Prefetch("custom_skills", to_attr="prefetched_custom_skills"),
        )
        .order_by("-date_joined")[:6]
    )
    for acc in top_freelancers:
        skill_names = [us.skill.name for us in getattr(acc, "prefetched_user_skills", []) if us.skill]
        custom_names = [cs.name for cs in getattr(acc, "prefetched_custom_skills", [])]
        acc.skills_combined = skill_names + custom_names
    return render(request, "pages/home.html", {"top_freelancers": top_freelancers})


def auth_login_page(request):
    return render(request, "pages/auth_login.html")


def auth_register_page(request):
    return render(request, "pages/auth_register.html")


def settings_page(request):
    return render(request, "pages/settings.html")


def account_page(request):
    # Страница аккаунта (размечена в auth_profile.html)
    return render(request, "pages/auth_profile.html")


# alias
account_hub = account_page


# ---------- Сообщения (заглушка контекста) ----------
@login_required
def messages_page(request):
    user = request.user
    chat_id = request.GET.get("chat")
    project_param = request.GET.get("project")

    # Автосоздание чата по проекту из кнопки "Чат"
    if project_param and user.is_authenticated:
        from projects.models import Project

        try:
            project = Project.objects.get(id=project_param)
        except Project.DoesNotExist:
            project = None

        if project and project.owner and project.owner_id != user.id:
            chat = (
                Chat.objects.filter(project_id=project.id, participants=user)
                .filter(participants=project.owner)
                .first()
            )
            if not chat:
                chat = Chat.objects.create(project=project)
                chat.participants.set([user, project.owner])
            return redirect(f"/messages/?chat={chat.id}")

    chats = (
        Chat.objects.filter(participants=user)
        .prefetch_related("participants")
        .annotate(last_msg_created=Max("messages__created_at"))
        .order_by("-last_msg_created", "-updated_at")
    )

    active_chat = None
    if chat_id:
        active_chat = chats.filter(id=chat_id).first()
    if not active_chat:
        active_chat = chats.first()

    messages_qs = Message.objects.none()
    if active_chat:
        messages_qs = (
            Message.objects.filter(chat=active_chat)
            .select_related("sender")
            .order_by("created_at")
        )
        Message.objects.filter(chat=active_chat, is_read=False).exclude(sender=user).update(is_read=True)

    for chat in chats:
        chat.partner = chat.participants.exclude(id=user.id).first()
        chat.last_message = chat.messages.order_by("-created_at").first()
        chat.unread_count = chat.messages.filter(is_read=False).exclude(sender=user).count()

    ctx = {
        "chats": chats,
        "messages": messages_qs,
        "active_chat": active_chat,
        "active_chat_id": active_chat.id if active_chat else None,
    }
    return render(request, "pages/messages.html", ctx)


# ---------- Проекты ----------
def projects_page(request):
    qs = Project.objects.select_related("category", "owner")
    selected_skills = []

    # категории
    cat = request.GET.get("category")
    if cat:
        qs = qs.filter(category__slug=cat)

    # бюджет
    bmin = request.GET.get("budget_min")
    bmax = request.GET.get("budget_max")
    if bmin:
        qs = qs.filter(Q(budget_min__gte=bmin) | Q(budget_max__gte=bmin))
    if bmax:
        qs = qs.filter(Q(budget_min__lte=bmax) | Q(budget_max__lte=bmax))

    # поиск
    s = request.GET.get("search")
    if s:
        qs = qs.filter(Q(title__icontains=s) | Q(description__icontains=s))

    # навыки (comma-separated)
    skills_param = request.GET.get("skills")
    if skills_param:
        selected_skills = [v.strip() for v in skills_param.split(",") if v.strip()]
        for sk in selected_skills:
            qs = qs.filter(skills__icontains=sk)

    # срок (дни, опционально)
    deadline_param = request.GET.get("deadline")
    if deadline_param:
        try:
            dval = int(deadline_param)
            qs = qs.filter(Q(deadline__lte=dval) | Q(deadline__isnull=True))
        except ValueError:
            pass

    # сортировка
    sort = request.GET.get("sort", "new")
    if sort == "budget":
        qs = qs.order_by(
            F("budget_max").desc(nulls_last=True),
            F("budget_min").desc(nulls_last=True),
        )
    else:
        qs = qs.order_by("-created_at")

    page = Paginator(qs, 12).get_page(request.GET.get("page"))

    ctx = {
        "page_title": "Проекты",
        "search_placeholder": "Поиск проектов...",
        "sort_options": [("new", "Новые"), ("budget", "Бюджет")],
        "items": page,
        "categories": Category.objects.all()[:80],
        "skills": Skill.objects.all()[:100],
        "selected_skills": selected_skills,
    }
    return render(request, "pages/projects.html", ctx)


# ---------- Исполнители ----------
def freelancers_page(request):
    """
    Список исполнителей без лишних запросов (prefetch user skills).
    """
    qs = Account.objects.filter(is_active=True)

    s = request.GET.get("search")
    if s:
        qs = qs.filter(
            Q(username__icontains=s)
            | Q(first_name__icontains=s)
            | Q(last_name__icontains=s)
            | Q(bio__icontains=s)
        )

    sort = request.GET.get("sort", "new")
    if sort == "name":
        qs = qs.order_by("first_name", "last_name", "username")
    elif sort == "recent_login":
        qs = qs.order_by(F("last_login").desc(nulls_last=True))
    else:
        qs = qs.order_by("-date_joined")

    # навыки (comma-separated from checkboxes)
    selected_skills = []
    skills_param = request.GET.get("skills")
    if skills_param:
        selected_skills = [v.strip() for v in skills_param.split(",") if v.strip()]
        for sk in selected_skills:
            qs = qs.filter(
                Q(userskill__skill__name__iexact=sk) | Q(custom_skills__name__iexact=sk)
            )

    qs = qs.annotate(
        portfolio_count=Count("portfolio"),
        completed_orders=Count(
            "orders_as_freelancer",
            filter=Q(orders_as_freelancer__status=Order.Status.COMPLETED),
        ),
    ).prefetch_related(
        Prefetch(
            "user_skills",
            queryset=UserSkill.objects.select_related("skill")
            .only("skill__name")
            .order_by("skill__name"),
            to_attr="prefetched_user_skills",
        ),
        Prefetch("custom_skills", to_attr="prefetched_custom_skills"),
    )

    page = Paginator(qs, 12).get_page(request.GET.get("page"))

    # build combined skills for template for current page only
    for acc in page:
        skill_names = [us.skill.name for us in getattr(acc, "prefetched_user_skills", []) if us.skill]
        custom_names = [cs.name for cs in getattr(acc, "prefetched_custom_skills", [])]
        acc.skills_combined = skill_names + custom_names

    ctx = {
        "page_title": "Исполнители",
        "search_placeholder": "Поиск исполнителей...",
        "sort_options": [("new", "Новые"), ("name", "Имя"), ("recent_login", "Недавний вход")],
        "items": page,
        "categories": Category.objects.all()[:80],
        "skills": Skill.objects.all()[:100],
        "selected_skills": selected_skills,
    }
    return render(request, "pages/freelancers.html", ctx)
