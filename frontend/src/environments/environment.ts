export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
 useMockData: false,
  // Feature flags
  features: {
    saveProgress: true,
    showDebugInfo: true,
    enableAnalytics: true,
  },

  // Test configuration
  testConfig: {
    autoSaveInterval: 60000, // 1 minute in ms
    timeWarningThreshold: 300, // 5 minutes warning in seconds
  },
};
