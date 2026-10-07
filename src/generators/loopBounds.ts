import type { GeneratorInput, QuestionGenerator } from '@/core/ports';
import type { FeedbackText, MisconceptionId, OptionDraft, QuestionBody } from '@/core/types';
import { createRng, randInt, shuffle, type Rng } from '@/core/util/rng';

/**
 * Example generator plugins for the concept "loop-bounds".
 * Pattern to copy for any new concept: pick random values, RUN the logic for the true answer,
 * build each wrong option by applying one known mistake (tagged with its misconception id),
 * and write feedback from the same numbers. Every output is verified by construction.
 */

const fmt = (xs: number[]) => xs.join('  ');
const pyRange = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);
function distinctNums(r: Rng, n: number): number[] {
  const s = new Set<number>();
  while (s.size < n) s.add(randInt(r, 10, 99));
  return [...s];
}

export const printLoop: QuestionGenerator = {
  id: 'loop-bounds.print-loop',
  concept: 'loop-bounds',
  targets: ['off-by-one-start', 'off-by-one-end', 'index-vs-value', 'counts-from-zero'],
  generate({ seed, focus }: GeneratorInput): QuestionBody {
    const r = createRng(seed);
    const n = 5;
    const nums = distinctNums(r, n);
    const s = randInt(r, 1, 2);
    const e = randInt(r, s + 2, n - 1);

    const truth: number[] = [];
    for (const i of pyRange(s, e)) truth.push(nums[i] as number); // run the loop

    const pool: OptionDraft[] = shuffle(r, [
      { text: fmt(nums.slice(s - 1, e)), misconception: 'off-by-one-start' },
      { text: fmt(nums.slice(s, e + 1)), misconception: 'off-by-one-end' },
      { text: fmt(pyRange(s, e)), misconception: 'index-vs-value' },
      { text: fmt(nums.slice(0, e - s)), misconception: 'counts-from-zero' },
    ]);
    // keep the learner's current mistakes among the wrong options
    const wrongs = [
      ...pool.filter((o) => focus.includes(o.misconception as MisconceptionId)),
      ...pool.filter((o) => !focus.includes(o.misconception as MisconceptionId)),
    ].slice(0, 3);
    const options = shuffle(r, [{ text: fmt(truth), correct: true }, ...wrongs]);

    const feedback: Record<MisconceptionId, FeedbackText> = {
      'off-by-one-start': {
        plain: `range(${s}, ${e}) starts at index ${s}, not 0. The item at index ${s - 1} is never visited.`,
        counter: `The first value of i is ${s}, so the first print is nums[${s}] = ${nums[s]}. The ${nums[s - 1]} sits at index ${s - 1} and is skipped.`,
      },
      'off-by-one-end': {
        plain: `The stop value ${e} is NOT included. The loop ends at index ${e - 1}.`,
        counter: `The last value of i is ${e - 1}, so the last print is nums[${e - 1}] = ${nums[e - 1]}. nums[${e}] = ${nums[e]} is never printed.`,
      },
      'index-vs-value': {
        plain: 'print(nums[i]) shows the value stored at position i, not the position itself.',
        counter: `When i = ${s}, nums[i] is ${nums[s]}, so ${nums[s]} is printed, not ${s}.`,
      },
      'counts-from-zero': {
        plain: `range(${s}, ${e}) gives the positions ${s} to ${e - 1}. It does not mean "the first ${e - s} items".`,
        counter: `The first value of i is ${s}, so nums[0] = ${nums[0]} is not printed at all.`,
      },
    };
    return {
      prompt: 'What does this print?',
      code: `nums = [${nums.join(', ')}]\nfor i in range(${s}, ${e}):\n    print(nums[i])`,
      options,
      feedback,
      hints: [
        'What is the first value that i takes?',
        `range(${s}, ${e}) starts at ${s} and stops before ${e}. Write out every value of i.`,
        'For each i, look up nums[i] in the list. Which values do you get?',
      ],
    };
  },
};

export const whichRange: QuestionGenerator = {
  id: 'loop-bounds.which-range',
  concept: 'loop-bounds',
  targets: ['off-by-one-start', 'off-by-one-end', 'shifted-range'],
  generate({ seed }: GeneratorInput): QuestionBody {
    const r = createRng(seed);
    const n = randInt(r, 3, 6);
    const nums = distinctNums(r, n);
    const cands = [
      { text: 'for i in range(0, len(nums)):', a: 0, b: n, m: 'off-by-one-start' },
      { text: 'for i in range(1, len(nums)):', a: 1, b: n, m: 'off-by-one-start' },
      { text: 'for i in range(0, len(nums) - 1):', a: 0, b: n - 1, m: 'off-by-one-end' },
      { text: 'for i in range(1, len(nums) + 1):', a: 1, b: n + 1, m: 'shifted-range' },
    ];
    // "correct" is decided by simulating, not by hand
    const visitsAll = (a: number, b: number) => {
      const idx = pyRange(a, b);
      return idx.length === n && idx.every((v, k) => v === k);
    };
    const options: OptionDraft[] = shuffle(
      r,
      cands.map((c) => (visitsAll(c.a, c.b) ? { text: c.text, correct: true } : { text: c.text, misconception: c.m })),
    );
    return {
      prompt: 'Which loop header visits every item of nums, in order, without an error?',
      code: `nums = [${nums.join(', ')}]   # ${n} items, indexes 0 to ${n - 1}`,
      options,
      feedback: {
        'off-by-one-start': {
          plain: 'It starts at index 1, so the first item is skipped. Index 0 is the first item.',
          counter: `The first value of i is 1, so nums[0] = ${nums[0]} is never visited.`,
        },
        'off-by-one-end': {
          plain: 'The stop value is not included, so subtracting 1 drops the last item.',
          counter: `The last i is ${n - 2}. nums[${n - 1}] = ${nums[n - 1]} is never visited.`,
        },
        'shifted-range': {
          plain: `It reaches index ${n}, which does not exist, and it still skips index 0.`,
          counter: `When i = ${n}, nums[${n}] causes an IndexError. Also nums[0] = ${nums[0]} is skipped.`,
        },
      },
      hints: [`The list has ${n} items. What are their indexes?`, 'Remember: the stop value of range() is not included.'],
    };
  },
};
