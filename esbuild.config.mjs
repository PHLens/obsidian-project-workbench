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
  entryPoints: ['src/context/export-context.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  external: ['yaml'],
  outfile: 'dist/context/export-context.js',
  sourcemap: true,
});
