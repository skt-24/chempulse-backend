module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000
};module.exports = {
  testEnvironment: 'node',
  testTimeout: 15000,
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover']
};