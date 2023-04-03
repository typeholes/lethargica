// docs: https://doc.deno.land/https/deno.land/x/dnt/transform.ts
import { emptyDir, build } from 'https://deno.land/x/dnt/mod.ts';

await emptyDir('npm');

await build({
   entryPoints: ['./src/program.ts'],
   outDir: './npm',
   shims: {
      deno: 'dev',
      timers: true,
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

Deno.copyFileSync('readme.md', 'npm/README.md');
