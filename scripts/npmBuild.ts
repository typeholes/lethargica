// Run from the src directory.
// deno run -A ../scripts/npmBuild.ts 0.0.1
import { emptyDir, build } from 'https://deno.land/x/dnt/mod.ts';

await emptyDir('../npm');

await build({
   entryPoints: [
      './program.ts',
      { name: './fns', path: './fns.ts' },
      { name: './combinators', path: './combinators.ts' },
   ],
   outDir: '../npm',
   shims: {
      deno: 'dev',
   },

   package: {
      name: 'lethargica',
      version: Deno.args[0],
      description:
         'An embedded DSL for describing programs in an FP style and executing them with effects, including async effects',
      license: 'MIT',
      repository: {
         type: 'git',
         url: 'git+https://github.com/typeholes/lethargica.git',
      },
      bugs: {
         url: 'https://github.com/typeholes/lethargica/issues',
      },
   },
   // mappings: {}, // optional specifier mappings
});

Deno.copyFileSync('../readme.md', '../npm/README.md');
