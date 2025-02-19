# API Gateway Documentation

## Overview
The API Gateway serves as the single entry point for all client requests to the microservices in the recruitment platform. It handles routing, authentication, and aggregation of responses from various services.

## Features
- **Routing**: Directs requests to the appropriate microservice based on the URL path.
- **Middleware**: Implements necessary middleware for logging, error handling, and authentication.
- **Service Aggregation**: Combines responses from multiple services when needed.

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd recruitment-platform/api-gateway
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Running the API Gateway
To start the API Gateway, run:
```
npm start
```
This will launch the server on the default port (usually 3000).

### Testing
To run tests, use:
```
npm test
```

## Directory Structure
- `src/app.ts`: Entry point for the API Gateway.
- `src/routes/index.ts`: Defines the routes for the API Gateway.

## Best Practices
- Keep the API Gateway lightweight; delegate heavy processing to microservices.
- Implement rate limiting and caching to improve performance.
- Use environment variables for configuration settings.
- Ensure proper logging for monitoring and debugging.

## License
This project is licensed under the MIT License. See the LICENSE file for details.