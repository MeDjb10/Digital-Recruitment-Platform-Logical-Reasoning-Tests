# User Management Service

This microservice handles user profile management, role assignments, and user-related operations for the Digital Recruitment Platform.

## Features

- User profile management
- Role-based authorization
- User listing and filtering
- User profile updates
- Admin role assignment
- API validation
- Rate limiting

## API Documentation

The API is documented using Swagger/OpenAPI and can be accessed at `/api-docs` when the service is running.

### Main Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/users | List all users | Admin, Moderator |
| GET | /api/users/:userId | Get user by ID | Self or Admin, Moderator |
| PUT | /api/users/:userId | Update user profile | Self or Admin |
| PUT | /api/users/role | Assign role to user | Admin only |

## Authentication

This service relies on JWT tokens issued by the Authentication Service. Tokens should be included in the Authorization header as:Authorization: Bearer <token>