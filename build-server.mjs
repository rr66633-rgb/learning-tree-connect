import * as esbuild from 'esbuild';
import { readdirSync } from 'fs';

// Get all node_modules package names to externalize them
// but keep local project files (server/*, shared/*) bundled
const nodeModules = readdirSync('node_modules', { withFileTypes: true })
  .filter(d => d.isDirectory() || d.isSymbolicLink())
  .map(d => d.name)
  .filter(n => !n.startsWith('.'));

// Also externalize @scoped packages
const scopedDirs = readdirSync('node_modules', { withFileTypes: true })
  .filter(d => d.name.startsWith('@') && d.isDirectory())
  .flatMap(d => readdirSync(`node_modules/${d.name}`).map(sub => `${d.name}/${sub}`));

const external = [...nodeModules, ...scopedDirs];

await esbuild.build({
  entryPoints: ['server/_core/index.ts'],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  external,
  // Ensure local imports (../storage, ../routers, etc.) are bundled
  // Only node_modules are externalized
});

console.log('Server build complete');
