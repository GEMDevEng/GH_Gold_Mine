# GitHub Project Miner

**Repository Description (350 chars):**
*Automated web app for discovering & evaluating abandoned GitHub projects with revival potential. Built with React, Node.js, MongoDB Atlas using only free tools. Helps entrepreneurs, developers & students identify high-value open-source opportunities at zero cost.*

---

## 🚀 Project Overview

GitHub Project Miner is an intelligent web application that automates the discovery, analysis, validation, and evaluation of abandoned GitHub repositories with high revival potential. By leveraging exclusively free and open-source tools, it democratizes access to valuable open-source opportunities for entrepreneurs, developers, investors, and students.

### ✨ Key Features

- **🔍 Automated Discovery**: Finds inactive repositories (>12 months) with high engagement metrics
- **📊 Sophisticated 8-Factor Analysis**: Evaluates abandonment, community, technical, business, market timing, competitive advantage, revival complexity, and community readiness
- **✅ Project Validation**: Checks licenses, market potential, and technical feasibility
- **💼 Business Evaluation**: Scores projects and recommends monetization strategies
- **👤 Personalized User Dashboard**: Saved repositories, analysis history, and intelligent recommendations
- **📈 Real-time Performance Monitoring**: Comprehensive metrics, alerts, and system optimization
- **🔐 Secure Authentication**: GitHub OAuth integration with session management
- **🆓 Zero-Cost Operation**: Uses only free tools and services (GitHub API, MongoDB Atlas, Netlify/Vercel)
- **🎯 Advanced Search & Filtering**: Revival potential scoring, language filters, and smart recommendations

### 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB Atlas (Free Tier)
- **Authentication**: GitHub OAuth + JWT
- **Hosting**: Netlify (Frontend) + Render/Railway (Backend)
- **CI/CD**: GitHub Actions
- **Analysis Tools**: flake8, ESLint, spaCy, NLTK, GitPython

### 🎯 Target Users

- **Entrepreneurs**: Seeking innovative project ideas with existing codebases
- **Developers**: Looking for projects to contribute to or adopt
- **Investors**: Identifying promising open-source opportunities
- **Students**: Finding beginner-friendly projects for learning
- **Companies**: Discovering reusable components and libraries

## 🌟 Enhanced Features (Week 2 Sprint)

### 👤 User Dashboard & Personalization
- **Comprehensive User Dashboard**: Multi-tab interface with overview, saved repositories, analysis history, and recommendations
- **Saved Repositories Management**: Full CRUD operations with revival score display and quick actions
- **Analysis History Tracking**: Chronological display of user's repository analyses with re-analysis capability
- **Intelligent Recommendations**: ML-like recommendation engine based on user's analysis patterns and language preferences
- **Usage Statistics**: Visual progress bars for API usage, analyses run, and subscription quotas

### 📊 Performance Monitoring & Optimization
- **Real-time Performance Dashboard**: Live metrics with 30-second refresh intervals and configurable time windows
- **Analysis Engine Monitoring**: Phase-by-phase timing for 8-factor scoring with performance baselines
- **API Performance Tracking**: Automatic response time monitoring with <2 second targets
- **Database Optimization**: Slow query detection and alerting with <1 second thresholds
- **System Resource Monitoring**: Memory, CPU, and uptime tracking with threshold-based alerts
- **Comprehensive Error Tracking**: Automated alerting system with 95%+ success rate monitoring

### 🔐 Enhanced Authentication & Security
- **GitHub OAuth Integration**: Secure authentication with JWT token management and session handling
- **User Profile Management**: Preferences, settings, and account management with encrypted token storage
- **Protected Routes**: Comprehensive authentication middleware with development bypass
- **Session Management**: Automatic token refresh and secure cookie handling

