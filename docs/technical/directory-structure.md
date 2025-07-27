# Directory Structure for GitHub Project Miner

## Overview
The GitHub Project Miner is a web application that automates the discovery, analysis, validation, and evaluation of abandoned GitHub projects. This document outlines the current organization of the project repository, which has been restructured for better documentation management and development workflow.

## Current Repository Structure
```
GH_Gold_Mine/
├── docs/                     # All project documentation
│   ├── planning/            # Strategic planning documents
│   ├── requirements/        # Technical requirements and specifications
│   └── technical/           # Architecture and technical documentation
├── README.md                # Project overview and setup instructions
└── LICENSE                  # Project license (MIT)
```

## Documentation Organization

### docs/planning/
Strategic planning and conceptual documents:
```
docs/planning/
├── ai-driven-revival-research.md          # Advanced research on AI-driven revival
├── github-project-mining.md               # Core project mining methodology
├── mining-github-abandoned-gold-deep-dive.md  # Deep-dive guide
├── mining-github-for-gold-strategic-approach.md  # Strategic approach
├── product-description.md                 # Comprehensive product description
├── specialist-job-analysis.md             # Job analysis for specialists
└── target-audience.md                     # Target audience analysis
```

### docs/requirements/
Technical requirements and specifications:
```
docs/requirements/
├── features-results.md                    # Features and expected results
├── product-requirements.md               # Product Requirements Document (PRD)
├── software-requirements.md              # Software Requirements Specification (SRS)
└── tickets.md                            # Development tickets and tasks
```

### docs/technical/
Architecture and technical documentation:
```
docs/technical/
├── backend-structure.md                  # Backend architecture guidelines
├── directory-structure.md                # This file - project structure
├── frontend-guidelines.md                # Frontend development guidelines
├── knowledge-graph.md                    # Knowledge graph documentation
├── tech-stack.md                         # Technology stack specifications
└── work-breakdown-structure.md           # Work breakdown structure (WBS)
```

## Planned Development Structure
When development begins, the repository will be expanded to include:

```
GH_Gold_Mine/
├── docs/                     # Documentation (current)
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page-level components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React Context for state management
│   │   ├── api/             # API client functions
│   │   ├── styles/          # Tailwind CSS configurations
│   │   ├── types/           # TypeScript type definitions
│   │   └── tests/           # Unit and integration tests
│   ├── public/              # Public assets
│   ├── package.json         # Frontend dependencies
│   └── Dockerfile           # Docker configuration
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # MongoDB models
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript types
│   │   └── tests/           # Unit and integration tests
│   ├── package.json         # Backend dependencies
│   └── Dockerfile           # Docker configuration
├── scripts/                  # Automation scripts
│   ├── discovery/           # GitHub project discovery
│   ├── analysis/            # Code quality analysis
│   ├── validation/          # Project validation
│   └── evaluation/          # Business opportunity evaluation
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml           # Continuous integration
│       ├── deploy.yml       # Deployment automation
│       └── discovery.yml    # Scheduled project discovery
├── docker-compose.yml        # Local development setup
├── package.json             # Root dependencies and scripts
├── README.md                # Project overview
└── LICENSE                  # MIT License
```

## Key Design Principles

### Documentation-First Approach
- All planning and requirements documented before development
- Clear separation of strategic, requirements, and technical documentation
- Kebab-case naming convention for consistency

### Zero-Cost Architecture
- Leverages free tiers of cloud services
- Uses open-source tools exclusively
- Designed for GitHub Actions, Netlify/Vercel, and MongoDB Atlas free tiers

### Scalable Structure
- Modular frontend and backend separation
- Microservices-ready architecture
- Docker containerization for consistent deployment

### Development Workflow
- GitHub Actions for CI/CD automation
- Environment-specific configurations
- Comprehensive testing strategy

## File Naming Conventions
- **Documentation**: kebab-case (e.g., `product-requirements.md`)
- **Code**: camelCase for variables/functions, PascalCase for components
- **Directories**: lowercase with hyphens for multi-word names
- **Configuration**: Standard conventions (e.g., `package.json`, `Dockerfile`)

## Next Steps
1. Initialize frontend React application with Vite
2. Set up backend Node.js/Express server
3. Configure MongoDB Atlas connection
4. Implement GitHub API integration
5. Set up CI/CD pipelines
6. Deploy to production environments

This structure ensures maintainability, scalability, and adherence to the project's zero-cost operational requirements while supporting the full development lifecycle from planning through deployment.
