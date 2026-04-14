const backendUrl = (process.env.ARKY_BACKEND_URL || '').replace(/\/$/, '');

const rewrites = [];

if (backendUrl) {
  rewrites.push({
    source: '/api/:path*',
    destination: `${backendUrl}/api/:path*`,
  });
}

export default {
  framework: 'angular',
  outputDirectory: 'dist/frontend/browser',
  rewrites,
};