### 🎯 Advanced Analysis Capabilities
- **8-Factor Revival Scoring**: Sophisticated algorithm with dynamic weighting and confidence adjustment
- **Performance Baseline**: <20 seconds for complete repository analysis with real-time tracking
- **Enhanced Search & Filtering**: Revival potential-based discovery with advanced sorting options
- **Repository Detail Views**: Comprehensive analysis display with actionable recommendations

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0.0 or higher) or **yarn** (v1.22.0 or higher)
- **Git** - [Download](https://git-scm.com/)
- **Docker** (optional, for containerized development) - [Download](https://www.docker.com/)

### Required Accounts & API Keys

1. **GitHub Account** - For OAuth authentication and API access
   - Create a GitHub Personal Access Token with `repo` and `user` scopes
   - [Generate Token](https://github.com/settings/tokens)

2. **MongoDB Atlas** - For database hosting (Free Tier)
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Whitelist your IP address and create database user

3. **Netlify Account** - For frontend hosting (Free Tier)
   - Sign up at [Netlify](https://www.netlify.com/)

4. **Render/Railway Account** - For backend hosting (Free Tier)
   - Sign up at [Render](https://render.com/) or [Railway](https://railway.app/)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/GEMDevEng/GH_Gold_Mine.git
cd GH_Gold_Mine
```

### 2. Environment Configuration

Create environment files for both frontend and backend:

**Frontend (.env.local)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_TOKEN=your_github_personal_access_token
CORS_ORIGIN=http://localhost:3000
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 4. Database Setup

1. **MongoDB Atlas Configuration**:
   - Create a new database named `github_project_miner`
   - Create collections: `projects`, `users`, `analyses`, `evaluations`
   - Update connection string in backend `.env` file

2. **Local Development Database** (Optional):
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

### 5. Development Server

Run both frontend and backend in development mode:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## 📖 Usage Instructions

### Getting Started

1. **Sign Up/Login**: Create an account or login with GitHub OAuth
2. **Explore Dashboard**: View curated high-potential projects
3. **Discover Projects**: Use advanced filters to find specific projects
4. **Analyze Projects**: View detailed analysis reports for any project
5. **Evaluate Opportunities**: Check business potential and monetization strategies
6. **Save Favorites**: Bookmark interesting projects for later review

### Core Features

#### 🔍 Project Discovery
- **Search Filters**: Language, domain, stars, forks, last activity
- **Sorting Options**: By stars, forks, issues, last commit date
- **Bulk Operations**: Export search results, batch analysis

#### 📊 Project Analysis
- **Code Quality**: Automated linting, complexity metrics, technical debt
- **Documentation**: README analysis, comment density, wiki presence
- **Community Health**: Contributor activity, issue response time, fork patterns
- **Legal Status**: License compatibility, IP clarity, dependency licenses

#### 💼 Business Evaluation
- **Market Potential**: Competitor analysis, demand indicators, trend alignment
- **Revival Feasibility**: Technical debt assessment, modernization requirements
- **Monetization Strategies**: SaaS conversion, API licensing, consulting opportunities
- **Risk Assessment**: Abandonment reasons, maintenance complexity, legal issues

## 🔌 API Documentation

### Base URL
```
Production: https://your-app.render.com/api
Development: http://localhost:5000/api
```

### Authentication
All API endpoints require authentication via JWT token:
```bash
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Projects
```bash
GET    /api/projects              # Get paginated project list
GET    /api/projects/search       # Search projects with filters
GET    /api/projects/:id          # Get project details
POST   /api/projects/:id/analyze  # Trigger project analysis
GET    /api/projects/:id/analysis # Get analysis results
POST   /api/projects/:id/favorite # Add to favorites
DELETE /api/projects/:id/favorite # Remove from favorites
```

#### Users
```bash
GET    /api/users/profile         # Get user profile
PUT    /api/users/profile         # Update user profile
GET    /api/users/favorites       # Get user's favorite projects
GET    /api/users/history         # Get user's search history
```

#### Analysis
```bash
POST   /api/analysis/batch        # Batch analyze multiple projects
GET    /api/analysis/status/:id   # Get analysis job status
GET    /api/analysis/results/:id  # Get analysis results
```

#### Evaluation
```bash
GET    /api/evaluation/scores     # Get business opportunity scores
GET    /api/evaluation/trends     # Get market trend data
POST   /api/evaluation/compare    # Compare multiple projects
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": { ... }
  }
}
```

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Workflow

1. **Fork the Repository**
   ```bash
   git fork https://github.com/GEMDevEng/GH_Gold_Mine.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow the coding standards (ESLint + Prettier)
   - Write tests for new functionality
   - Update documentation as needed

4. **Commit Changes**
   ```bash
   git commit -m "feat: add new project analysis feature"
   ```
   Use [Conventional Commits](https://www.conventionalcommits.org/) format

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: Follow ESLint and Prettier configurations
- **Testing**: Maintain >80% test coverage for new code
- **Documentation**: Update README and API docs for new features
- **Performance**: Ensure changes don't impact free tier limits
- **Security**: Follow OWASP guidelines for web security

### Areas for Contribution

- **Frontend Components**: React components, UI/UX improvements
- **Backend Services**: API endpoints, data processing algorithms
- **Analysis Tools**: Integration with additional code quality tools
- **Documentation**: User guides, API documentation, tutorials
- **Testing**: Unit tests, integration tests, E2E tests
- **DevOps**: CI/CD improvements, deployment automation

## 🚀 Deployment

### Production Deployment

#### Frontend (Netlify)
1. Connect GitHub repository to Netlify
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/dist`
4. Configure environment variables in Netlify dashboard

#### Backend (Render/Railway)
1. Connect GitHub repository to hosting platform
2. Set build command: `cd backend && npm run build`
3. Set start command: `cd backend && npm start`
4. Configure environment variables in platform dashboard

#### Environment Variables (Production)
```env
# Backend
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_production_jwt_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_TOKEN=your_github_token
CORS_ORIGIN=https://your-frontend-domain.netlify.app

# Frontend
VITE_API_BASE_URL=https://your-backend.render.com/api
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

### Monitoring & Analytics

- **Health Checks**: `/api/health` endpoint for uptime monitoring
- **Error Tracking**: Integrated error logging and reporting
- **Performance Metrics**: API response times and database query performance
- **Usage Analytics**: User activity tracking (privacy-compliant)

## 📚 Documentation

- **[Product Requirements](docs/requirements/product-requirements.md)**: Detailed feature specifications
- **[Technical Architecture](docs/technical/backend-structure.md)**: System design and architecture
- **[API Reference](docs/technical/api-reference.md)**: Complete API documentation
- **[Deployment Guide](docs/technical/deployment.md)**: Production deployment instructions
- **[Contributing Guide](CONTRIBUTING.md)**: Detailed contribution guidelines

## 🔗 Related Resources

- **[GitHub API Documentation](https://docs.github.com/en/rest)**
- **[MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)**
- **[React Documentation](https://react.dev/)**
- **[Node.js Documentation](https://nodejs.org/docs/)**
- **[Tailwind CSS Documentation](https://tailwindcss.com/docs)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub** for providing free API access and hosting
- **MongoDB** for Atlas free tier database hosting
- **Netlify/Vercel** for free frontend hosting
- **Render/Railway** for free backend hosting
- **Open Source Community** for the amazing tools and libraries

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GEMDevEng/GH_Gold_Mine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GEMDevEng/GH_Gold_Mine/discussions)
- **Email**: gemdev25@gmail.com

---

**⭐ Star this repository if you find it useful!**

Made with ❤️ by the GitHub Project Miner team
