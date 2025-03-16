export const environment = {
  production: true,
  apiUrl: '/api', // Base API URL for production

  // Feature flags
  features: {
    saveProgress: true,
    showDebugInfo: false,
    enableAnalytics: true,
  },

  // Test configuration
  testConfig: {
    autoSaveInterval: 60000, // 1 minute in ms
    timeWarningThreshold: 300, // 5 minutes warning in seconds
  },
};
