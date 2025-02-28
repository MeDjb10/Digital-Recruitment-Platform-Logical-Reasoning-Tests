# Final Year Project Report

## General Introduction

The Digital Recruitment Platform project is designed to modernize and optimize the recruitment process by transitioning from traditional, manual testing methods (paper/Excel-based) to a secure, fully digital solution. By integrating artificial intelligence (AI) into the workflow, the platform will automate test administration, scoring, candidate classification, and report generation. Ultimately, this system will deliver faster, more accurate, and fairer candidate evaluations while providing recruiters with actionable analytics.

---

# Chapter 1: Project Overview

## 1.1 Presentation of the Host Organization

**COFAT** is a leading organization in its industry, committed to innovation and operational excellence in recruitment and talent management. As our host organization, COFAT provides not only the strategic framework but also the real-world challenges that this project seeks to address. The platform is intended to align with COFAT’s vision for digital transformation and improved efficiency in recruitment.

## 1.2 Presentation of the Business Domain

Recruitment is a critical function that directly influences organizational performance. Traditionally, candidate evaluations have relied on manual, paper-based tests or Excel spreadsheets, resulting in inefficiencies, errors, and delays.

### 1.2.1 Evolution from Traditional to Digital Transformation

- **Traditional Methods:**  
  Manual test administration and scoring lead to prolonged processing times, inconsistencies, and potential human errors. Data is often stored in disparate formats (e.g., Excel), which makes analysis difficult.
  
- **Digital Transformation:**  
  Modern recruitment demands real-time data processing, automated scoring, and advanced analytics. By transitioning to a digital platform:
  - **Automation** ensures that test results are processed instantly.
  - **AI Integration** classifies questions by difficulty and generates evaluation reports, reducing manual intervention.
  - **Data Centralization** in secure, cloud-based databases improves traceability and facilitates better decision-making.

## 1.3 Study of the Existing System

### 1.3.1 Description and Critique of the Existing System

**Current System:**
- **Test Administration:** Conducted on paper or via Excel, requiring manual input.
- **Evaluation:** Moderators manually correct tests and generate reports, a process that is both time-consuming and error-prone.
- **Data Storage:** Candidate data is stored locally, often in unsecured files, leading to a lack of scalability and data integrity.

**Critique:**
- **Inefficiency:** Manual processes slow down recruitment.
- **Lack of Automation:** Delays in score calculation and report generation hinder timely decision-making.
- **Data Management:** Poor traceability and potential security risks due to non-standardized data storage.

### 1.3.2 Proposed Solution – RecruitFlow

**RecruitFlow** is our proposed digital recruitment platform that addresses the inefficiencies of the current system by:
- **Automating Test Administration:** Enabling candidates to take tests online, with responses automatically captured.
- **Integrating AI:** Using machine learning algorithms to classify question difficulty and generate automated evaluation reports.
- **Enhancing Data Security:** Utilizing cloud-based databases with robust encryption (AES-256) and secure authentication (JWT, 2FA).
- **Providing Analytics:** Offering recruiters real-time dashboards and performance metrics to support data-driven hiring decisions.

## 1.4 Methodology Choice

### 1.4.1 Comparison Between Methodologies

Several methodologies were evaluated:
- **Waterfall:** Offers a linear progression but lacks flexibility and is less suited for iterative improvements.
- **Agile/SCRUM:** Emphasizes iterative development, regular feedback, and continuous improvement—ideal for integrating cutting-edge technologies like AI.

**Comparison:**
- **Waterfall:** Predictable milestones but rigid structure.
- **Agile/SCRUM:** Enables flexibility, rapid prototyping, and iterative refinement based on stakeholder feedback.

### 1.4.2 Adapted Methodology

We have adopted the **Agile/SCRUM** approach due to its adaptability and emphasis on incremental progress:
- **Sprints:** The project is divided into short sprints, each focusing on specific features.
- **Backlog Prioritization:** Features are prioritized using the MoSCoW method (Must, Should, Could, Won’t).
- **Continuous Feedback:** Regular sprint reviews ensure the product meets stakeholder requirements.

---

# Chapter 2: Project Planning

## 2.1 Requirements Specification

### 2.1.1 Identification of Actors

- **Candidate:** Takes the online tests and receives immediate feedback.
- **Moderator/Psychologist:** Reviews candidate performance, provides qualitative feedback, and generates evaluation reports.
- **Admin:** Manages user accounts, configures tests, and oversees the platform’s operation.
- **System (AI/ML):** Automatically classifies questions and generates evaluation reports based on candidate performance.

### 2.1.2 Functional Requirements

- **Test Management:** Create, modify, and delete test questions; assign difficulty levels; administer timed tests.
- **Scoring and Analytics:** Automatic score calculation; detailed breakdown of performance by test categories.
- **Report Generation:** Automated generation of candidate evaluation reports using AI.
- **User Management:** Secure authentication (JWT, MSAL) and profile management.
- **Notifications:** Real-time updates and alerts for test progress and security breaches.

### 2.1.3 Feature-Based Global Use Case Diagram

*A high-level diagram (not included here) would depict the interactions between Candidates, Moderators, and Admins with the system, highlighting key flows such as test taking, scoring, report generation, and user management.*

### 2.1.4 Non-Functional Requirements

- **Performance:** Must support a significant number of concurrent users with low latency.
- **Security:** Implementation of JWT for authentication, AES-256 encryption for data, and adherence to RGPD.
- **Scalability:** Modular, microservices architecture to support future growth.
- **Usability:** Intuitive, responsive design for desktop and mobile.
- **Maintainability:** Clean, modular codebase following best practices.

## 2.2 The Product Backlog

### 2.2.1 MoSCoW Prioritization

