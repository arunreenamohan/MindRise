import { PatternQuestion } from './types';

export const PATTERN_QUESTION_BANK: PatternQuestion[] = [
  // ==========================================
  // --- 1. VISUAL SHAPE & SYMBOL PATTERNS ---
  // ==========================================
  {
    id: 'vis_01',
    category: 'visual-pattern',
    difficulty: 1,
    title: 'Alternating Shapes',
    titleMl: 'ഒന്നിടവിട്ടുള്ള രൂപങ്ങൾ',
    prompt: 'Which shape comes next in the sequence?\n▲, ■, ▲, ■, ▲, ?',
    promptMl: 'ഈ രൂപ ശ്രേണിയിലെ അടുത്ത രൂപം ഏതാണ്?\n▲, ■, ▲, ■, ▲, ?',
    options: ['▲', '■', '●', '★'],
    optionsMl: ['▲', '■', '●', '★'],
    correctIndex: 1,
    explanation: 'The shapes alternate strictly between triangle (▲) and square (■).',
    explanationMl: 'ത്രികോണവും (▲) ചതുരവും (■) ഒന്നിടവിട്ട് വരുന്നു.',
  },
  {
    id: 'vis_02',
    category: 'visual-pattern',
    difficulty: 1,
    title: 'Polygon Progression',
    titleMl: 'ബഹുഭുജ ശ്രേണി',
    prompt: 'Identify the next shape based on side count:\nTriangle (3), Square (4), Pentagon (5), ?',
    promptMl: 'വശങ്ങളുടെ എണ്ണം അടിസ്ഥാനമാക്കി അടുത്ത രൂപം കണ്ടെത്തുക:\nത്രികോണം (3), ചതുരം (4), പഞ്ചഭുജം (5), ?',
    options: ['Octagon (8)', 'Hexagon (6)', 'Circle (0)', 'Heptagon (7)'],
    optionsMl: ['അഷ്ടഭുജം (8)', 'ഷഡ്ഭുജം (6)', 'വൃത്തം (0)', 'സപ്തഭുജം (7)'],
    correctIndex: 1,
    explanation: 'The number of sides increments by 1 at each step: 3, 4, 5, 6 (Hexagon).',
    explanationMl: 'ഓരോ ഘട്ടത്തിലും വശങ്ങളുടെ എണ്ണം 1 വീതം കൂടുന്നു: 3, 4, 5, 6 (ഷഡ്ഭുജം).',
  },
  {
    id: 'vis_03',
    category: 'visual-pattern',
    difficulty: 2,
    title: 'Clockwise Rotation',
    titleMl: 'ക്ലോക്ക്‌വൈസ് ഭ്രമണം',
    prompt: 'Which arrow completes the 90° clockwise rotation?\n↑, →, ↓, ?',
    promptMl: 'ക്ലോക്ക്‌വൈസ് 90° തിരിയുമ്പോൾ അടുത്ത അമ്പ് ഏതാണ്?\n↑, →, ↓, ?',
    options: ['↑', '←', '↘', '↗'],
    optionsMl: ['↑', '←', '↘', '↗'],
    correctIndex: 1,
    explanation: 'The arrow rotates 90° clockwise each step: North, East, South, West (←).',
    explanationMl: 'അമ്പ് ഓരോ ഘട്ടത്തിലും 90° ക്ലോക്ക്‌വൈസ് തിരിയുന്നു: അടുത്തത് പടിഞ്ഞാറ് (←).',
  },
  {
    id: 'vis_04',
    category: 'visual-pattern',
    difficulty: 2,
    title: 'Dot Pattern Increment',
    titleMl: 'ഡോട്ട് പാറ്റേൺ വർദ്ധന',
    prompt: 'Find the next pattern in this alternating dot sequence:\n○, ●, ○○, ●●, ○○○, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത ഘടകം ഏതാണ്?\n○, ●, ○○, ●●, ○○○, ?',
    options: ['●●', '●●●', '○○○○', '●●●●'],
    optionsMl: ['●●', '●●●', '○○○○', '●●●●'],
    correctIndex: 1,
    explanation: 'The sequence alternates between hollow circles and solid dots, increasing quantity sequentially: ○, ●; ○○, ●●; ○○○, ●●●.',
    explanationMl: 'ശൂന്യമായ വൃത്തങ്ങളും കറുത്ത വൃത്തങ്ങളും ജോഡികളായി എണ്ണം കൂട്ടി വരുന്നു: അടുത്തത് ●●●.',
  },
  {
    id: 'vis_05',
    category: 'visual-pattern',
    difficulty: 3,
    title: 'Angular Step Rotation',
    titleMl: 'കോൺ ഭ്രമണം',
    prompt: 'Which symbol comes next in the 45° counter-clockwise rotation?\n→, ↗, ↑, ↖, ?',
    promptMl: 'ആന്റി-ക്ലോക്ക്‌വൈസ് 45° തിരിയുമ്പോൾ അടുത്ത അമ്പ് ഏതാണ്?\n→, ↗, ↑, ↖, ?',
    options: ['←', '↙', '↓', '↘'],
    optionsMl: ['←', '↙', '↓', '↘'],
    correctIndex: 0,
    explanation: 'The arrow rotates 45° counter-clockwise continuously: 0°, 45°, 90°, 135°, 180° (←).',
    explanationMl: 'അമ്പ് ഓരോ ഘട്ടത്തിലും 45° ആന്റി-ക്ലോക്ക്‌വൈസ് തിരിയുന്നു: അടുത്തത് പടിഞ്ഞാറോട്ട് (←).',
  },
  {
    id: 'vis_06',
    category: 'visual-pattern',
    difficulty: 4,
    title: 'Exponential Growth',
    titleMl: 'ഗുണന വളർച്ച',
    prompt: 'Determine the next figure based on star multiplication:\n★, ★★, ★★★★, ?',
    promptMl: 'നക്ഷത്രങ്ങളുടെ ഗുണന ശ്രേണിയിലെ അടുത്ത രൂപം കണ്ടെത്തുക:\n★, ★★, ★★★★, ?',
    options: ['★★★★★★', '★★★★★★★', '★★★★★★★★', '★★★★★'],
    optionsMl: ['★★★★★★', '★★★★★★★', '★★★★★★★★', '★★★★★'],
    correctIndex: 2,
    explanation: 'The quantity of stars doubles in each step (1, 2, 4, 8): 8 stars (★★★★★★★★).',
    explanationMl: 'നക്ഷത്രങ്ങളുടെ എണ്ണം ഓരോ തവണയും ഇരട്ടിയാകുന്നു (1, 2, 4, 8): 8 നക്ഷത്രങ്ങൾ (★★★★★★★★).',
  },
  {
    id: 'vis_07',
    category: 'visual-pattern',
    difficulty: 5,
    title: 'Compound Shapes',
    titleMl: 'സംയുക്ത രൂപങ്ങൾ',
    prompt: 'Observe the shape-addition progression:\n[○], [○ + ■], [○ + ■ + ▲], ?',
    promptMl: 'രൂപ കൂട്ടിച്ചേർക്കലിലെ അടുത്ത ഘടകം ഏതാണ്?\n[○], [○ + ■], [○ + ■ + ▲], ?',
    options: ['[○ + ■ + ▲ + ◆]', '[■ + ▲]', '[○ + ▲]', '[◆ + ★]'],
    optionsMl: ['[○ + ■ + ▲ + ◆]', '[■ + ▲]', '[○ + ▲]', '[◆ + ★]'],
    correctIndex: 0,
    explanation: 'A new unique geometric element is appended chronologically at each stage.',
    explanationMl: 'ഓരോ ഘട്ടത്തിലും ക്രമമായി ഓരോ പുതിയ രൂപം അധികമായി ചേരുന്നു.',
  },
  {
    id: 'vis_08',
    category: 'visual-pattern',
    difficulty: 6,
    title: 'Dual Rule Alternation',
    titleMl: 'ഇരട്ട നിയമ വ്യവസ്ഥ',
    prompt: 'Which compound glyph completes the double-alternating rule?\n▲+, ■-, ▲+, ■-, ▲+, ?',
    promptMl: 'ഇരട്ട നിയമം പൂർത്തിയാക്കുന്ന അടുത്ത ചിഹ്നം ഏതാണ്?\n▲+, ■-, ▲+, ■-, ▲+, ?',
    options: ['■-', '▲-', '■+', '▲+'],
    optionsMl: ['■-', '▲-', '■+', '▲+'],
    correctIndex: 0,
    explanation: 'The rule alternates between (▲ with +) and (■ with -). Following ▲+ comes ■-.',
    explanationMl: '(▲ നൊപ്പം +) ചിഹ്നവും (■ നൊപ്പം -) ചിഹ്നവും ഒന്നിടവിട്ട് വരുന്നു. അടുത്തത് ■-.',
  },

  // ==========================================
  // --- 2. NUMBER & SEQUENCE PATTERNS ---
  // ==========================================
  {
    id: 'num_01',
    category: 'number-sequence',
    difficulty: 1,
    title: 'Linear Arithmetic',
    titleMl: 'സമാന്തര ശ്രേണി',
    prompt: 'Find the next number in the arithmetic sequence:\n4, 8, 12, 16, ?',
    promptMl: 'ഈ സമാന്തര ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n4, 8, 12, 16, ?',
    options: ['18', '20', '22', '24'],
    optionsMl: ['18', '20', '22', '24'],
    correctIndex: 1,
    explanation: 'The common difference is +4: 16 + 4 = 20.',
    explanationMl: 'ഓരോ സംഖ്യയും 4 വീതം കൂടുന്നു: 16 + 4 = 20.',
  },
  {
    id: 'num_02',
    category: 'number-sequence',
    difficulty: 1,
    title: 'Descending Step',
    titleMl: 'അവരോഹണ ശ്രേണി',
    prompt: 'What number completes the descending sequence?\n60, 50, 40, 30, ?',
    promptMl: 'ഈ അവരോഹണ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n60, 50, 40, 30, ?',
    options: ['10', '15', '20', '25'],
    optionsMl: ['10', '15', '20', '25'],
    correctIndex: 2,
    explanation: 'Each term decreases by 10: 30 - 10 = 20.',
    explanationMl: 'ഓരോ സംഖ്യയിൽ നിന്നും 10 കുറയുന്നു: 30 - 10 = 20.',
  },
  {
    id: 'num_03',
    category: 'number-sequence',
    difficulty: 2,
    title: 'Geometric Multiplier',
    titleMl: 'ഗുണോത്തര ശ്രേണി',
    prompt: 'What is the next number in the geometric series?\n3, 9, 27, 81, ?',
    promptMl: 'ഈ ഗുണോത്തര ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n3, 9, 27, 81, ?',
    options: ['162', '216', '243', '270'],
    optionsMl: ['162', '216', '243', '270'],
    correctIndex: 2,
    explanation: 'Each term is multiplied by 3: 81 × 3 = 243.',
    explanationMl: 'ഓരോ സംഖ്യയും 3 കൊണ്ട് ഗുണിക്കുന്നു: 81 × 3 = 243.',
  },
  {
    id: 'num_04',
    category: 'number-sequence',
    difficulty: 3,
    title: 'Fibonacci Sequence',
    titleMl: 'ഫിബൊനാച്ചി ശ്രേണി',
    prompt: 'Find the next Fibonacci number in the sequence:\n1, 1, 2, 3, 5, 8, 13, ?',
    promptMl: 'ഫിബൊനാച്ചി ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n1, 1, 2, 3, 5, 8, 13, ?',
    options: ['18', '20', '21', '24'],
    optionsMl: ['18', '20', '21', '24'],
    correctIndex: 2,
    explanation: 'Each term is the sum of the preceding two terms: 8 + 13 = 21.',
    explanationMl: 'തൊട്ടുമുമ്പുള്ള രണ്ട് സംഖ്യകളുടെ തുകയാണ് അടുത്ത സംഖ്യ: 8 + 13 = 21.',
  },
  {
    id: 'num_05',
    category: 'number-sequence',
    difficulty: 3,
    title: 'Square Numbers',
    titleMl: 'വർഗ്ഗ സംഖ്യകൾ',
    prompt: 'Identify the next perfect square:\n1, 4, 9, 16, 25, ?',
    promptMl: 'വർഗ്ഗ സംഖ്യകളുടെ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n1, 4, 9, 16, 25, ?',
    options: ['30', '34', '36', '49'],
    optionsMl: ['30', '34', '36', '49'],
    correctIndex: 2,
    explanation: 'These are squares of consecutive integers (1², 2², 3², 4², 5²): 6² = 36.',
    explanationMl: 'തുടർച്ചയായ സംഖ്യകളുടെ വർഗ്ഗങ്ങൾ (1², 2², 3², 4², 5²): 6² = 36.',
  },
  {
    id: 'num_06',
    category: 'number-sequence',
    difficulty: 4,
    title: 'Prime Numbers',
    titleMl: 'അഭാജ്യ സംഖ്യകൾ',
    prompt: 'Determine the next prime number in the sequence:\n2, 3, 5, 7, 11, 13, ?',
    promptMl: 'അഭാജ്യ സംഖ്യകളുടെ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n2, 3, 5, 7, 11, 13, ?',
    options: ['15', '17', '19', '21'],
    optionsMl: ['15', '17', '19', '21'],
    correctIndex: 1,
    explanation: '17 is the next prime number greater than 13.',
    explanationMl: '13 ന് ശേഷമുള്ള അടുത്ത അഭാജ്യ സംഖ്യ 17 ആണ്.',
  },
  {
    id: 'num_07',
    category: 'number-sequence',
    difficulty: 5,
    title: 'Binary Exponentiation',
    titleMl: 'ഇരട്ടിപ്പ് ശ്രേണി',
    prompt: 'What number comes next in the doubling sequence?\n2, 4, 8, 16, 32, ?',
    promptMl: 'ഈ ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n2, 4, 8, 16, 32, ?',
    options: ['48', '60', '64', '72'],
    optionsMl: ['48', '60', '64', '72'],
    correctIndex: 2,
    explanation: 'Each term doubles (powers of 2): 32 × 2 = 64.',
    explanationMl: 'ഓരോ സംഖ്യയും ഇരട്ടിയാകുന്നു: 32 × 2 = 64.',
  },
  {
    id: 'num_08',
    category: 'number-sequence',
    difficulty: 6,
    title: 'Second-Order Differences',
    titleMl: 'രണ്ടാം നിര ശ്രേണി',
    prompt: 'Find the next number in this accelerating difference sequence:\n3, 5, 9, 17, 33, ?',
    promptMl: 'ഈ രണ്ടാം നിര ശ്രേണിയിലെ അടുത്ത സംഖ്യ ഏതാണ്?\n3, 5, 9, 17, 33, ?',
    options: ['57', '63', '65', '67'],
    optionsMl: ['57', '63', '65', '67'],
    correctIndex: 2,
    explanation: 'The differences double each time (+2, +4, +8, +16, +32): 33 + 32 = 65.',
    explanationMl: 'വ്യത്യാസങ്ങൾ ഇരട്ടിയാകുന്നു (+2, +4, +8, +16, +32): 33 + 32 = 65.',
  },

  // ==========================================
  // --- 3. MISSING-TILE MATRIX PUZZLES ---
  // ==========================================
  {
    id: 'tile_01',
    category: 'missing-tile',
    difficulty: 1,
    title: '2x2 Step Matrix',
    titleMl: '2x2 മാട്രിക്സ്',
    prompt: 'Complete the 2x2 grid where numbers increase by 2 across rows and columns:',
    promptMl: '2x2 ഗ്രിഡിലെ ചോദ്യചിഹ്നത്തിന് പകരം വരേണ്ട സംഖ്യ കണ്ടെത്തുക:',
    gridMatrix: [
      ['2', '4'],
      ['6', '?'],
    ],
    options: ['7', '8', '9', '10'],
    optionsMl: ['7', '8', '9', '10'],
    correctIndex: 1,
    explanation: 'Row 1 is 2, 4 (+2). Row 2 is 6, 8 (+2).',
    explanationMl: 'വരിയിൽ 2 വീതം കൂടുന്നു: 6 + 2 = 8.',
  },
  {
    id: 'tile_02',
    category: 'missing-tile',
    difficulty: 1,
    title: 'Visual Duplication Matrix',
    titleMl: 'രൂപ ഇരട്ടിപ്പ് മാട്രിക്സ്',
    prompt: 'Complete the visual matrix where Column 2 doubles the shape in Column 1:',
    promptMl: 'കോളം 2 ൽ രൂപങ്ങളുടെ എണ്ണം ഇരട്ടിയാകുന്ന ഗ്രിഡ് പൂർത്തിയാക്കുക:',
    gridMatrix: [
      ['▲', '▲▲'],
      ['■', '?'],
    ],
    options: ['■', '■■', '▲▲▲', '●'],
    optionsMl: ['■', '■■', '▲▲▲', '●'],
    correctIndex: 1,
    explanation: 'Column 2 contains two instances of the shape in Column 1: ■ becomes ■■.',
    explanationMl: 'കോളം 1 ലെ രൂപം കോളം 2 ൽ ഇരട്ടിയാകുന്നു: ■ എന്നത് ■■ ആകുന്നു.',
  },
  {
    id: 'tile_03',
    category: 'missing-tile',
    difficulty: 2,
    title: '3x3 Multiples Matrix',
    titleMl: '3x3 ഗുണിത മാട്രിക്സ്',
    prompt: 'Complete the 3x3 multiplicative grid (Row multipliers × 1, × 2, × 3):',
    promptMl: '3x3 ഗുണന ഗ്രിഡിലെ വിട്ടുപോയ സംഖ്യ കണ്ടെത്തുക:',
    gridMatrix: [
      ['3', '6', '9'],
      ['4', '8', '12'],
      ['5', '10', '?'],
    ],
    options: ['12', '14', '15', '16'],
    optionsMl: ['12', '14', '15', '16'],
    correctIndex: 2,
    explanation: 'Row 3 contains multiples of 5: 5 × 1 = 5, 5 × 2 = 10, 5 × 3 = 15.',
    explanationMl: 'മൂന്നാമത്തെ വരി 5 ന്റെ ഗുണിതങ്ങളാണ്: 5 × 3 = 15.',
  },
  {
    id: 'tile_04',
    category: 'missing-tile',
    difficulty: 3,
    title: 'Additive Sum Matrix',
    titleMl: 'തുക മാട്രിക്സ്',
    prompt: 'Find the missing tile where Column 3 is the sum of Column 1 and Column 2:',
    promptMl: 'കോളം 1 ഉം 2 ഉം കൂട്ടിയാൽ കോളം 3 ലഭിക്കുന്ന ഗ്രിഡ് പൂർത്തിയാക്കുക:',
    gridMatrix: [
      ['4', '5', '9'],
      ['2', '7', '9'],
      ['6', '3', '?'],
    ],
    options: ['8', '9', '10', '11'],
    optionsMl: ['8', '9', '10', '11'],
    correctIndex: 1,
    explanation: 'Column 1 + Column 2 = Column 3. For Row 3: 6 + 3 = 9.',
    explanationMl: 'കോളം 1 + കോളം 2 = കോളം 3. മൂന്നാം വരിയിൽ: 6 + 3 = 9.',
  },
  {
    id: 'tile_05',
    category: 'missing-tile',
    difficulty: 4,
    title: 'Row Progression Matrix',
    titleMl: 'വരി വർദ്ധന മാട്രിക്സ്',
    prompt: 'Complete the tile matrix where each term across rows doubles:',
    promptMl: 'ഓരോ വരിയിലും സംഖ്യകൾ ഇരട്ടിയാകുന്ന ഗ്രിഡിലെ സംഖ്യ കണ്ടെത്തുക:',
    gridMatrix: [
      ['1', '2', '4'],
      ['3', '6', '12'],
      ['5', '10', '?'],
    ],
    options: ['15', '18', '20', '25'],
    optionsMl: ['15', '18', '20', '25'],
    correctIndex: 2,
    explanation: 'Each row doubles sequentially: 5 × 2 = 10, 10 × 2 = 20.',
    explanationMl: 'ഓരോ വരിയിലും സംഖ്യ ഇരട്ടിയാകുന്നു: 10 × 2 = 20.',
  },
  {
    id: 'tile_06',
    category: 'missing-tile',
    difficulty: 4,
    title: 'Symbol Count Matrix',
    titleMl: 'ചിഹ്ന എണ്ണ മാട്രിക്സ്',
    prompt: 'Determine the symbol pattern for the missing matrix cell:',
    promptMl: 'മാട്രിക്സിലെ വിട്ടുപോയ സെല്ലിലെ ചിഹ്നങ്ങൾ കണ്ടെത്തുക:',
    gridMatrix: [
      ['●', '●●', '●●●'],
      ['▲', '▲▲', '▲▲▲'],
      ['★', '★★', '?'],
    ],
    options: ['★★', '★★★', '★★★★', '●●●'],
    optionsMl: ['★★', '★★★', '★★★★', '●●●'],
    correctIndex: 1,
    explanation: 'Row 3 features stars with increasing counts (1, 2, 3): ★★★.',
    explanationMl: 'മൂന്നാം വരിയിൽ നക്ഷത്രങ്ങളുടെ എണ്ണം 1, 2, 3 എന്നിങ്ങനെ കൂടുന്നു: ★★★.',
  },
  {
    id: 'tile_07',
    category: 'missing-tile',
    difficulty: 5,
    title: 'Product Matrix',
    titleMl: 'ഗുണനഫല മാട്രിക്സ്',
    prompt: 'Find the missing product tile where Column 1 × Column 2 = Column 3:',
    promptMl: 'കോളം 1 ഉം 2 ഉം ഗുണിച്ചാൽ കോളം 3 ലഭിക്കുന്ന ഗ്രിഡ് പൂർത്തിയാക്കുക:',
    gridMatrix: [
      ['2', '3', '6'],
      ['4', '5', '20'],
      ['3', '7', '?'],
    ],
    options: ['10', '18', '21', '24'],
    optionsMl: ['10', '18', '21', '24'],
    correctIndex: 2,
    explanation: 'Column 1 × Column 2 = Column 3. For Row 3: 3 × 7 = 21.',
    explanationMl: 'കോളം 1 × കോളം 2 = കോളം 3. മൂന്നാം വരിയിൽ: 3 × 7 = 21.',
  },
  {
    id: 'tile_08',
    category: 'missing-tile',
    difficulty: 6,
    title: 'Subtraction Difference Matrix',
    titleMl: 'വ്യത്യാസ മാട്രിക്സ്',
    prompt: 'Complete the difference matrix where Column 1 - Column 2 = Column 3:',
    promptMl: 'കോളം 1 ൽ നിന്ന് കോളം 2 കുറച്ചാൽ കോളം 3 ലഭിക്കുന്ന ഗ്രിഡ് പൂർത്തിയാക്കുക:',
    gridMatrix: [
      ['10', '7', '3'],
      ['15', '6', '9'],
      ['25', '11', '?'],
    ],
    options: ['12', '14', '16', '18'],
    optionsMl: ['12', '14', '16', '18'],
    correctIndex: 1,
    explanation: 'Column 1 - Column 2 = Column 3. For Row 3: 25 - 11 = 14.',
    explanationMl: 'കോളം 1 - കോളം 2 = കോളം 3. മൂന്നാം വരിയിൽ: 25 - 11 = 14.',
  },
];

