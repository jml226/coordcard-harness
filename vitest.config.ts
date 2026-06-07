import { defineConfig } from 'vitest/config'

// Default to node; DOM-dependent specs opt into jsdom via a
// `// @vitest-environment jsdom` docblock at the top of the file.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
