# Test Service Documentation

## Overview
The Test Management microservice is responsible for managing tests within the recruitment platform. It provides endpoints for creating, updating, and retrieving test information.

## Directory Structure
```
test-service
├── src
│   ├── app.ts          # Entry point for the Test Management service
│   └── routes
│       └── index.ts    # Defines routes for managing tests
├── package.json         # Lists dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # Documentation for the Test Management service
```

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation
1. Navigate to the `test-service` directory:
   ```
   cd test-service
   ```
2. Install the dependencies:
   ```
   npm install
   ```

### Running the Service
To start the Test Management microservice, run:
```
npm start
```

### API Endpoints
The following endpoints are available in the Test Management service:

- **GET /tests**: Retrieve a list of all tests.
- **POST /tests**: Create a new test.
- **PUT /tests/:id**: Update an existing test by ID.
- **DELETE /tests/:id**: Delete a test by ID.

## Testing
To run the tests for the Test Management service, use:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.