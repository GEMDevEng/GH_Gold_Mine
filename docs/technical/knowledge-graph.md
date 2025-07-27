# Knowledge Graph for GitHub Project Miner

## Entities
- **Microservices:**
  - Discovery Service
  - Analysis Service
  - Validation Service
  - Evaluation Service
  - User Service
  - API Gateway
- **Databases:**
  - MongoDB Atlas
- **External APIs:**
  - GitHub API
- **Tools:**
  - flake8
  - pylint
  - ESLint
  - spaCy
  - NLTK
  - license-checker
  - Radon
- **Deployment:**
  - Docker
  - Kubernetes
  - GitHub Actions
- **Monitoring:**
  - Sentry
  - Winston
  - Prometheus

## Relationships
- **Discovery Service**
  - uses → GitHub API
  - stores data in → MongoDB Atlas
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus
  - triggered by → GitHub Actions

- **Analysis Service**
  - uses → flake8, pylint, ESLint, spaCy, NLTK
  - stores data in → MongoDB Atlas
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus
  - triggered by → GitHub Actions

- **Validation Service**
  - uses → license-checker, Radon
  - stores data in → MongoDB Atlas
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus

- **Evaluation Service**
  - depends on → Analysis Service, Validation Service
  - stores data in → MongoDB Atlas
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus

- **User Service**
  - stores data in → MongoDB Atlas
  - provides authentication for → API Gateway
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus

- **API Gateway**
  - routes requests to → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service
  - is containerized by → Docker
  - is monitored by → Sentry
  - is logged by → Winston
  - metrics collected by → Prometheus

- **Docker**
  - containers → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service, API Gateway
  - is orchestrated by → Kubernetes

- **Kubernetes**
  - orchestrates → Docker

- **GitHub Actions**
  - triggers → Discovery Service, Analysis Service

- **MongoDB Atlas**
  - stores data for → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service

- **Sentry**
  - monitors → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service, API Gateway

- **Winston**
  - logs → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service, API Gateway

- **Prometheus**
  - collects metrics from → Discovery Service, Analysis Service, Validation Service, Evaluation Service, User Service, API Gateway