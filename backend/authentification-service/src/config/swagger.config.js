/**
 * Swagger Configuration
 * API documentation configuration using OpenAPI 3.0
 */

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const env = require("./env");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Authentication Service API",
      version: "1.0.0",
      description:
        "Authentication and authorization API for the Digital Recruitment Platform",
      contact: {
        name: "RecruitFlow Team",
        email: "support@recruitflow.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authorization header using the Bearer scheme",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "password123",
            },
            rememberMe: {
              type: "boolean",
              example: false,
              description: "Extend token expiration time",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Authentication successful",
            },
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            rememberMe: {
              type: "boolean",
              example: false,
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  example: "60d0fe4f5311236168a109ca",
                },
                firstName: {
                  type: "string",
                  example: "John",
                },
                lastName: {
                  type: "string",
                  example: "Doe",
                },
                email: {
                  type: "string",
                  example: "john.doe@example.com",
                },
              },
            },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        VerifyResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Token is valid",
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  example: "60d0fe4f5311236168a109ca",
                },
                role: {
                  type: "string",
                  example: "candidate",
                },
              },
            },
          },
        },
      },
    },
    security: [],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const specs = swaggerJsDoc(swaggerOptions);

const swaggerConfig = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Authentication API Docs",
  customfavIcon: "/favicon.ico",
};

module.exports = {
  specs,
  swaggerUi,
  swaggerConfig,
};
