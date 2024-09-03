/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['dotenv/config'],
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['.*\\.mock\\.spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coveragePathIgnorePatterns: ['/test/'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^#common/utils(|/.*)$': '<rootDir>/../../packages/utils/src/$1',
  },
};

module.exports = config;
