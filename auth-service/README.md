# Authentication Service

This directory contains the Authentication microservice for the Recruitment Platform. The service is responsible for handling user authentication, including registration, login, and token management.

## Project Structure

- **src/**: Contains the source code for the authentication service.
  - **app.ts**: Entry point for the application, initializes the Express app and middleware.
  - **routes/**: Contains route definitions for the authentication service.
    - **index.ts**: Defines routes for user registration, login, and token management.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the `auth-service` directory:
   ```
   cd auth-service
   ```

3. Install the dependencies:
   ```
   npm install
   ```

### Running the Service

To start the authentication service, run the following command:
```
npm start
```

The service will be available at `http://localhost:3000`.

### API Endpoints

- **POST /api/auth/register**: Register a new user.
- **POST /api/auth/login**: Log in an existing user.
- **GET /api/auth/token**: Refresh the authentication token.

### Testing

To run the tests for the authentication service, use the following command:
```
npm test
```

## Best Practices

- Ensure to validate user input to prevent security vulnerabilities.
- Use environment variables to manage sensitive information such as database credentials and JWT secrets.
- Implement proper error handling and logging for better maintainability.

## License

This project is licensed under the MIT License. See the LICENSE file for details.