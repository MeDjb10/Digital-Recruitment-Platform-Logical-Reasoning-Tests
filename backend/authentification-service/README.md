# Authentication Service

## Overview

This authentication service provides secure user management features including login, token refresh, logout, and JWT-based authentication. It's built with Node.js, Express, and follows microservice architecture patterns, communicating with the User Management Service for credential validation.

## Features

- **JWT Authentication** - Secure token-based authentication with access and refresh tokens
- **Token Refresh** - Automatic token renewal using refresh tokens
- **Rate Limiting** - Protection against brute force attacks and abuse
- **Security Headers** - Comprehensive security middleware using Helmet
- **API Documentation** - Interactive Swagger/OpenAPI documentation
- **Structured Logging** - Comprehensive logging using Winston and Morgan
- **Circuit Breaker** - Resilient external service communication
- **Message Broker Integration** - Event publishing via RabbitMQ

## Architecture

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── middleware/      # Custom middleware (auth, security, logging, error handling)
├── routes/          # Route definitions
├── utils/           # Utility functions and helpers
├── config/          # Configuration management
└── app.js          # Main application entry point
```

## API Endpoints

### Authentication

| Endpoint                  | Method | Description                    | Authentication |
| ------------------------- | ------ | ------------------------------ | -------------- |
| `/api/auth/login`         | POST   | User login with email/password | None           |
| `/api/auth/refresh-token` | POST   | Refresh access token           | None           |
| `/api/auth/logout`        | POST   | User logout                    | Bearer Token   |
| `/api/auth/verify`        | GET    | Verify token validity          | Bearer Token   |
| `/api/auth/test`          | GET    | Health check                   | None           |

### Health Check

| Endpoint  | Method | Description           |
| --------- | ------ | --------------------- |
| `/health` | GET    | Service health status |

### Documentation

| Endpoint    | Method | Description                              |
| ----------- | ------ | ---------------------------------------- |
| `/api-docs` | GET    | Interactive API documentation (dev only) |

## Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
JWT_EXPIRY_EXTENDED=15d
REFRESH_TOKEN_EXPIRY_EXTENDED=30d

# Service Authentication
SERVICE_TOKEN=your_service_to_service_token

# External Services
USER_SERVICE_URL=http://localhost:3001/api/users

# Message Broker
RABBITMQ_URL=amqp://localhost:5672

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:4200
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- RabbitMQ server
- User Management Service running on port 3001

### Installation

1. Clone the repository and navigate to the authentication service directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your configuration values
5. Start the service:

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

### Docker Support

The service can be run using Docker with the docker-compose.yml in the project root.

## Security Features

- **Helmet Security Headers** - XSS protection, HSTS, CSP
- **Rate Limiting** - Multiple tiers of rate limiting for different endpoints
- **JWT Security** - Secure token generation with configurable expiration
- **CORS Configuration** - Proper cross-origin resource sharing setup
- **Error Handling** - Secure error responses that don't leak sensitive information

## Development

### Project Structure

- **Controllers**: Handle HTTP requests and delegate to services
- **Services**: Contain business logic and external service communication
- **Middleware**: Authentication, security, logging, and error handling
- **Routes**: Define API endpoints and apply middleware
- **Utils**: Reusable utilities for tokens, logging, circuit breakers, etc.
- **Config**: Environment-based configuration management

### Rate Limiting

- **General**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Password Reset**: 3 requests per hour
- **OTP**: 5 requests per 15 minutes

### API Documentation

In development mode, interactive API documentation is available at:
`http://localhost:3000/api-docs`

### Logging

The service uses structured logging with different levels:

- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Access logs**: `logs/access.log`

## Testing

```bash
npm test
```

## Dependencies

### Production Dependencies

- **express**: Web framework
- **jsonwebtoken**: JWT implementation
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **winston**: Logging
- **morgan**: HTTP request logging
- **swagger-jsdoc & swagger-ui-express**: API documentation
- **axios**: HTTP client for external services
- **bcrypt**: Password hashing utilities
- **cors**: CORS middleware
- **amqplib**: RabbitMQ client
- **opossum**: Circuit breaker
- **nodemailer**: Email utilities

### Development Dependencies

- **nodemon**: Development server with auto-restart

## Troubleshooting

### Common Issues

1. **Service fails to start**: Check that all environment variables are set
2. **Cannot connect to User Management Service**: Verify `USER_SERVICE_URL` and that the service is running
3. **RabbitMQ connection errors**: Ensure RabbitMQ is running and `RABBITMQ_URL` is correct
4. **JWT errors**: Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set

### Health Check

Use the health endpoint to verify service status:

```bash
curl http://localhost:3000/health
```

## License

MIT
