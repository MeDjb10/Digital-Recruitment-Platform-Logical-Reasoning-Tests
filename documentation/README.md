# Recruitment Platform - Product Backlog  
*MoSCoW Prioritized User Stories with Business Value and Complexity*  

---

## 📋 **Product Backlog**  

| **Feature**               | **ID** | **User Story**                                                                 | **Business Value** | **Priority** | **Complexity (SP)** | **MoSCoW** |  
|---------------------------|--------|--------------------------------------------------------------------------------|--------------------|--------------|---------------------|------------|  
| **User Authentication**    | 1.1    | As a **Candidate**, I want to register with email/password to access tests.    | High               | 1            | 3                   | MUST       |  
|                           | 1.2    | As a **Candidate**, I want to log in via Google/GitHub for faster access.      | High               | 2            | 5                   | MUST       |  
|                           | 1.3    | As an **Admin**, I want to reset user passwords to resolve account issues.      | Medium             | 3            | 3                   | MUST       |  
| **Profile Management**     | 1.4    | As a **Candidate**, I want to edit my profile (name, phone, resume).           | Medium             | 4            | 5                   | SHOULD     |  
| **Test Creation**          | 2.1    | As an **Admin**, I want to create logical reasoning questions (D-70/D-2000).   | High               | 1            | 8                   | MUST       |  
|                           | 2.2    | As an **Admin**, I want to tag questions by difficulty (Easy/Medium/Hard).     | High               | 2            | 3                   | MUST       |  
|                           | 2.3    | As an **Admin**, I want to auto-save question drafts to avoid losing progress. | Medium             | 3            | 3                   | SHOULD     |  
|                           | 2.4    | As an **Admin**, I want to import questions from CSV/Excel to save time.       | Low                | 4            | 8                   | COULD      |  
| **Candidate Testing**      | 3.1    | As a **Candidate**, I want to take timed tests to simulate real exams.         | High               | 1            | 5                   | MUST       |  
|                           | 3.2    | As a **Candidate**, I want to flag questions for review during the test.       | High               | 2            | 3                   | MUST       |  
|                           | 3.3    | As a **Candidate**, I want to see a progress bar to track test completion.    | Medium             | 3            | 2                   | SHOULD     |  
| **Scoring & Analytics**    | 4.1    | As a **System**, I want to calculate test scores instantly after submission.  | High               | 1            | 5                   | MUST       |  
|                           | 4.2    | As a **Psychologist**, I want to filter candidates by score range (e.g., 70-100). | High          | 2            | 5                   | MUST       |  
|                           | 4.3    | As a **Psychologist**, I want to export candidate reports in PDF for sharing. | Medium             | 3            | 8                   | SHOULD     |  
| **Security & Anti-Cheat**  | 5.1    | As a **System**, I want to detect tab/window switching during tests.          | High               | 1            | 8                   | MUST       |  
|                           | 5.2    | As a **System**, I want to block copy-paste actions during tests.             | High               | 2            | 5                   | MUST       |  
| **AI/ML Integration**      | 6.1    | As a **System**, I want to classify question difficulty using K-means.        | High               | 1            | 13                  | MUST       |  
|                           | 6.2    | As a **System**, I want to auto-generate test reports using AI.               | Medium             | 2            | 8                   | SHOULD     |  
| **Deployment & Monitoring**| 7.1    | As a **DevOps**, I want to deploy the platform using Docker.                  | High               | 1            | 13                  | MUST       |  
|                           | 7.2    | As a **DevOps**, I want to monitor server uptime with Grafana dashboards.      | Medium             | 2            | 8                   | SHOULD     |  

---

## 🚀 **Example Sprint Breakdown**  
### Sprint 1: Core Authentication & Test Creation  
- **User Stories**: 1.1 (3 SP) | 1.2 (5 SP) | 2.1 (8 SP) | 2.2 (3 SP)  
- **Total SP**: 19  

### Sprint 2: Testing & Security  
- **User Stories**: 3.1 (5 SP) | 3.2 (3 SP) | 5.1 (8 SP) | 5.2 (5 SP)  
- **Total SP**: 21  

### Sprint 3: AI/ML & Analytics  
- **User Stories**: 6.1 (13 SP) | 4.1 (5 SP) | 4.2 (5 SP)  
- **Total SP**: 23  

---

## ✅ **Definition of Done (DoD)**  
1. Code reviewed, tested, and merged into the `main` branch.  
2. Passes 90%+ unit/integration test coverage.  
3. Documentation updated in the project Wiki/README.  
4. No critical bugs open in the sprint backlog.  

---

## 🛠️ **Technologies**  
- **Frontend**: React.js  
- **Backend**: Node.js + Express  
- **Database**: MongoDB  
- **AI/ML**: Python + Scikit-learn  
- **DevOps**: Docker, Prometheus, Grafana  

---

**Developers**: Mohamed Amine Jabou, Mohamed Taleb Mouelhi  
