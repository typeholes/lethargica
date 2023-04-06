import { snd, tuple } from '../ts/fns.ts';
import { Program, $, $$, ProgramI } from '../ts/program.ts';

export const fact: () => ProgramI<[number, number], number> = () => {
   return $(([n, acc]: [number, number]) => tuple(n - 1, acc * n)).if(
      ([n]) => n > 0,
      $$(fact),
      $(snd)
   );
};
