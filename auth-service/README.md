# Authentication Microservice

This repository contains the Authentication microservice for the Digital Recruitment Platform. The service handles user authentication, authorization, and account management, including registration, login, email verification, password reset, and token management.

## Features

- **User Management**:
  - Registration with role-based account creation (candidate, admin, moderator, psychologist)
  - Email verification
  - Login with JWT authentication
  - Password reset functionality
  - User profile management

- **Authentication**:
  - JWT-based authentication
  - Access tokens (short-lived) and refresh tokens (long-lived)
  - Token verification middleware
  - Role-based access control

- **Security**:
  - Password hashing with bcrypt
  - Protection against common vulnerabilities
  - Secure token management

## Project Structure

- **config/**: Configuration files
  - **database.js**: MongoDB connection setup
  - **logger.js**: Winston logger configuration

- **controllers/**: API controllers
  - **authController.js**: Authentication controllers (register, login, etc.)

- **middlewares/**: Express middlewares
  - **auth.js**: Authentication and authorization middlewares

- **models/**: MongoDB schemas
  - **user.js**: User model with role-based differentiation
  - **role.js**: Role and permissions model
  - **token.js**: Token model for verification and reset tokens

- **routes/**: API route definitions
  - **authRoutes.js**: Authentication and user management routes

- **services/**: Business logic services
  - **emailService.js**: Email sending service for verification, reset, etc.

- **utils/**: Utility functions
  - **jwt.js**: JWT generation and verification utilities

- **scripts/**: Utility scripts
  - **test-db.js**: Database testing script
  - **test-auth.js**: Authentication endpoints testing script

## API Endpoints

### Public Endpoints

- **POST /api/auth/register**
  - Register a new user
  - Body: `{ firstName, lastName, email, password, gender, role, dateOfBirth, currentPosition, desiredPosition, educationLevel }`
  - Returns: User data and access token

- **POST /api/auth/login**
  - Authenticate a user
  - Body: `{ email, password }`
  - Returns: User data, access token and refresh token

- **POST /api/auth/forgot-password**
  - Request password reset
  - Body: `{ email }`
  - Returns: Success message

- **PATCH /api/auth/reset-password/:token**
  - Reset password using token
  - Body: `{ password, confirmPassword }`
  - Returns: Success message

- **GET /api/auth/verify-email/:token**
  - Verify user's email address
  - Redirects to frontend with verification status

- **POST /api/auth/refresh-token**
  - Get a new access token using refresh token
  - Body: `{ refreshToken }`
  - Returns: New access token

### Protected Endpoints

- **GET /api/auth/me**
  - Get current user profile
  - Headers: `Authorization: Bearer {token}`
  - Returns: User profile data

- **POST /api/auth/logout**
  - Invalidate refresh token (logout)
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ refreshToken }`
  - Returns: Success message

## Authentication Flow

### Registration Flow
1. User submits registration form
2. Server validates input and creates user account (status: pending)
3. Verification email is sent to the user
4. User clicks verification link in email
5. User account is activated (status: active)

### Login Flow
1. User submits login credentials
2. Server validates credentials and generates:
   - Access token (short-lived, 15 minutes)
   - Refresh token (long-lived, 7 days)
3. Frontend stores both tokens

### Token Refresh Flow
1. Access token expires
2. Frontend uses refresh token to request new access token
3. Server validates refresh token and issues new access token
4. Frontend continues making API requests with new access token

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory with the following variables:
PORT=3000 MONGODB_URI=mongodb://localhost:27017/auth-service JWT_SECRET=your_jwt_secret_key JWT_EXPIRATION=15m REFRESH_TOKEN_EXPIRATION=7d EMAIL_SERVICE=gmail EMAIL_USER=your_email@gmail.com EMAIL_PASSWORD=your_app_password EMAIL_FROM=your_email@gmail.com NODE_ENV=development FRONTEND_URL=http://localhost:4200 MOCK_EMAIL=true # Set to false in production