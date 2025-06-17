# Authentication Service Documentation

## Overview

This authentication service provides secure user management features including registration, login, password reset, and two-factor authentication via one-time passwords (OTP). It's built with Node.js, Express, and MongoDB, using JWT for secure authentication.

## Features

- **User Registration** - Create new user accounts with encrypted passwords
- **Login Authentication** - Verify credentials and generate JWT tokens
- **Password Management** - Reset and update passwords with secure validation
- **OTP Authentication** - Enhanced security with one-time passwords sent via email
- **Token-based Access Control** - Protected routes using JWT verification
- **Role-based Authorization** - Different access levels for candidates, recruiters, and admins

## API Endpoints

### Authentication

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/auth/register` | POST | Register a new user | `{ firstName, lastName, email, password }` | `{ message: "User registered successfully" }` |
| `/api/auth/login` | POST | Authenticate with email/password | `{ email, password }` | `{ accessToken, refreshToken }` |
| `/api/auth/logout` | POST | End current session | None | `{ message: "Logged out successfully" }` |
| `/api/auth/profile` | GET | Get authenticated user profile | None (requires auth token) | `{ message, userId, role }` |

### OTP and Password Management

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/auth/request-password-reset` | POST | Request a password reset | `{ email }` | `{ message, resetToken }` |
| `/api/auth/verify-reset-otp` | POST | Verify reset OTP | `{ email, otp, resetToken }` | `{ message, resetToken }` |
| `/api/auth/reset-password` | POST | Set new password | `{ email, resetToken, newPassword }` | `{ message }` |
| `/api/auth/request-login-otp` | POST | Request login OTP | `{ email }` | `{ message }` |
| `/api/auth/verify-login-otp` | POST | Verify login OTP | `{ email, otp }` | `{ message, accessToken, refreshToken }` |

## Authentication Flow

### Standard Login

1. User submits email and password to `/api/auth/login`
2. Service validates credentials against database
3. If valid, returns JWT access and refresh tokens

### Secure OTP Login

1. User requests OTP via `/api/auth/request-login-otp`
2. System generates OTP, saves it to user record, and sends via email
3. User submits OTP through `/api/auth/verify-login-otp`
4. If valid and not expired, returns JWT tokens

### Password Reset

1. User requests password reset via `/api/auth/request-password-reset`
2. System generates OTP and reset token, sends OTP via email
3. User verifies OTP through `/api/auth/verify-reset-otp`
4. User submits new password with reset token via `/api/auth/reset-password`
5. System updates password and clears reset tokens

## Security Features

- Passwords stored with bcrypt hashing
- JWT-based authentication with configurable expiration
- OTP expiration after 5 minutes
- Email verification for new accounts
- Rate limiting and IP-based protection (planned)

## Environment Configuration

Required environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017/auth-service
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1h
EMAIL_SERVICE=smtp.example.com
EMAIL_USER=user@example.com
EMAIL_PASSWORD=email_password
EMAIL_FROM=noreply@recruitflow.com
PORT=3000
```


## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env` file
4. Start the service: `npm start`

## Development and Testing

- Run in development mode: `npm run dev`
- Test email functionality: `POST /api/auth/test-email` with `{ email: "recipient@example.com" }`

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200/201 for success
- 400 for invalid requests
- 401/403 for authentication errors
- 404 for not found resources
- 500 for server errors

Detailed error messages are provided in the response body.

## Dependencies

- Express.js - Web framework
- Mongoose - MongoDB object modeling
- Bcrypt - Password hashing
- Jsonwebtoken - JWT implementation
- Nodemailer - Email services
- Dotenv - Environment variable management

## Future Enhancements

- Multi-factor authentication options
- Social login integration
- Session management and tracking
- Advanced rate limiting
- Audit logging for security events