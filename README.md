# Arena

A monorepo containing a React frontend and Django REST API backend.

## Project Structure

```
Arena/
├── frontend/          # React.js frontend application
├── backend/           # Django REST API backend
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## Clone with Token (Windows)

If you are on a Windows machine where GitHub is not logged in, clone using a
[GitHub Personal Access Token (PAT)](https://github.com/settings/tokens):

```bat
git clone https://<YOUR_TOKEN>@github.com/m32jawad/Arena.git
```

Replace `<YOUR_TOKEN>` with your actual PAT.  No GitHub login or credential
manager is needed.

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

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- npm or yarn

## Getting Started

### Frontend (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

### Backend (Django REST API)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment (if not already created):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration if needed.

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
   ```bash
   python manage.py runserver
   ```

   The backend API will be available at `http://localhost:8000`

## Running Both Projects

To run both frontend and backend simultaneously, open two terminal windows and follow the respective setup instructions above.

## Development

- **Frontend**: Built with Create React App
- **Backend**: Django 6.0.2 with Django REST Framework 3.16.1

## License

See LICENSE file for details.
