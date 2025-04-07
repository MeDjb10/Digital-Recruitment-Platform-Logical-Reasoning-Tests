# Microservices Architecture Documentation

This document describes the architecture for the Digital Recruitment Platform. The platform is decomposed into multiple loosely coupled microservices, each with a narrowly focused responsibility. The design follows best practices from Chris Richardson’s *Microservices Patterns* and ensures scalability, independent deployability, and fault isolation.

---

## Overview of Microservices

1. **Authentication Service**
2. **User Management Service**
3. **Test Management Service**
4. **AI Microservice**
5. **Notification Microservice**
6. **Reporting & Dashboard Service (Future)**

Each service communicates via a central API Gateway using lightweight protocols (e.g., REST). Services have their own databases to ensure loose coupling and autonomy.

---

## 1. Authentication Service

### Responsibilities
- **User Registration:** Create accounts using basic information (name, email, password).
- **Email Verification:** Send OTP or verification codes to secure account creation.
- **Password Recovery:** Enable "Forgot Password" functionality via email.
- **Token Management:** Issue and validate JWT access and refresh tokens.

### Design Patterns & Best Practices
- **API Gateway:** All authentication requests are routed through the API Gateway.
- **JWT:** Use JSON Web Tokens for stateless authentication.
- **Externalized Configuration:** Store sensitive configuration (e.g., secrets, SMTP settings) in environment variables.
- **Security Best Practices:** Encrypt sensitive data, use HTTPS, and implement rate limiting.

### Key Classes & Functionality
- **User Model:** Represents the user data (name, email, hashed password, etc.).
- **Auth Controller:** Contains endpoints for registration, login, password reset, and email verification.
- **Token Util:** Functions to generate and verify JWT tokens.
- **Email Util:** Utility to send verification and password recovery emails.
- **Middleware:** `verifyToken` to secure endpoints.

### Communication Workflow
1. The Candidate submits registration data.
2. The Auth Controller creates a new user and sends a verification email.
3. On login, the Auth Controller validates credentials, issues JWT tokens, and returns them to the client.
4. The `verifyToken` middleware protects secured routes.

---

## 2. User Management Service

### Responsibilities
- **Profile Management:** Update user profiles and personal information.
- **Role Assignment:** Manage user roles (Candidate, Moderator, Psychologist).
- **Candidate Authorization:** Handle detailed authorization forms for test eligibility.
- **Bulk Operations:** Enable bulk updates on user statuses and roles.

### Design Patterns & Best Practices
- **Domain-Driven Design (DDD):** Model user profiles and roles as distinct aggregates.
- **Service API:** Expose RESTful endpoints for user management.
- **Data Isolation:** Use a separate database (e.g., MongoDB) to store user profiles, independent of other services.
- **CQRS (Command Query Responsibility Segregation):** (Optional) Separate read and write operations if the volume increases.

### Key Classes & Functionality
- **User Model:** Extended user schema with profile details, roles, and status (active/inactive/suspended).
- **User Controller:** Endpoints for viewing, updating, and bulk managing users.
- **Authorization Form Handler:** Processes candidate authorization submissions.
- **Search & Filter Module:** Allows filtering users by status, role, or authorization status.

### Communication Workflow
1. Admins or Moderators call the User Management API via the API Gateway.
2. The service retrieves and updates user profiles.
3. Authorization requests submitted by candidates are stored and later processed by Psychologists.

---

## 3. Test Management Service

### Responsibilities
- **Test Creation & Configuration:** Create, edit, and delete tests.
- **Question Management:** Support two types of questions:
  - **Domino Questions:** Manage domino layouts, including positions, rotations, sizes, and correct answers.
  - **Multiple-Choice Questions:** Handle textual questions with options and one correct answer.
- **Test Attempt Handling:** Record candidate test attempts, including detailed metrics.
- **Anti-Cheat Mechanism:** Warn candidates if they switch tabs during a test.

### Design Patterns & Best Practices
- **Aggregate Pattern:** Test definitions, questions, and attempts form aggregates.
- **Event Logging:** Log user actions for each test attempt for auditing and later analytics.
- **Idempotency:** Ensure that repeated candidate interactions (e.g., auto-saving) do not create duplicate records.
- **Resilience:** Use fallback mechanisms for auto-save and anti-cheat warnings.
- **Data Isolation:** Each test and its attempts are stored in dedicated collections.

### Key Classes & Functionality
- **TestDefinition Model:** Stores test metadata (name, description, type, category, duration, etc.) along with analytics.
- **Question Model:** Base model for questions; uses discriminators for:
  - **DominoQuestion:** Includes domino layouts, grid layout, and correct domino answer.
  - **MultipleChoiceQuestion:** Includes options and correct answer index.
- **TestAttempt Model:** Records candidate test attempts, start/end times, score, and detailed metrics.
- **QuestionResponse Model:** Captures candidate answers with flags for correct, reversed, or half-correct responses.
- **UserAction Model:** Logs candidate interactions (e.g., visits, skips, changes) during test attempts.
- **Canvas Interaction Module:** For Admin UI, an interactive canvas to design domino questions.

### Communication Workflow
1. **Test Creation:** Admin creates a test and associated questions via the Test Management API.
2. **Test Attempt:** When a candidate starts a test:
   - A new TestAttempt document is created.
   - Empty QuestionResponse records are initialized for each question.
