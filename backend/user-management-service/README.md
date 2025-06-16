# User Management Service

# User Management Service

A comprehensive user management microservice for the Digital Recruitment Platform, handling user profiles, roles, authorization, and test assignment workflows.

## 🏗️ Architecture

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── models/          # Database schemas/models (Mongoose)
├── routes/          # Route definitions
├── middleware/      # Custom middleware (auth, security, logging, error handling)
├── utils/           # Utility functions and helpers
├── config/          # Configuration management
├── scripts/         # Database seeding and utility scripts
└── app.js          # Main Express application
```

## 📋 Features

- **User Profile Management**: Complete CRUD operations for user profiles
- **Role-Based Access Control**: Admin, Moderator, Psychologist, and Candidate roles
- **Test Authorization Workflow**: Candidate authorization requests and approval process
- **File Upload**: Profile picture management with image processing
- **Service-to-Service Communication**: Secure inter-service communication
- **Real-time Notifications**: RabbitMQ integration for event-driven messaging
- **Comprehensive Logging**: Structured logging with Winston
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Security**: Rate limiting, CORS, Helmet security headers, and input validation

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- RabbitMQ (v3.8 or higher) - Optional for messaging

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd user-management-service
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or start your local MongoDB instance
   mongod
   ```

5. **Start RabbitMQ (Optional)**
   ```bash
   # Using Docker
   docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
   ```

### Running the Service

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

#### Running Tests

```bash
npm test
```

## 🔧 Configuration

### Environment Variables

| Variable         | Description                   | Default                                     |
| ---------------- | ----------------------------- | ------------------------------------------- |
| `PORT`           | Server port                   | `3001`                                      |
| `NODE_ENV`       | Environment mode              | `development`                               |
| `MONGODB_URI`    | MongoDB connection string     | `mongodb://localhost:27017/user-management` |
| `JWT_SECRET`     | JWT signing secret            | Required                                    |
| `SERVICE_TOKEN`  | Service-to-service auth token | Required                                    |
| `CORS_ORIGIN`    | Allowed CORS origins          | `*`                                         |
| `EMAIL_HOST`     | SMTP server host              | `smtp.gmail.com`                            |
| `EMAIL_PORT`     | SMTP server port              | `587`                                       |
| `EMAIL_USER`     | SMTP username                 | Required                                    |
| `EMAIL_PASSWORD` | SMTP password                 | Required                                    |
| `RABBITMQ_URL`   | RabbitMQ connection URL       | `amqp://localhost:5672`                     |

### Example .env File

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/user-management

# Authentication
JWT_SECRET=your-super-secret-jwt-key
SERVICE_TOKEN=your-service-to-service-token

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@recruitflow.com

# CORS
CORS_ORIGIN=http://localhost:4200

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
```

## 📚 API Documentation

Once the service is running, you can access the interactive API documentation at:

- **Swagger UI**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/health
- **API Info**: http://localhost:3001/api

### Main Endpoints

#### User Management

- `GET /api/users` - Get all users (with filtering and pagination)
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/profile` - Get current user profile
- `POST /api/users/create` - Create user (service-to-service)
- `PUT /api/users/:userId` - Update user profile
- `DELETE /api/users/:userId` - Delete user (admin only)
- `PATCH /api/users/:userId/status` - Update user status

#### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/validate-credentials` - Credential validation (service-to-service)

#### Role Management

- `PUT /api/roles/assign` - Assign role to user
- `GET /api/roles/:userId` - Get user role (service-to-service)

#### Test Authorization

- `POST /api/test-auth/request` - Submit test authorization request
- `GET /api/test-auth/requests` - Get authorization requests
- `PUT /api/test-auth/:userId/status` - Update authorization status

## 🛡️ Security Features

- **Rate Limiting**: Different limits for general API, auth, and upload endpoints
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP security headers
- **Input Validation**: Comprehensive request validation
- **Authentication**: JWT-based user authentication
- **Service Authentication**: Token-based service-to-service authentication
- **File Upload Security**: File type and size validation

## 📊 Logging

The service uses structured logging with different levels:

- **Error**: Application errors and exceptions
- **Warn**: Warning messages and rate limit violations
- **Info**: General application information and lifecycle events
- **HTTP**: Request/response logging
- **Debug**: Detailed debugging information

Logs are written to:

- Console (development)
- Files in `logs/` directory (production)
- Structured format for log aggregation services

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing

1. Follow the established folder structure
2. Write tests for new functionality
3. Use proper error handling with the existing error middleware
4. Follow the logging conventions
5. Update API documentation for new endpoints
6. Ensure security best practices

## 📄 License

MIT License - see LICENSE file for details.

---

**Service Status**: ✅ Production Ready  
**Last Updated**: 2025-01-01  
**Version**: 1.0.0
