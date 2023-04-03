import { snd, tuple } from '../fns.ts';
import { Program, $, $$, ProgramI } from '../program.ts';

export const fact: () => ProgramI<[number, number], number> = () => {
   return $(([n, acc]: [number, number]) => tuple(n - 1, acc * n)).if(
      ([n]) => n > 0,
      $$(fact),
      $(snd)
   );
};
