# auth Specification

## Purpose
Email/password + Google OAuth login, JWT session persistence, route guarding, and profile fetch for the Spanish-language costos SPA — ported from `panacea-clubsocios`.

## Requirements

### Requirement: Email/Password Login
The system SHALL allow a user to authenticate with email and password against the backend's OAuth2 password grant endpoint, in a Spanish-language login screen.

#### Scenario: Successful credential login
- **WHEN** a user submits a valid email and password on `/login`
- **THEN** the system SHALL POST `application/x-www-form-urlencoded` `{ username: email, password }` to `/auth/token`, store the returned `access_token` in local storage, and navigate to the app's home page

#### Scenario: Invalid credentials
- **WHEN** the backend responds with a non-2xx status to a login attempt
- **THEN** the system SHALL display the backend's error detail (or a generic Spanish fallback message) inline on the login form without navigating away

### Requirement: Google OAuth Login
The system SHALL allow a user to authenticate via Google, redirecting to the backend's OAuth flow and completing the session on return.

#### Scenario: Initiate Google login
- **WHEN** a user clicks "Continuar con Google" on `/login`
- **THEN** the system SHALL redirect the browser to `/auth/google` with a `redirect_uri` pointing at this app's `/auth/callback` route

#### Scenario: Successful OAuth callback
- **WHEN** `/auth/callback` loads with a `token` query parameter
- **THEN** the system SHALL store the token, fetch the user's profile, and navigate to the app's home page

#### Scenario: Failed OAuth callback
- **WHEN** `/auth/callback` loads with an `error` query parameter instead of a token
- **THEN** the system SHALL redirect to `/login` and display that error message

### Requirement: Session Persistence and Profile
The system SHALL persist an authenticated session across page reloads and populate the current user's profile from the backend.

#### Scenario: Reload with valid stored session
- **WHEN** the app loads and a valid `access_token` exists in local storage
- **THEN** the system SHALL treat the user as authenticated without requiring re-login, and call `GET /profile/me` to populate the displayed user info

#### Scenario: Reload with no stored session
- **WHEN** the app loads and no session is stored
- **THEN** the system SHALL treat the user as unauthenticated

### Requirement: Route Guarding
The system SHALL restrict all non-auth routes to authenticated users.

#### Scenario: Unauthenticated access to a protected route
- **WHEN** an unauthenticated user navigates to any route other than `/login` or `/auth/callback`
- **THEN** the system SHALL redirect them to `/login`

#### Scenario: 401 during an authenticated session
- **WHEN** any API call returns HTTP 401
- **THEN** the system SHALL clear the stored session and redirect to `/login`

### Requirement: Logout
The system SHALL allow an authenticated user to end their session.

#### Scenario: User logs out
- **WHEN** a user clicks "Cerrar sesión"
- **THEN** the system SHALL clear the stored session and redirect to `/login`
