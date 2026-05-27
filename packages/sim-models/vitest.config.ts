import { defineConfig, mergeConfig } from 'vitest/config';
import { baseVitestConfig } from '../../vitest.config.base';

export default mergeConfig(
  baseVitestConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
