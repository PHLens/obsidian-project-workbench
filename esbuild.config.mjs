import esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian'],
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/main.js',
  sourcemap: true,
});
await esbuild.build({
  entryPoints: ['tools/cli/export-context.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  external: ['yaml'],
  outfile: 'dist/cli/export-context.js',
  sourcemap: true,
});
