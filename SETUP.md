# Quick Setup Guide

## Clone with Token (Windows)

If you are on a Windows machine where GitHub is not logged in, use a
[GitHub Personal Access Token (PAT)](https://github.com/settings/tokens) to
clone the repository:

```bat
git clone https://<YOUR_TOKEN>@github.com/m32jawad/Arena.git
```

Replace `<YOUR_TOKEN>` with your actual PAT.  The token is embedded directly
in the HTTPS URL so no GitHub login or credential manager is required.

> **Tip:** Generate a PAT at **GitHub → Settings → Developer settings →
> Personal access tokens → Tokens (classic)** and grant it the `repo` scope.

> **Security warning:** Embedding a token in the URL may expose it in your
> shell history and system process list.  After cloning, consider removing the
> token from the remote URL with:
> ```bat
> git remote set-url origin https://github.com/m32jawad/Arena.git
> ```
> You can then store credentials safely using
> [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager).

---

## Initial Setup

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Create .env file from example
python manage.py migrate
python manage.py runserver
```

## Quick Start Commands

### Frontend
- **Start dev server**: `npm start` (runs on http://localhost:3000)
- **Run tests**: `npm test`
- **Build for production**: `npm run build`

### Backend
- **Start dev server**: `python manage.py runserver` (runs on http://localhost:8000)
- **Create migrations**: `python manage.py makemigrations`
- **Apply migrations**: `python manage.py migrate`
- **Create superuser**: `python manage.py createsuperuser`
- **Django admin**: http://localhost:8000/admin

## Development Workflow

1. Start backend server in one terminal
2. Start frontend server in another terminal
3. Make changes and test
4. Both servers support hot-reloading for development

## Technologies

- **Frontend**: React 19.x with Create React App
- **Backend**: Django 6.0.2 with Django REST Framework 3.16.1
- **Database**: SQLite (default, can be changed in settings.py)
