/**
 * Unit / integration tests for the Node.js Account Management System.
 * Scenarios mirror docs/TESTPLAN.md (TC-001 … TC-018).
 */

const {
  DataProgram,
  Operations,
  mainLogic,
  formatAmount,
} = require('./index');

/**
 * Scripted IO adapter for non-interactive tests.
 * @param {string[]} answers
 */
function createScriptedIo(answers = []) {
  const queue = [...answers];
  const logs = [];

  return {
    logs,
    log: (...args) => {
      logs.push(args.map(String).join(' '));
    },
    question: async (prompt) => {
      logs.push(String(prompt));
      if (queue.length === 0) {
        return null;
      }
      return queue.shift();
    },
    output: () => logs.join('\n'),
  };
}

/** Run the full menu loop with scripted answers. */
async function runApp(answers) {
  DataProgram.reset(1000.0);
  const io = createScriptedIo(answers);
  await mainLogic(io);
  return io;
}

/** Count occurrences of a substring in text. */
function countOccurrences(text, snippet) {
  if (!snippet) return 0;
  return text.split(snippet).length - 1;
}

beforeEach(() => {
  DataProgram.reset(1000.0);
});

describe('Account Management System — TESTPLAN scenarios', () => {
  // TC-001
  test('TC-001: Application starts and displays main menu', async () => {
    const io = await runApp(['4']);
    const out = io.output();

    expect(out).toContain('Account Management System');
    expect(out).toContain('1. View Balance');
    expect(out).toContain('2. Credit Account');
    expect(out).toContain('3. Debit Account');
    expect(out).toContain('4. Exit');
    expect(out).toContain('Enter your choice (1-4):');
  });

  // TC-002
  test('TC-002: View balance from initial state', async () => {
    const io = await runApp(['1', '4']);
    const out = io.output();

    expect(out).toContain('Current balance: 1000.00');
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
  });

  // TC-003
  test('TC-003: Credit account with valid amount', async () => {
    const io = await runApp(['2', '200.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1200.00');
    expect(out).toContain('Current balance: 1200.00');
    expect(DataProgram.getStorageBalance()).toBe(1200.0);
  });

  // TC-004
  test('TC-004: Debit account with sufficient funds', async () => {
    const io = await runApp(['3', '300.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount debited. New balance: 700.00');
    expect(out).toContain('Current balance: 700.00');
    expect(DataProgram.getStorageBalance()).toBe(700.0);
  });

  // TC-005
  test('TC-005: Debit account with insufficient funds', async () => {
    const io = await runApp(['3', '1200.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Insufficient funds for this debit.');
    expect(out).toContain('Current balance: 1000.00');
    expect(out).not.toContain('Amount debited.');
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
  });

  // TC-006
  test('TC-006: Debit account exactly equal to balance', async () => {
    const io = await runApp(['3', '1000.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount debited. New balance: 0.00');
    expect(out).toContain('Current balance: 0.00');
    expect(DataProgram.getStorageBalance()).toBe(0.0);
  });

  // TC-007
  test('TC-007: Sequential operations persist within same session', async () => {
    const io = await runApp(['2', '250.00', '3', '100.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1250.00');
    expect(out).toContain('Amount debited. New balance: 1150.00');
    expect(out).toContain('Current balance: 1150.00');
    expect(DataProgram.getStorageBalance()).toBe(1150.0);
  });

  // TC-008
  test('TC-008: Exit option terminates loop and program', async () => {
    const io = await runApp(['4']);
    const out = io.output();

    expect(out).toContain('Exiting the program. Goodbye!');
    // Menu should appear once, then exit — no further operation prompts.
    expect(out).not.toContain('Enter credit amount:');
    expect(out).not.toContain('Enter debit amount:');
  });

  // TC-009
  test('TC-009: Invalid menu choice handling', async () => {
    const io = await runApp(['9', '4']);
    const out = io.output();

    expect(out).toContain('Invalid choice, please select 1-4.');
    expect(out).toContain('Exiting the program. Goodbye!');
    // Menu loop continues after invalid choice (menu text appears more than once).
    expect(countOccurrences(out, 'Account Management System')).toBeGreaterThanOrEqual(2);
  });

  // TC-010
  test('TC-010: Data read operation correctness (TOTAL -> READ)', async () => {
    const io = await runApp(['2', '50.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1050.00');
    expect(out).toContain('Current balance: 1050.00');
    expect(DataProgram.getStorageBalance()).toBe(1050.0);
  });

  // TC-011
  test('TC-011: Data write operation correctness after credit (WRITE)', async () => {
    const io = await runApp(['2', '75.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1075.00');
    expect(out).toContain('Current balance: 1075.00');
    expect(out).not.toContain('Current balance: 1000.00');
    expect(DataProgram.getStorageBalance()).toBe(1075.0);
  });

  // TC-012
  test('TC-012: Data write operation correctness after debit (WRITE)', async () => {
    const io = await runApp(['3', '125.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount debited. New balance: 875.00');
    expect(out).toContain('Current balance: 875.00');
    expect(DataProgram.getStorageBalance()).toBe(875.0);
  });

  // TC-013
  test('TC-013: No write occurs on failed debit', async () => {
    const io = await runApp(['2', '100.00', '3', '1200.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1100.00');
    expect(out).toContain('Insufficient funds for this debit.');
    expect(out).toContain('Current balance: 1100.00');
    expect(DataProgram.getStorageBalance()).toBe(1100.0);
  });

  // TC-014
  test('TC-014: Session reset behavior after restart', async () => {
    // First session: change balance, then "exit".
    const first = await runApp(['2', '500.00', '1', '4']);
    expect(first.output()).toContain('Current balance: 1500.00');
    expect(DataProgram.getStorageBalance()).toBe(1500.0);

    // Simulate restart: reset storage (new process / fresh session).
    DataProgram.reset(1000.0);
    const second = createScriptedIo(['1', '4']);
    await mainLogic(second);

    expect(second.output()).toContain('Current balance: 1000.00');
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
  });

  // TC-015
  test('TC-015: Boundary value at zero debit amount', async () => {
    const io = await runApp(['3', '0.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount debited. New balance: 1000.00');
    expect(out).toContain('Current balance: 1000.00');
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
  });

  // TC-016
  test('TC-016: Boundary value at zero credit amount', async () => {
    const io = await runApp(['2', '0.00', '1', '4']);
    const out = io.output();

    expect(out).toContain('Amount credited. New balance: 1000.00');
    expect(out).toContain('Current balance: 1000.00');
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
  });

  // TC-017
  test('TC-017: High-value credit within numeric field capacity', async () => {
    // COBOL field capacity was PIC 9(6)V99 (up to 999999.99).
    // Node port accepts the credit and persists the session balance.
    const io = await runApp(['2', '999999.99', '1', '4']);
    const out = io.output();

    const expected = formatAmount(1000.0 + 999999.99);
    expect(out).toContain(`Amount credited. New balance: ${expected}`);
    expect(out).toContain(`Current balance: ${expected}`);
    expect(DataProgram.getStorageBalance()).toBeCloseTo(1000.0 + 999999.99, 2);
  });

  // TC-018
  test('TC-018: Input robustness for menu prompt (alphabetic input)', async () => {
    const io = await runApp(['abc', '4']);
    const out = io.output();

    expect(out).toContain('Invalid choice, please select 1-4.');
    expect(out).toContain('Exiting the program. Goodbye!');
    // Recoverable: menu continues after bad input.
    expect(countOccurrences(out, 'Account Management System')).toBeGreaterThanOrEqual(2);
  });
});

describe('DataProgram unit behavior (supports TESTPLAN data-layer cases)', () => {
  test('READ copies STORAGE-BALANCE into balance ref', () => {
    DataProgram.reset(1234.56);
    const balanceRef = { value: 0 };
    DataProgram.call('READ', balanceRef);
    expect(balanceRef.value).toBe(1234.56);
  });

  test('WRITE copies balance ref into STORAGE-BALANCE', () => {
    DataProgram.reset(1000.0);
    const balanceRef = { value: 250.75 };
    DataProgram.call('WRITE', balanceRef);
    expect(DataProgram.getStorageBalance()).toBe(250.75);

    const readBack = { value: 0 };
    DataProgram.call('READ', readBack);
    expect(readBack.value).toBe(250.75);
  });

  test('unknown operation does not mutate storage', () => {
    DataProgram.reset(1000.0);
    const balanceRef = { value: 999.99 };
    DataProgram.call('NOOP', balanceRef);
    expect(DataProgram.getStorageBalance()).toBe(1000.0);
    expect(balanceRef.value).toBe(999.99);
  });
});

describe('Operations unit behavior (supports TESTPLAN operations cases)', () => {
  test('TOTAL displays current stored balance without writing', async () => {
    DataProgram.reset(888.5);
    const io = createScriptedIo([]);
    await Operations.call('TOTAL', io);
    expect(io.output()).toContain('Current balance: 888.50');
    expect(DataProgram.getStorageBalance()).toBe(888.5);
  });

  test('CREDIT adds amount and writes new balance', async () => {
    DataProgram.reset(1000.0);
    const io = createScriptedIo(['25.25']);
    await Operations.call('CREDIT', io);
    expect(io.output()).toContain('Amount credited. New balance: 1025.25');
    expect(DataProgram.getStorageBalance()).toBe(1025.25);
  });

  test('DEBIT with sufficient funds subtracts and writes', async () => {
    DataProgram.reset(1000.0);
    const io = createScriptedIo(['40']);
    await Operations.call('DEBIT', io);
    expect(io.output()).toContain('Amount debited. New balance: 960.00');
    expect(DataProgram.getStorageBalance()).toBe(960.0);
  });

  test('DEBIT with insufficient funds leaves balance unchanged', async () => {
    DataProgram.reset(100.0);
    const io = createScriptedIo(['100.01']);
    await Operations.call('DEBIT', io);
    expect(io.output()).toContain('Insufficient funds for this debit.');
    expect(DataProgram.getStorageBalance()).toBe(100.0);
  });
});
