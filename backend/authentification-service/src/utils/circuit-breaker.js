const CircuitBreaker = require('opossum');

// Default options for circuit breaker
const defaultOptions = {
  timeout: 1000, // Time in ms before a request is considered failed
  errorThresholdPercentage: 50, // Error rate % threshold to trip breaker
  resetTimeout: 3000, // Time in ms to wait before resetting the breaker
  rollingCountTimeout: 10000, // Time window in ms over which error rates are calculated
  rollingCountBuckets: 10, // Number of buckets the time window is split into
};

/**
 * Creates a circuit breaker for a function
 * @param {Function} fn - The function to circuit break
 * @param {String} name - Name of the circuit
 * @param {Object} options - Circuit breaker options
 */
function createBreaker(fn, name, options = {}) {
  const breakerOptions = { ...defaultOptions, ...options };
  const breaker = new CircuitBreaker(fn, breakerOptions);
  
  // Add event listeners for monitoring
  breaker.on('open', () => {
    console.warn(`Circuit breaker ${name} is now OPEN`);
  });
  
  breaker.on('close', () => {
    console.log(`Circuit breaker ${name} is now CLOSED`);
  });
  
  breaker.on('halfOpen', () => {
    console.log(`Circuit breaker ${name} is now HALF-OPEN`);
  });
  
  breaker.on('fallback', (result) => {
    console.warn(`Circuit breaker ${name} fallback called`);
  });
  
  return breaker;
}

module.exports = {
  createBreaker
};