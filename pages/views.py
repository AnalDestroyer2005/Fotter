from django.shortcuts import render

def home(request):
    return render(request, "pages/home.html")

def projects(request):
    return render(request, "pages/projects.html")

def account_hub(request):
    return render(request, "pages/auth_profile.html")

def auth_login_page(request):
    return render(request, "auth_login.html")

def auth_register_page(request):
    return render(request, "auth_register.html")