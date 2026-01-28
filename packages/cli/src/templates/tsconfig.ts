import type { ProjectConfig } from '../types.js';

export function generateTsConfig(config: ProjectConfig): string {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      allowJs: true,
      outDir: './dist',
      rootDir: './src',
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  return JSON.stringify(tsconfig, null, 2);
}
