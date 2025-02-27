# Detailed Backlog – Digital Recruitment Platform (Logical Reasoning Tests)

This backlog is organized by features and contains detailed user stories, business values, priorities, complexities, and MoSCoW classifications.

---

## Feature 1: Test Management

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-001** | As a Super Admin, I want to create, modify, and delete logical reasoning questions (logic of propositions) so that test content can be managed dynamically. | High | 1 | 8 | MUST |
| **RL-002** | As an Admin, I want to add difficulty levels (Easy, Medium, Hard) to questions so that tests are better differentiated. | High | 2 | 5 | MUST |
| **RL-003** | As a Candidate, I want to take a timed logical reasoning test so that my performance is measured objectively. | Critical | 1 | 7 | MUST |
| **RL-004** | As a Candidate, I want my responses to be automatically saved in case of disconnection to avoid losing progress. | Medium | 2 | 4 | SHOULD |
| **RL-005** | As a Candidate, I want clear instructions and an intuitive test interface so that I can easily understand how to proceed. | Medium | 2 | 3 | SHOULD |

---

## Feature 2: Score Calculation

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-006** | As a Candidate, I want the score to be automatically calculated after the test so that I receive immediate feedback. | High | 1 | 6 | MUST |
| **RL-007** | As a Candidate, I want to view my overall score and a breakdown by category (e.g., numerical logic, sequential logic) to understand my performance. | High | 1 | 5 | MUST |
| **RL-008** | As an Admin, I want detailed performance analysis of test results so that I can evaluate candidate capabilities effectively. | High | 1 | 8 | MUST |

---

## Feature 3: Psychologist Evaluation

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-009** | As a Psychologist, I want to add an evaluation comment after the test so that candidates receive qualitative feedback. | Critical | 1 | 5 | MUST |
| **RL-010** | As an Admin, I want a report generated that includes the psychologist's comment so that evaluation records are automatically documented. | Medium | 2 | 5 | SHOULD |

---

## Feature 4: Report Generation & Performance Analysis

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-011** | As a Candidate, I want a detailed PDF report generated after the test so that I can review my performance comprehensively. | Medium | 2 | 4 | SHOULD |
| **RL-012** | As a Psychologist, I want to access candidate reports for analysis so that I can monitor overall performance trends. | High | 1 | 5 | MUST |
| **RL-013** | As an Admin, I want to export reports for further integration with HR systems so that data-driven decisions can be supported. | Medium | 2 | 5 | SHOULD |

---

## Feature 5: Anti-Fraud & Surveillance

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **RL-014** | As a Super Admin, I want cheating to be automatically detected during tests so that fraudulent behavior is mitigated. | Critical | 1 | 8 | MUST |
| **RL-015** | As a Candidate, I want to receive a notification if fraud is detected so that I am aware of any irregularities. | Medium | 2 | 4 | SHOULD |
| **RL-016** | As an Admin, I want to monitor suspicious activity logs to investigate potential fraud incidents further. | High | 1 | 6 | MUST |

---

## Feature 6: Authentication & Profile Management

| **ID** | **User Story** | **Business Value** | **Priority** | **Complexity** | **MoSCoW** |
|--------|----------------|--------------------|--------------|----------------|------------|
| **A-001** | As a user, I want to create an account using multiple signup methods so that I can easily join the platform. | High | 1 | 6 | MUST |
| **A-002** | As a user, I want to log in securely using JWT-based authentication and MSAL integration so that my credentials are protected. | High | 1 | 6 | MUST |
| **A-003** | As a user, I want to recover my password in case I forget it so that I can regain access to my account. | Medium | 2 | 4 | SHOULD |
| **A-004** | As a user, I want to update my personal information for better personalization so that my profile remains current. | Medium | 2 | 3 | SHOULD |
| **A-005** | As a user, I want to log out securely to ensure my session is properly terminated. | High | 1 | 3 | MUST |


