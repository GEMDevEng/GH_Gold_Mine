// Vercel serverless function for high potential repositories
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    // Mock data to demonstrate deployment works
    const mockRepositories = [
      {
        _id: '1',
        name: 'react-static-analysis-demo',
        fullName: 'facebook/react-static-analysis-demo',
        description: 'Demo repository showing static analysis capabilities',
        url: 'https://github.com/facebook/react',
        owner: {
          avatar: 'https://github.com/images/error/octocat_happy.gif',
          login: 'facebook'
        },
        metrics: {
          stars: 12456,
          language: 'TypeScript'
        },
        revival: {
          potentialScore: 85
        }
      },
      {
        _id: '2',
        name: 'advanced-python-project',
        fullName: 'apache/airflow-advanced',
        description: 'Enterprise-grade Python project with comprehensive analysis',
        url: 'https://github.com/apache/airflow',
        owner: {
          avatar: 'https://github.com/images/error/octocat_happy.gif',
          login: 'apache'
        },
        metrics: {
          stars: 32145,
          language: 'Python'
        },
        revival: {
          potentialScore: 92
        }
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        repositories: mockRepositories,
        pagination: {
          page: 1,
          limit: 3,
          total: 2,
          pages: 1
        }
      },
      message: '✅ GitHub Project Miner API deployed successfully on Vercel!'
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
