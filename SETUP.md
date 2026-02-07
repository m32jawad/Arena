# Quick Setup Guide

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
