# Tech Stack for GitHub Project Miner

## Introduction
This document outlines the technology stack for the GitHub Project Miner application, a web-based tool designed to automate the discovery, analysis, validation, and evaluation of abandoned GitHub projects. The stack is selected to ensure scalability, maintainability, and adherence to a $0 budget using free and open-source tools.

## Frontend
- **React**: A JavaScript library for building user interfaces, chosen for its component-based architecture and large ecosystem.
- **Tailwind CSS**: A utility-first CSS framework for creating responsive and modern designs efficiently.
- **Axios or Fetch API**: For making HTTP requests to the backend and GitHub API.

## Backend
- **Node.js**: A JavaScript runtime for building scalable network applications.
- **Express**: A minimal and flexible Node.js web application framework for creating RESTful APIs.
- **MongoDB (via MongoDB Atlas)**: A NoSQL database for storing project and user data, with a free tier on MongoDB Atlas.

## DevOps
- **Docker**: For containerizing the application to ensure consistency across different environments.
- **Kubernetes**: For orchestrating containers, providing scalability and management (optional for MVP).
- **GitHub Actions**: For continuous integration and continuous deployment (CI/CD) to automate testing and deployment processes.

## Code Quality
- **ESLint**: A tool for identifying and fixing problems in JavaScript code.
- **Prettier**: An opinionated code formatter to ensure consistent code style.
- **Husky**: For setting up Git hooks to enforce code quality checks before commits.

## Hosting
- **Frontend**: Hosted on Netlify or Vercel, both offering free tiers for static site hosting.
- **Backend**: Hosted on Heroku or Render, providing free tiers for small applications.

All selected technologies are either open-source or offer free tiers, ensuring the project can be developed and deployed without incurring costs.