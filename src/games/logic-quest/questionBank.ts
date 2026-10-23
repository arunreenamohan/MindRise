import { LogicQuestion } from './types';

export const QUESTION_BANK: LogicQuestion[] = [
  // --- NUMBER SEQUENCES ---
  {
    id: 'seq_01',
    category: 'number-sequence',
    difficulty: 1,
    prompt: 'What number comes next in the sequence?\n2, 4, 6, 8, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n2, 4, 6, 8, ?',
    options: ['9', '10', '11', '12'],
    optionsMl: ['9', '10', '11', '12'],
    correctIndex: 1,
    explanation: 'Each term increases by 2: 8 + 2 = 10.',
    explanationMl: 'ഓരോ സംഖ്യയും 2 വീതം കൂടുന്നു: 8 + 2 = 10.',
  },
  {
    id: 'seq_02',
    category: 'number-sequence',
    difficulty: 1,
    prompt: 'What number comes next in the sequence?\n5, 10, 15, 20, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n5, 10, 15, 20, ?',
    options: ['22', '24', '25', '30'],
    optionsMl: ['22', '24', '25', '30'],
    correctIndex: 2,
    explanation: 'Each term increases by 5: 20 + 5 = 25.',
    explanationMl: 'ഓരോ സംഖ്യയും 5 വീതം കൂടുന്നു: 20 + 5 = 25.',
  },
  {
    id: 'seq_03',
    category: 'number-sequence',
    difficulty: 2,
    prompt: 'What number comes next in the sequence?\n3, 6, 12, 24, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n3, 6, 12, 24, ?',
    options: ['36', '42', '48', '52'],
    optionsMl: ['36', '42', '48', '52'],
    correctIndex: 2,
    explanation: 'Each term is doubled: 24 × 2 = 48.',
    explanationMl: 'ഓരോ സംഖ്യയും ഇരട്ടിയാകുന്നു: 24 × 2 = 48.',
  },
  {
    id: 'seq_04',
    category: 'number-sequence',
    difficulty: 2,
    prompt: 'What number comes next in the sequence?\n100, 90, 81, 73, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n100, 90, 81, 73, ?',
    options: ['64', '65', '66', '67'],
    optionsMl: ['64', '65', '66', '67'],
    correctIndex: 2,
    explanation: 'The difference decreases by 1 each time (-10, -9, -8, -7): 73 - 7 = 66.',
    explanationMl: 'കുറയ്ക്കുന്ന സംഖ്യ 1 വീതം കുറയുന്നു (-10, -9, -8, -7): 73 - 7 = 66.',
  },
  {
    id: 'seq_05',
    category: 'number-sequence',
    difficulty: 3,
    prompt: 'What number comes next in the sequence?\n1, 1, 2, 3, 5, 8, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n1, 1, 2, 3, 5, 8, ?',
    options: ['11', '12', '13', '14'],
    optionsMl: ['11', '12', '13', '14'],
    correctIndex: 2,
    explanation: 'Fibonacci series: each number is the sum of the previous two (5 + 8 = 13).',
    explanationMl: 'ഫിബോനാച്ചി ശ്രേണി: മുൻപിലെ രണ്ടു സംഖ്യകളുടെ തുക (5 + 8 = 13).',
  },
  {
    id: 'seq_06',
    category: 'number-sequence',
    difficulty: 3,
    prompt: 'What number comes next in the sequence?\n2, 3, 5, 7, 11, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n2, 3, 5, 7, 11, ?',
    options: ['12', '13', '14', '15'],
    optionsMl: ['12', '13', '14', '15'],
    correctIndex: 1,
    explanation: 'Consecutive prime numbers. The prime directly after 11 is 13.',
    explanationMl: 'തുടർച്ചയായ അഭാജ്യസംഖ്യകൾ (Prime Numbers). 11-ന് ശേഷമുള്ളത് 13 ആണ്.',
  },
  {
    id: 'seq_07',
    category: 'number-sequence',
    difficulty: 4,
    prompt: 'What number comes next in the sequence?\n1, 4, 9, 16, 25, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n1, 4, 9, 16, 25, ?',
    options: ['30', '34', '36', '49'],
    optionsMl: ['30', '34', '36', '49'],
    correctIndex: 2,
    explanation: 'Consecutive perfect squares (1², 2², 3², 4², 5², 6²): 6² = 36.',
    explanationMl: 'തുടർച്ചയായ പൂർണ്ണവർഗ്ഗങ്ങൾ (1², 2², 3², 4², 5², 6²): 6² = 36.',
  },

  // --- ODD-ONE-OUT ---
  {
    id: 'odd_01',
    category: 'odd-one-out',
    difficulty: 1,
    prompt: 'Which item does NOT belong with the others?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്തത് ഏതാണ്?',
    options: ['Apple', 'Banana', 'Carrot', 'Grape'],
    optionsMl: ['ആപ്പിൾ', 'വാഴപ്പഴം', 'കാരറ്റ്', 'മുന്തിരി'],
    correctIndex: 2,
    explanation: 'Carrot is a root vegetable; Apple, Banana, and Grape are fruits.',
    explanationMl: 'കാരറ്റ് ഒരു പച്ചക്കറിയാണ്; മറ്റുള്ളവയെല്ലാം പഴങ്ങളാണ്.',
  },
  {
    id: 'odd_02',
    category: 'odd-one-out',
    difficulty: 1,
    prompt: 'Which geometric shape does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത ജ്യാമിതീയ രൂപം ഏതാണ്?',
    options: ['Triangle', 'Square', 'Circle', 'Pentagon'],
    optionsMl: ['ത്രികോണം', 'സമചതുരം', 'വൃത്തം', 'പഞ്ചഭുജം'],
    correctIndex: 2,
    explanation: 'Triangle, Square, and Pentagon are straight-edged polygons; a Circle is curved.',
    explanationMl: 'മറ്റുള്ളവയെല്ലാം നേർരേഖകളുള്ള ബഹുഭുജങ്ങളാണ്; വൃത്തം വക്രരേഖയാണ്.',
  },
  {
    id: 'odd_03',
    category: 'odd-one-out',
    difficulty: 2,
    prompt: 'Which number does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത സംഖ്യ ഏതാണ്?',
    options: ['14', '28', '35', '42'],
    optionsMl: ['14', '28', '35', '42'],
    correctIndex: 2,
    explanation: '14, 28, and 42 are even numbers; 35 is odd.',
    explanationMl: '14, 28, 42 എന്നിവ ഇരട്ടസംഖ്യകളാണ്; 35 ഒറ്റസംഖ്യയാണ്.',
  },
  {
    id: 'odd_04',
    category: 'odd-one-out',
    difficulty: 2,
    prompt: 'Which number does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത സംഖ്യ ഏതാണ്?',
    options: ['9', '16', '25', '32'],
    optionsMl: ['9', '16', '25', '32'],
    correctIndex: 3,
    explanation: '9 (3²), 16 (4²), and 25 (5²) are perfect squares; 32 is not a square.',
    explanationMl: '9, 16, 25 എന്നിവ പൂർണ്ണവർഗ്ഗങ്ങളാണ്; 32 പൂർണ്ണവർഗ്ഗമല്ല.',
  },
  {
    id: 'odd_05',
    category: 'odd-one-out',
    difficulty: 3,
    prompt: 'Which number does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത സംഖ്യ ഏതാണ്?',
    options: ['2', '3', '5', '9'],
    optionsMl: ['2', '3', '5', '9'],
    correctIndex: 3,
    explanation: '2, 3, and 5 are prime numbers; 9 is a composite number (3 × 3).',
    explanationMl: '2, 3, 5 എന്നിവ അഭാജ്യസംഖ്യകളാണ്; 9 ഒരു ഭാജ്യസംഖ്യയാണ് (3 × 3).',
  },
  {
    id: 'odd_06',
    category: 'odd-one-out',
    difficulty: 3,
    prompt: 'Which direction does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത ദിശ ഏതാണ്?',
    options: ['North', 'East', 'South', 'Clockwise'],
    optionsMl: ['വടക്ക്', 'കിഴക്ക്', 'തെക്ക്', 'ക്ലോക്ക് വൈസ്'],
    correctIndex: 3,
    explanation: 'North, East, and South are cardinal directions; Clockwise is rotational direction.',
    explanationMl: 'വടക്ക്, കിഴക്ക്, തെക്ക് എന്നിവ പ്രധാന ദിശകളാണ്; ക്ലോക്ക് വൈസ് കറക്ക ദിശയാണ്.',
  },
  {
    id: 'odd_07',
    category: 'odd-one-out',
    difficulty: 4,
    prompt: 'Which number does NOT belong?',
    promptMl: 'ഇതിൽ കൂട്ടത്തിൽ പെടാത്ത സംഖ്യ ഏതാണ്?',
    options: ['27', '64', '125', '144'],
    optionsMl: ['27', '64', '125', '144'],
    correctIndex: 3,
    explanation: '27 (3³), 64 (4³), and 125 (5³) are perfect cubes; 144 is 12² (square, not a cube).',
    explanationMl: '27 (3³), 64 (4³), 125 (5³) എന്നിവ ഘനങ്ങളാണ് (Cubes); 144 ഒരു വർഗ്ഗമാണ് (12²).',
  },

  // --- DEDUCTIVE REASONING ---
  {
    id: 'ded_01',
    category: 'deductive-reasoning',
    difficulty: 1,
    prompt: 'Premises:\n• All roses are flowers.\n• All flowers need water.\nConclusion:',
    promptMl: 'തത്വങ്ങൾ:\n• എല്ലാ റോസാപ്പൂക്കളും പൂക്കളാണ്.\n• എല്ലാ പൂക്കൾക്കും വെള്ളം വേണം.\nനിഗമനം:',
    options: [
      'All roses need water',
      'No roses need water',
      'Only roses need water',
      'Some flowers are roses',
    ],
    optionsMl: [
      'എല്ലാ റോസാപ്പൂക്കൾക്കും വെള്ളം വേണം',
      'ഒരു റോസാപ്പൂവിനും വെള്ളം വേണ്ട',
      'റോസാപ്പൂക്കൾക്ക് മാത്രം വെള്ളം മതി',
      'ചില പൂക്കൾ റോസാപ്പൂക്കളാണ്',
    ],
    correctIndex: 0,
    explanation: 'Transitive deduction: Roses ⊂ Flowers ⊂ Need Water. All roses need water.',
    explanationMl: 'തത്വങ്ങൾ തമ്മിൽ യോജിപ്പിക്കുമ്പോൾ: റോസാപ്പൂക്കൾക്ക് വെള്ളം വേണം എന്ന് വ്യക്തമാകുന്നു.',
  },
  {
    id: 'ded_02',
    category: 'deductive-reasoning',
    difficulty: 1,
    prompt: 'Premises:\n• Liam is taller than Noah.\n• Noah is taller than Ethan.\nWho is the tallest?',
    promptMl: 'തത്വങ്ങൾ:\n• ലിയാം നോഹയേക്കാൾ ഉയരമുള്ളയാളാണ്.\n• നോഹ ഈഥനേക്കാൾ ഉയരമുള്ളയാളാണ്.\nഏറ്റവും ഉയരമുള്ളയാൾ ആര്?',
    options: ['Liam', 'Noah', 'Ethan', 'Cannot be determined'],
    optionsMl: ['ലിയാം', 'നോഹ', 'ഈഥൻ', 'കണ്ടെത്താൻ കഴിയില്ല'],
    correctIndex: 0,
    explanation: 'Ordering: Liam > Noah > Ethan. Liam is the tallest.',
    explanationMl: 'ഉയരക്രമം: ലിയാം > നോഹ > ഈഥൻ. അതിനാൽ ലിയാമാണ് ഏറ്റവും ഉയരമുള്ളയാൾ.',
  },
  {
    id: 'ded_03',
    category: 'deductive-reasoning',
    difficulty: 2,
    prompt: 'Premises:\n• If it rains, the grass gets wet.\n• The grass is NOT wet.\nWhat can we deduce?',
    promptMl: 'തത്വങ്ങൾ:\n• മഴ പെയ്താൽ പുല്ല് നനയും.\n• പുല്ല് നനഞ്ഞിട്ടില്ല.\nഇതിൽ നിന്നും എന്ത് അനുമാനിക്കാം?',
    options: ['It did not rain', 'It is raining', 'The sun is shining', 'It will rain tomorrow'],
    optionsMl: ['മഴ പെയ്തിട്ടില്ല', 'മഴ പെയ്യുന്നു', 'സൂര്യൻ പ്രകാശിക്കുന്നു', 'നാളെ മഴ പെയ്യും'],
    correctIndex: 0,
    explanation: 'Modus Tollens: If P implies Q, and Q is false, then P must be false.',
    explanationMl: 'പുല്ല് നനഞ്ഞിട്ടില്ലാത്തതിനാൽ മഴ പെയ്തിട്ടില്ല എന്ന് അനുമാനിക്കാം.',
  },
  {
    id: 'ded_04',
    category: 'deductive-reasoning',
    difficulty: 2,
    prompt: 'Premises:\n• Box A is heavier than Box B.\n• Box C is lighter than Box B.\nWhich box is lightest?',
    promptMl: 'തത്വങ്ങൾ:\n• പെട്ടി A, പെട്ടി B-യേക്കാൾ ഭാരമുള്ളതാണ്.\n• പെട്ടി C, പെട്ടി B-യേക്കാൾ ഭാരം കുറഞ്ഞതാണ്.\nഏറ്റവും ഭാരം കുറഞ്ഞ പെട്ടി ഏത്?',
    options: ['Box A', 'Box B', 'Box C', 'Box A and C are equal'],
    optionsMl: ['പെട്ടി A', 'പെട്ടി B', 'പെട്ടി C', 'പെട്ടി A-യും C-യും തുല്യം'],
    correctIndex: 2,
    explanation: 'Weight ordering: Box A > Box B > Box C. Box C is the lightest.',
    explanationMl: 'ഭാരക്രമം: പെട്ടി A > പെട്ടി B > പെട്ടി C. ഏറ്റവും ഭാരം കുറവ് പെട്ടി C-ക്കാണ്.',
  },
  {
    id: 'ded_05',
    category: 'deductive-reasoning',
    difficulty: 3,
    prompt: 'Premises:\n• All birds have feathers.\n• A penguin is a bird.\nConclusion:',
    promptMl: 'തത്വങ്ങൾ:\n• എല്ലാ പക്ഷികൾക്കും തൂവലുകളുണ്ട്.\n• പെൻഗ്വിൻ ഒരു പക്ഷിയാണ്.\nനിഗമനം:',
    options: [
      'A penguin has feathers',
      'Penguins can fly',
      'No birds can swim',
      'Only penguins have feathers',
    ],
    optionsMl: [
      'പെൻഗ്വിന് തൂവലുകളുണ്ട്',
      'പെൻഗ്വിനുകൾക്ക് പറക്കാൻ കഴിയും',
      'ഒരു പക്ഷിക്കും നീന്താൻ കഴിയില്ല',
      'പെൻഗ്വിനുകൾക്ക് മാത്രമേ തൂവലുള്ളൂ',
    ],
    correctIndex: 0,
    explanation: 'Universal deduction: All birds have feathers, so penguins must have feathers.',
    explanationMl: 'എല്ലാ പക്ഷികൾക്കും തൂവലുള്ളതിനാൽ പെൻഗ്വിനും തൂവലുകളുണ്ട്.',
  },
  {
    id: 'ded_06',
    category: 'deductive-reasoning',
    difficulty: 4,
    prompt: 'Race results:\n• Maya finished ahead of Clara.\n• Leo finished behind Clara.\n• Maya finished behind Zoe.\nWho won the race?',
    promptMl: 'ഓട്ടമത്സര ഫലം:\n• മായ ക്ലാരയ്ക്ക് മുൻപിലെത്തി.\n• ലിയോ ക്ലാരയ്ക്ക് പിന്നിലെത്തി.\n• മായ സോയിക്ക് പിന്നിലെത്തി.\nആരാണ് ഒന്നാമതെത്തിയത്?',
    options: ['Maya', 'Clara', 'Leo', 'Zoe'],
    optionsMl: ['മായ', 'ക്ലാര', 'ലിയോ', 'സോയി'],
    correctIndex: 3,
    explanation: 'Order: Zoe > Maya > Clara > Leo. Zoe won the race.',
    explanationMl: 'ക്രമം: സോയി > മായ > ക്ലാര > ലിയോ. സോയി ആണ് ഒന്നാമതെത്തിയത്.',
  },
  {
    id: 'ded_07',
    category: 'deductive-reasoning',
    difficulty: 5,
    prompt: 'Premises:\n• Either the power is out, or the light is on.\n• The light is NOT on.\nWhat must be true?',
    promptMl: 'തത്വങ്ങൾ:\n• ഒന്നെങ്കിൽ വൈദ്യുതി നിലച്ചിരിക്കുന്നു, അല്ലെങ്കിൽ ലൈറ്റ് കത്തുന്നു.\n• ലൈറ്റ് കത്തുന്നില്ല.\nതീർച്ചയായും ശരിയായത് ഏത്?',
    options: [
      'The power is out',
      'The bulb is broken',
      'The power is on',
      'The switch is faulty',
    ],
    optionsMl: [
      'വൈദ്യുതി നിലച്ചിരിക്കുന്നു',
      'ബൾബ് കേടായിരിക്കുന്നു',
      'വൈദ്യുതി ഉണ്ട്',
      'സ്വിച്ച് കേടാണ്',
    ],
    correctIndex: 0,
    explanation: 'Disjunctive syllogism: If P or Q, and not Q, then P must be true.',
    explanationMl: 'രണ്ടു സാധ്യതകളിൽ ലൈറ്റ് കത്തുന്നില്ലാത്തതിനാൽ വൈദ്യുതി നിലച്ചിരിക്കുന്നു എന്നത് സത്യമാണ്.',
  },
];

