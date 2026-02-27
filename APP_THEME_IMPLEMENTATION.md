# App Theme Implementation Summary

## Overview
A separate theme system has been implemented for the Signup page that operates independently from the Dashboard theme. Changes update in real-time without page reloads and do not affect the dashboard.

## Components Implemented

### Backend (Django)
1. **New Model: `AppTheme`** ([backend/accounts/models.py](backend/accounts/models.py))
   - Singleton model (like DashboardTheme)
   - Fields:
     - `background_type`: solid, gradient, image, or video
     - `background_value`: color hex, CSS gradient, or empty
     - `background_image`: ImageField for image uploads
     - `background_video`: path to video file (e.g., /bgvideo.mp4)
     - `font_family`: Google Font family name
     - `font_color`: text/font color (hex)
     - `button_color`: button background color (hex)
     - `button_text_color`: button text color (hex)

2. **API Endpoint** ([backend/accounts/views.py](backend/accounts/views.py))
   - `GET /api/auth/app-theme/` - Public endpoint, no authentication required
   - `PUT /api/auth/app-theme/` - Update (superuser only)
   - Returns all theme properties as JSON

3. **URL Route** ([backend/accounts/urls.py](backend/accounts/urls.py))
   - Added: `path('app-theme/', views.app_theme_view, name='app-theme')`

4. **Database Migration**
   - Migration: `0013_apptheme.py` - creates AppTheme table

### Frontend (React)
1. **New Context: `AppThemeContext`** ([frontend/src/context/AppThemeContext.js](frontend/src/context/AppThemeContext.js))
   - `AppThemeProvider` - wraps the app
   - `useAppTheme()` hook - access theme in components
   - Features:
     - Auto-fetches theme on mount
     - **Real-time auto-refresh**: Polls backend every 3 seconds for changes
     - Dynamically injects Google Fonts
     - Provides CSS variables for easy styling
     - Can be enabled/disabled via `setAutoRefreshEnabled()`

2. **Updated App Component** ([frontend/src/App.js](frontend/src/App.js))
   - Wrapped app with `<AppThemeProvider>`
   - Ensures Signup and other public pages can access theme

3. **Updated SignUp Component** ([frontend/src/signup/SignUp.js](frontend/src/signup/SignUp.js))
   - Imports `useAppTheme()` hook
   - New `ThemedVideoBg` component - supports:
     - Solid color backgrounds
     - Gradient backgrounds
     - Image backgrounds
     - Video backgrounds
   - Dynamic inline styles for:
     - Button colors and text
     - Font family and colors
     - Input/field styling
   - All theme changes apply instantly without reload

4. **Settings Panel** ([frontend/src/dashboard/components/Settings.js](frontend/src/dashboard/components/Settings.js))
   - New tab: "App Theme (Signup)"
   - Controls for:
     - Background type selector
     - Background color/gradient/image/video input
     - Font family dropdown
     - Font color picker
     - Button color picker
     - Button text color picker
   - Live preview showing signup page styling
   - Save and Reset buttons

## Features

### Background Support
- **Solid Color**: Single hex color
- **Gradient**: CSS gradient (linear, radial, etc.)
- **Image**: Uploaded image file
- **Video**: Path to video file (e.g., /bgvideo.mp4)

### Real-time Updates
- Changes saved in Settings immediately sync to theme API
- Signup page auto-refreshes theme every 3 seconds
- No page reload required
- Users on signup page see changes within 3 seconds

### Isolation
- Completely separate from DashboardTheme
- No impact on admin dashboard styling
- Public endpoint (no auth required for GET)
- Superuser-only for updates

## Usage

### Admin: Manage Theme
1. Go to Dashboard Settings → "App Theme (Signup)"
2. Select background type (solid, gradient, image, video)
3. Configure colors and fonts
4. Click "Save & Apply Theme"
5. Changes appear on signup page in real-time

### Developer: Access Theme
```javascript
import { useAppTheme } from '../context/AppThemeContext';

function MyComponent() {
  const { appTheme, cssVars } = useAppTheme();
  
  return (
    <div style={{ color: appTheme.font_color }}>
      Text styled with theme
    </div>
  );
}
```

## Default Theme Values
```javascript
{
  background_type: 'solid',
  background_value: '#1a1a2e',
  font_family: '',
  font_color: '#FFFFFF',
  button_color: '#CB30E0',
  button_text_color: '#FFFFFF',
  background_video: '/bgvideo.mp4'
}
```

## API Examples

**Get current theme:**
```bash
GET /api/auth/app-theme/
```

**Update theme:**
```bash
PUT /api/auth/app-theme/
Content-Type: application/x-www-form-urlencoded

background_type=solid&background_value=%231a1a2e&font_color=%23FFFFFF&button_color=%23CB30E0&button_text_color=%23FFFFFF&font_family=Poppins&background_video=%2Fbgvideo.mp4
```

## Files Modified
- ✅ [backend/accounts/models.py](backend/accounts/models.py) - Added AppTheme model
- ✅ [backend/accounts/views.py](backend/accounts/views.py) - Added app_theme_view
- ✅ [backend/accounts/urls.py](backend/accounts/urls.py) - Added URL route
- ✅ [frontend/src/context/AppThemeContext.js](frontend/src/context/AppThemeContext.js) - NEW
- ✅ [frontend/src/App.js](frontend/src/App.js) - Added AppThemeProvider
- ✅ [frontend/src/signup/SignUp.js](frontend/src/signup/SignUp.js) - Updated to use theme
- ✅ [frontend/src/dashboard/components/Settings.js](frontend/src/dashboard/components/Settings.js) - Added theme settings tab

## Next Steps to Deploy
1. Run Django migrations: `python manage.py migrate`
2. Restart Django development server
3. Restart React development server
4. Navigate to Settings → "App Theme (Signup)" to customize
5. Visit /signup to see live updates
