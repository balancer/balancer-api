module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  roots: ['./src'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.ts'],
};