/**
 * Validates question bank integrity: verifies non-empty fields, exactly 4 unique options,
 * valid correctIndex range [0..3], and non-empty explanations in English and Malayalam.
 */
export function validateQuestionBank(questions: PatternQuestion[], throwOnError: boolean = false): boolean {
  if (!Array.isArray(questions) || questions.length === 0) {
    if (throwOnError) throw new Error('Question bank must be a non-empty array');
    return false;
  }

  const ids = new Set<string>();

  for (const q of questions) {
    if (!q.id || ids.has(q.id)) {
      if (throwOnError) throw new Error(`Invalid or duplicate question ID: ${q.id}`);
      return false;
    }
    ids.add(q.id);

    if (!q.category || !q.title || !q.titleMl || !q.prompt || !q.promptMl) {
      if (throwOnError) throw new Error(`Question ${q.id} missing required text fields`);
      return false;
    }
    if (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 6) {
      if (throwOnError) throw new Error(`Question ${q.id} difficulty must be between 1 and 6`);
      return false;
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      if (throwOnError) throw new Error(`Question ${q.id} options must contain exactly 4 items`);
      return false;
    }
    if (!Array.isArray(q.optionsMl) || q.optionsMl.length !== 4) {
      if (throwOnError) throw new Error(`Question ${q.id} optionsMl must contain exactly 4 items`);
      return false;
    }

    // Check that options are unique
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== 4) {
      if (throwOnError) throw new Error(`Question ${q.id} contains duplicate options`);
      return false;
    }

    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
      if (throwOnError) throw new Error(`Question ${q.id} correctIndex must be between 0 and 3`);
      return false;
    }
    if (!q.explanation || !q.explanationMl) {
      if (throwOnError) throw new Error(`Question ${q.id} missing explanation`);
      return false;
    }

    if (q.gridMatrix) {
      if (!Array.isArray(q.gridMatrix) || q.gridMatrix.length === 0) {
        if (throwOnError) throw new Error(`Question ${q.id} gridMatrix is malformed`);
        return false;
      }
      for (const row of q.gridMatrix) {
        if (!Array.isArray(row) || row.length === 0) {
          if (throwOnError) throw new Error(`Question ${q.id} gridMatrix row is empty`);
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Selects a balanced set of questions for a training session,
 * covering visual patterns, sequences, and missing-tile puzzles across difficulties 1 to 6.
 * Optionally filters by starting tier (1: Foundation, 2: Intermediate, 3: Mastery).
 */
export function selectSessionQuestions(
  bank: PatternQuestion[] = PATTERN_QUESTION_BANK,
  count: number = 10,
  prng: () => number = Math.random,
  tier?: number
): PatternQuestion[] {
  if (!validateQuestionBank(bank)) {
    return [];
  }

  let pool = bank;
  if (typeof tier === 'number' && Number.isFinite(tier)) {
    const safeTier = Math.max(1, Math.min(3, Math.round(tier)));
    if (safeTier === 1) {
      const filtered = bank.filter((q) => q.difficulty <= 3);
      if (filtered.length >= count) pool = filtered;
    } else if (safeTier === 2) {
      const filtered = bank.filter((q) => q.difficulty >= 2 && q.difficulty <= 5);
      if (filtered.length >= count) pool = filtered;
    } else if (safeTier === 3) {
      const filtered = bank.filter((q) => q.difficulty >= 3);
      if (filtered.length >= count) pool = filtered;
    }
  }

  if (count >= pool.length) {
    const copy = [...pool];
    copy.sort((a, b) => a.difficulty - b.difficulty);
    return copy;
  }

  // Group by category
  const visual = pool.filter((q) => q.category === 'visual-pattern');
  const numeric = pool.filter((q) => q.category === 'number-sequence');
  const tiles = pool.filter((q) => q.category === 'missing-tile');

  // Deterministically sort/shuffle within groups using PRNG
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const sVisual = shuffle(visual);
  const sNumeric = shuffle(numeric);
  const sTiles = shuffle(tiles);

  // Take balanced distribution: 3 visual, 4 numeric, 3 tiles = 10
  const selected: PatternQuestion[] = [
    ...sVisual.slice(0, Math.ceil(count * 0.3)),
    ...sNumeric.slice(0, Math.ceil(count * 0.4)),
    ...sTiles.slice(0, Math.ceil(count * 0.3)),
  ];

  // Fill any remaining slots from the pool if category slicing fell short
  let fillIdx = 0;
  while (selected.length < count && fillIdx < pool.length) {
    const cand = pool[fillIdx];
    if (!selected.some((q) => q.id === cand.id)) {
      selected.push(cand);
    }
    fillIdx++;
  }

  // Sort ascending by difficulty for a gentle, rewarding learning curve
  selected.sort((a, b) => a.difficulty - b.difficulty);

  return selected.slice(0, count);
}
