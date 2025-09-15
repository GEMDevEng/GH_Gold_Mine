// Vercel serverless function for health check
export default function handler(req, res) {
  const uptime = process.env.VERCEL_ENV === 'production' ? Date.now() : process.uptime();

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    environment: process.env.VERCEL_ENV || 'development',
    platform: 'vercel',
    message: 'GitHub Project Miner - Health Check ✅'
  });
}
