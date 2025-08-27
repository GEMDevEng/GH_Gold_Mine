# Dashboard Integration Setup

This document explains how to set up and test the real API integration for the GitHub Gold Mine dashboard.

## What Was Implemented

✅ **Replaced hardcoded dashboard data with real API integration**
- Dashboard now fetches data from `/api/repositories/statistics`
- Analysis stats from `/api/analysis/stats`
- High potential repositories from `/api/repositories/high-potential`
- Added proper error handling and loading states
- Added retry functionality for failed requests

## Backend Setup

### 1. Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/gh-gold-mine
JWT_SECRET=dev-jwt-secret-key-change-in-production
BYPASS_AUTH=true
GITHUB_TOKEN=your-github-token-here
LOG_LEVEL=debug
```

### 2. Database Setup

Make sure MongoDB is running locally, then seed the database:

```bash
cd backend
npm run seed
```

This will populate the database with sample repositories for testing.

### 3. Start Backend Server

```bash
cd backend
NODE_ENV=development BYPASS_AUTH=true npm run dev
```

The server should start on `http://localhost:3000`

## Frontend Setup

### 1. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173`

### 2. Test the Dashboard

1. Navigate to `http://localhost:5173`
2. The dashboard should now display real data from the API
3. If you see errors, check that:
   - Backend server is running on port 3000
   - MongoDB is running and seeded with data
   - Environment variables are set correctly

## API Endpoints

The dashboard uses these endpoints:

- `GET /api/repositories/statistics` - Repository counts and statistics
- `GET /api/analysis/stats` - Analysis statistics and scores
- `GET /api/repositories/high-potential?limit=3` - High potential repositories

## Testing

### Manual API Testing

Use the included `test-dashboard.html` file to test API endpoints directly:

1. Open `test-dashboard.html` in a browser
2. Make sure backend is running
3. Click the test buttons to verify API responses

### Expected Data Structure

**Statistics Response:**
```json
{
  "success": true,
  "data": {
    "totalRepositories": 4,
    "revivalPotential": {
      "high": 3,
      "medium": 1,
      "low": 0,
      "notRecommended": 0
    },
    "topLanguages": [...],
    "recentlyAnalyzed": 4
  }
}
```

## Development Features

- **Authentication Bypass**: Set `BYPASS_AUTH=true` to skip authentication in development
- **Error Handling**: Dashboard shows helpful error messages and retry options
- **Loading States**: Proper loading indicators while fetching data
- **Fallback Data**: Graceful handling when no data is available

## Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Make sure `BYPASS_AUTH=true` is set in environment
   - Check that backend is running with development environment

2. **"No data available" error**
   - Run the database seeding script: `npm run seed`
   - Check MongoDB connection

3. **CORS errors**
   - Backend includes CORS middleware for development
   - Make sure frontend is running on expected port

4. **Connection refused**
   - Check that backend server is running on port 3000
   - Verify API_URL in frontend environment

### Next Steps

1. **Complete Authentication System**: Implement proper user registration and login
2. **Real GitHub Integration**: Add actual GitHub API data collection
3. **Enhanced Analysis**: Implement sophisticated repository analysis algorithms
4. **Performance Optimization**: Add caching and database optimization
5. **Testing**: Add comprehensive test suite

## Files Modified

- `frontend/src/App.tsx` - Updated Dashboard component with real API integration
- `backend/src/middleware/auth.ts` - Added development authentication bypass
- `backend/src/scripts/seedDatabase.ts` - Created database seeding script
- `backend/package.json` - Added seed script
- `test-dashboard.html` - Created API testing tool