/**
 * Selects a balanced set of questions ordered by difficulty progression,
 * optionally calibrated by a starting difficulty tier (1: Foundation, 2: Intermediate, 3: Advanced).
 */
export function getCuratedQuestionsForSession(count = 10, tier = 1): LogicQuestion[] {
  const safeCount = Math.max(3, Math.min(QUESTION_BANK.length, count));
  const safeTier = Math.max(1, Math.min(3, Math.round(tier) || 1));

  // Pick balanced selection across categories
  const sequences = QUESTION_BANK.filter((q) => q.category === 'number-sequence');
  const oddOnes = QUESTION_BANK.filter((q) => q.category === 'odd-one-out');
  const deductives = QUESTION_BANK.filter((q) => q.category === 'deductive-reasoning');

  // Offset selection by tier: Tier 1 starts at 0, Tier 2 at 2, Tier 3 at 3
  const startOffset = safeTier === 1 ? 0 : safeTier === 2 ? 2 : 3;

  const selected: LogicQuestion[] = [];
  const maxRounds = Math.ceil(safeCount / 3);

  for (let i = 0; i < maxRounds; i++) {
    const seqIdx = (startOffset + i) % sequences.length;
    const oddIdx = (startOffset + i) % oddOnes.length;
    const dedIdx = (startOffset + i) % deductives.length;

    if (sequences[seqIdx] && selected.length < safeCount && !selected.some((q) => q.id === sequences[seqIdx].id)) {
      selected.push(sequences[seqIdx]);
    }
    if (oddOnes[oddIdx] && selected.length < safeCount && !selected.some((q) => q.id === oddOnes[oddIdx].id)) {
      selected.push(oddOnes[oddIdx]);
    }
    if (deductives[dedIdx] && selected.length < safeCount && !selected.some((q) => q.id === deductives[dedIdx].id)) {
      selected.push(deductives[dedIdx]);
    }
  }

  // Fallback in case deduplication left any slots unfilled
  let fallbackIndex = 0;
  while (selected.length < safeCount && fallbackIndex < QUESTION_BANK.length) {
    const candidate = QUESTION_BANK[fallbackIndex];
    if (!selected.some((q) => q.id === candidate.id)) {
      selected.push(candidate);
    }
    fallbackIndex++;
  }

  // Sort primarily by difficulty so player experiences gradual progression
  return selected.sort((a, b) => a.difficulty - b.difficulty);
}