3. **During Test:** Candidate interactions (answering, skipping, flagging) update QuestionResponse and UserAction models.
4. **Test Completion:** On submission or timeout, final metrics are calculated, and scores are computed.
5. **Anti-Cheat:** The service monitors tab switches and triggers warnings if needed.

---

## 4. AI Microservice

### Responsibilities
- **Automated Report Generation:** Generate AI-assisted comments (compte rendu) based on candidate test results.
- **Question Classification:** Optionally, assist in classifying test questions using ML models.
  
### Design Patterns & Best Practices
- **Circuit Breaker Pattern:** To protect the service from external AI service failures.
- **API Composition:** Expose a simple API that the Test Management Service can call to obtain AI comments.
- **Externalized Configuration:** Manage AI model configurations and credentials via environment variables.

### Key Classes & Functionality
- **AI Controller:** Endpoints to receive test result data and return generated comments.
- **AI Model Integration:** Wrappers for external ML platforms (e.g., via Ollama/DeepSeek or Azure Machine Learning).
- **Evaluation Engine:** Processes candidate test results and applies prompt engineering to generate feedback.

### Communication Workflow
1. The Test Management Service sends aggregated test result data to the AI Microservice.
2. The AI Microservice processes the data and returns an AI-generated comment.
3. The Test Management Service stores the comment for psychologist review.

---

## 5. Notification Microservice

### Responsibilities
- **Real-Time Notifications:** Send alerts to users regarding test approvals, exam schedules, and suspicious activity.
- **Multi-Channel Delivery:** Support notifications via email, in-app messages, and SMS (if needed).

### Design Patterns & Best Practices
- **Event-Driven Architecture:** Subscribe to system events (e.g., test authorization, test start) and trigger notifications.
- **Asynchronous Messaging:** Use message queues (e.g., RabbitMQ) to decouple notification delivery from the triggering service.
- **Retry Mechanisms:** Implement retries for failed notifications to ensure reliability.

### Key Classes & Functionality
- **Notification Controller:** Exposes endpoints for sending notifications.
- **Notification Service:** Handles business logic for formatting and dispatching notifications.
- **Integration with Email/SMS APIs:** Wrappers for SMTP or third-party messaging services.

### Communication Workflow
1. Other microservices publish events (e.g., candidate approved, test scheduled) to a message broker.
2. The Notification Microservice subscribes to these events.
3. The service formats and sends notifications to the appropriate users.

---

## 6. Reporting & Dashboard Service (Future)

### Responsibilities
- **Data Aggregation:** Collect and aggregate data from various services.
- **Analytics:** Compute high-level metrics such as average scores, completion rates, and detailed question analytics.
- **Dashboard Display:** Provide endpoints for dashboard interfaces to query analytics data.
- **Report Generation:** Allow exporting of reports in CSV/PDF formats.

### Design Patterns & Best Practices
- **CQRS Pattern:** Separate read and write models to optimize queries.
- **API Composition:** Aggregate data from multiple microservices to form a cohesive report.
- **Batch Processing:** Use background jobs to periodically update aggregated metrics.

### Key Classes & Functionality
- **Analytics Snapshot Model:** Stores aggregated metrics at different intervals (daily, weekly, monthly).
- **Dashboard Controller:** Endpoints for querying real-time and historical analytics.
- **Report Generator:** Module to generate downloadable reports.

### Communication Workflow
1. Data is pushed or pulled from other microservices (Test Management, User Management, etc.) into the Reporting Service.
2. Aggregation jobs process and update analytics data periodically.
3. Dashboard interfaces query the Reporting Service for visualizations and reports.

---

## Communication Between Microservices

### API Gateway
- All external requests pass through an API Gateway.
- The gateway routes requests to the appropriate microservice.
- It enforces cross-cutting concerns such as authentication, rate limiting, and logging.

### Inter-Service Communication
- **Synchronous Communication:** For immediate responses (e.g., candidate login, test initiation) via REST APIs.
- **Asynchronous Messaging:** For operations that can be processed in the background (e.g., sending notifications, updating analytics) via message brokers like RabbitMQ.

### Data Consistency & Transactions
- Each microservice maintains its own database, ensuring loose coupling.
- Use eventual consistency models and patterns like **Saga** for managing distributed transactions if necessary.
- Analytics data is aggregated asynchronously to avoid coupling real-time operations with heavy reporting logic.

---

## Summary of Patterns and Best Practices Used

- **Decomposition by Business Capability:** Each microservice is designed around a specific business function (e.g., Authentication, Test Management).
- **API Gateway Pattern:** Centralized entry point for external clients, decoupling clients from services.
- **Domain-Driven Design (DDD):** Define models (e.g., User, TestDefinition, Question) and aggregates in each service.
- **Circuit Breaker Pattern:** Ensure resilience when calling external AI services.
- **Asynchronous Messaging & Event-Driven Architecture:** Decouple services for better scalability and fault tolerance.
- **CQRS:** (For Reporting Service) Separate read and write operations to optimize analytics queries.
- **Externalized Configuration:** Manage service-specific configurations securely outside the codebase.
- **Automated Testing & Continuous Integration:** Ensure each service is tested independently with unit, integration, and contract tests.

