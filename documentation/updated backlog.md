# Digital Recruitment Platform - Product Backlog

## Feature: User Management
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| UM-001  | As an **Admin**, I want to assign roles (Moderator, Psychologist, Candidate) so that user access is managed properly. | High | 1 | 5 | MUST |
| UM-002  | As an **Admin**, I want to consult the list of users so that I can monitor platform activity. | High | 1 | 4 | MUST |
| UM-003  | As an **Admin**, I want to modify user information so that records stay up to date. | Medium | 2 | 4 | SHOULD |
| UM-004  | As a **Moderator**, I want to consult the list of users so that I can review platform participants. | Medium | 2 | 3 | SHOULD |
| UM-005  | As a **Moderator**, I want to assign the **Psychologist** role so that the right users can evaluate candidates. | Medium | 2 | 4 | SHOULD |

## Feature: Test Management
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| TM-001  | As a **Psychologist**, I want to assign tests to candidates so that I can evaluate them. | High | 1 | 5 | MUST |
| TM-002  | As a **Psychologist**, I want to schedule tests for candidates so that I can organize the evaluation process. | Medium | 2 | 4 | SHOULD |
| TM-003  | As a **Candidate**, I want to take a timed test so that my performance is measured objectively. | Critical | 1 | 7 | MUST |
| TM-004  | As a **Candidate**, I want my test progress to be saved automatically so that I don’t lose my answers. | Medium | 2 | 4 | SHOULD |
| TM-005  | As a **Psychologist**, I want to pause or stop a candidate’s test so that I can manage special cases. | Medium | 2 | 5 | SHOULD |

## Feature: Score Calculation & Results
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| SC-001  | As a **Candidate**, I want my score to be calculated automatically so that I receive immediate feedback. | High | 1 | 6 | MUST |
| SC-002  | As a **Candidate**, I want to view my results and a breakdown by category so that I understand my strengths and weaknesses. | High | 1 | 5 | MUST |
| SC-003  | As a **Candidate**, I want to see my test status (finished, in treatment) so that I know what happens next. | Medium | 2 | 4 | SHOULD |

## Feature: Psychologist Evaluation
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| PE-001  | As a **Psychologist**, I want to add comments after a test so that I can provide feedback to candidates. | Critical | 1 | 5 | MUST |
| PE-002  | As a **Psychologist**, I want to access test reports so that I can analyze candidate performance. | High | 1 | 5 | MUST |

## Feature: Dashboard & Reporting
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| DR-001  | As a **Psychologist**, I want to consult the general dashboard for all tests so that I can monitor trends. | High | 1 | 5 | MUST |
| DR-002  | As a **Psychologist**, I want to consult the dashboard for a specific user’s tests so that I can review individual progress. | High | 1 | 5 | MUST |
| DR-003  | As an **Admin**, I want the ability to export reports for integration with external HR systems. | Medium | 2 | 5 | SHOULD |

## Feature: Anti-Fraud & Security
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| AF-001  | As an **Admin**, I want the system to detect cheating automatically so that fraud is minimized. | Critical | 1 | 8 | MUST |
| AF-002  | As a **Candidate**, I want to receive a notification if fraud is detected so that I am aware of the issue. | Medium | 2 | 4 | SHOULD |
| AF-003  | As an **Admin**, I want to monitor suspicious activity logs so that I can investigate potential fraud. | High | 1 | 6 | MUST |

## Feature: Authentication & Profile Management
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| AP-001  | As a **Candidate**, I want to create an account so that I can access the platform. | High | 1 | 4 | MUST |
| AP-002  | As a **Candidate**, I want to log in securely using JWT authentication so that my credentials remain safe. | High | 1 | 6 | MUST |
| AP-003  | As a **Candidate**, I want to recover my password if I forget it so that I can regain access. | Medium | 2 | 4 | SHOULD |
| AP-004  | As a **Candidate**, I want to update my personal information so that my profile remains current. | Medium | 2 | 3 | SHOULD |
| AP-005  | As a **Candidate**, I want to log out securely so that my session is properly closed. | High | 1 | 3 | MUST |

## Feature: AI-Powered Assistance
| ID      | User Story | Business Value | Priority | Complexity | MoSCoW |
|---------|-----------|---------------|----------|------------|--------|
| AI-001  | As a **Systeme**, I want to classify candidates based on test results and performance. | High | 1 | 7 | MUST |
| AI-002  | As a **Systeme**, I want to Create performance reports and generate comments for recruiters.| High | 2 | 6 | SHOULD |