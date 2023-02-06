module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  roots: ['./src', './test'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.ts'],
};