The backlog is organized using the MoSCoW method to prioritize essential functionalities.

### 2.2.2 Definition of Done

An item is considered done when:
- Code is implemented, tested, and integrated.
- Documentation is updated.
- Acceptance criteria defined in the user story are met.
- Peer review is completed, and the feature is demonstrated in a sprint review.

### 2.2.3 Digital Recruitment Platform Product Backlog

#### **Feature: Test Management**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-001** | As a Super Admin, I want to create, modify, and delete logical reasoning questions so that test content can be managed dynamically. | High | 1 | 8 | MUST |
| **RL-002** | As an Admin, I want to add difficulty levels (Easy, Medium, Hard) to questions to better differentiate test challenges. | High | 2 | 5 | MUST |
| **RL-003** | As a Candidate, I want to take a timed logical reasoning test so that my performance is measured objectively. | Critical | 1 | 7 | MUST |
| **RL-004** | As a Candidate, I want my responses to be automatically saved in case of disconnection to avoid losing progress. | Medium | 2 | 4 | SHOULD |

#### **Feature: Score Calculation**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-005** | As a Candidate, I want the score to be automatically calculated after the test to receive immediate feedback. | High | 1 | 6 | MUST |
| **RL-006** | As a Candidate, I want to view my overall score and a breakdown by category to better understand my performance. | High | 1 | 5 | MUST |

#### **Feature: Psychologist Evaluation**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-007** | As a Psychologist, I want to add an evaluation comment after the test to provide qualitative feedback to candidates. | Critical | 1 | 5 | MUST |
| **RL-008** | As an Admin, I want a report generated that includes the psychologist's comment to automatically document evaluation records. | Medium | 2 | 5 | SHOULD |

#### **Feature: Report Generation & Performance Analysis**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-009** | As a Candidate, I want a detailed PDF report generated after the test so that I can comprehensively review my performance. | Medium | 2 | 4 | SHOULD |
| **RL-010** | As a Psychologist, I want access to candidate reports for analysis to monitor overall performance trends. | High | 1 | 5 | MUST |
| **RL-011** | As an Admin, I want the ability to export reports for integration with external HR systems to support data-driven decisions. | Medium | 2 | 5 | SHOULD |

#### **Feature: Anti-Fraud & Surveillance**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-012** | As a Super Admin, I want cheating to be automatically detected during tests so that fraudulent behavior is mitigated. | Critical | 1 | 8 | MUST |
| **RL-013** | As a Candidate, I want to receive a notification if fraud is detected so that I am informed of any irregularities. | Medium | 2 | 4 | SHOULD |
| **RL-014** | As an Admin, I want to monitor suspicious activity logs to investigate potential fraud incidents further. | High | 1 | 6 | MUST |

#### **Feature: Authentication & Profile Management**
| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **A-001** | As a user, I want to create an account using multiple signup methods so that I can easily join the platform. | High | 1 | 6 | MUST |
| **A-002** | As a user, I want to log in securely using JWT-based authentication and MSAL integration to protect my credentials. | High | 1 | 6 | MUST |
| **A-003** | As a user, I want to recover my password if I forget it so that I can regain access to my account. | Medium | 2 | 4 | SHOULD |
| **A-004** | As a user, I want to update my personal information for better personalization so that my profile remains current. | Medium | 2 | 3 | SHOULD |
| **A-005** | As a user, I want to log out securely to ensure that my session is properly terminated. | High | 1 | 3 | MUST |

---

## 2.3 Development Environment

### 2.3.1 Backend Development Environment
- **Technologies:** Node.js, Express, MongoDB  
- **Tools:** VS Code, Git, Docker, Postman  
- **Setup:** Local development server with containerized services for modularity and scalability.

### 2.3.2 Frontend Development Environment
- **Technologies:** Angular 19  
- **Tools:** Angular CLI, VS Code, Git, Docker  
- **Setup:** A modular Angular application with feature modules and lazy loading for efficient performance.

### 2.3.3 Other Tools
- **CI/CD:** GitHub Actions for automated testing and deployment.
- **Monitoring:** Prometheus & Grafana for performance monitoring.
- **Collaboration:** GitHub for version control and project management.

## 2.4 System Architecture

(Include a diagram here or refer to an attached file that illustrates the microservices architecture, including components such as API Gateway, Auth Service, Test Service, AI/ML Service, Analytics Service, Notification Service, and their corresponding databases.)

### 2.4.1 Monolith vs. Microservices
- **Decision:** We have opted for a microservices architecture to achieve scalability, maintainability, and independent deployment of system components.

### 2.4.2 Service Decomposition by Business Capability Pattern
- **Example:** Separate services for authentication, test management, scoring, AI/ML processing, and notifications.

### 2.4.3 Database-per-Service Pattern
- Each microservice manages its own database, ensuring loose coupling and better scalability.

## 2.5 Applied Technologies
- **Containerization:** Docker  
- **Container Orchestration:** Kubernetes (for production scalability)  
- **DevOps:** Automated CI/CD pipelines with GitHub Actions  
- **Machine Learning:** Python, scikit-learn, Ollama (for AI functionalities)  
- **Business Intelligence:** Tools for data visualization and analytics

## 2.6 Cloud Computing
- **Reasons:** Scalability, flexibility, and high availability.
- **Chosen Provider:** Microsoft Azure

## 2.7 Release Planning
- **Sprint 0:** Technical setup (infrastructure, database)
- **Sprint 1-2:** Development of the online testing module
- **Sprint 3-4:** Implementation of AI for question classification and automated report generation
- **Sprint 5:** Deployment and final testing

---

# End of Document

**Authors:**  
Mohamed Amine Jabou  
Mohamed Taleb Mouelhi

**Date:** 17/02/2025
