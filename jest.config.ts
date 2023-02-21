module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  roots: ['./src', './tests'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.ts'],
};
