import { fold } from "../combinators.ts";
import { always, id, plus, times, tuple } from "../fns.ts";
import { $, Program } from "../program.ts";

/**
 * ```ts
 * hmm();
 * ```
 * @returns {number} The answer to life, the universe, and everything.
 */
export function hmm() {
   return 42;
}

export const hmmDesc = {
   id: 106,
   name: 'hmm',
   kind: 64,
   kindString: 'Function',
   flags: {},
   sources: [
      {
         fileName: 'junk/junk.ts',
         line: 7,
         character: 16,
      },
   ],
};


