/**
 * Account Management System
 * Node.js port of the COBOL legacy application:
 *   - main.cob       → MainProgram (menu loop)
 *   - operations.cob → Operations  (TOTAL / CREDIT / DEBIT)
 *   - data.cob       → DataProgram (READ / WRITE balance storage)
 *
 * Business rules preserved from the COBOL implementation:
 *   - Opening balance: 1000.00
 *   - Credit: add amount and write balance
 *   - Debit: only when balance >= amount; otherwise reject (no overdraft)
 *   - Session-scoped in-memory storage (resets on restart)
 */

const readline = require('readline');

// ---------------------------------------------------------------------------
// DataProgram (data.cob)
// In-memory balance storage with READ / WRITE operations.
// ---------------------------------------------------------------------------
const DataProgram = (() => {
  let storageBalance = 1000.00;

  /**
   * @param {'READ'|'WRITE'} operationType
   * @param {{ value: number }} balanceRef - mutable holder for balance I/O
   */
  function call(operationType, balanceRef) {
    if (operationType === 'READ') {
      balanceRef.value = storageBalance;
    } else if (operationType === 'WRITE') {
      storageBalance = balanceRef.value;
    }
  }

  /** Test/diagnostic helper — not part of the interactive menu. */
  function getStorageBalance() {
    return storageBalance;
  }

  /** Test helper to reset session state. */
  function reset(initial = 1000.00) {
    storageBalance = initial;
  }

  return { call, getStorageBalance, reset };
})();

// ---------------------------------------------------------------------------
// Operations (operations.cob)
// Business operations: TOTAL, CREDIT, DEBIT.
// ---------------------------------------------------------------------------
const Operations = (() => {
  /**
   * @param {'TOTAL'|'CREDIT'|'DEBIT'} operationType
   * @param {{ question: (prompt: string) => Promise<string>, log: (...args: unknown[]) => void }} io
   */
  async function call(operationType, io) {
    const finalBalance = { value: 1000.00 };

    if (operationType === 'TOTAL') {
      DataProgram.call('READ', finalBalance);
      io.log(`Current balance: ${formatAmount(finalBalance.value)}`);
    } else if (operationType === 'CREDIT') {
      const amount = await readAmount(io, 'Enter credit amount: ');
      DataProgram.call('READ', finalBalance);
      finalBalance.value = roundMoney(finalBalance.value + amount);
      DataProgram.call('WRITE', finalBalance);
      io.log(`Amount credited. New balance: ${formatAmount(finalBalance.value)}`);
    } else if (operationType === 'DEBIT') {
      const amount = await readAmount(io, 'Enter debit amount: ');
      DataProgram.call('READ', finalBalance);
      if (finalBalance.value >= amount) {
        finalBalance.value = roundMoney(finalBalance.value - amount);
        DataProgram.call('WRITE', finalBalance);
        io.log(`Amount debited. New balance: ${formatAmount(finalBalance.value)}`);
      } else {
        io.log('Insufficient funds for this debit.');
      }
    }
  }

  return { call };
})();

// ---------------------------------------------------------------------------
// MainProgram (main.cob)
// Menu-driven entry point and user interaction loop.
// ---------------------------------------------------------------------------
async function mainLogic(io) {
  let continueFlag = 'YES';

  while (continueFlag !== 'NO') {
    io.log('--------------------------------');
    io.log('Account Management System');
    io.log('1. View Balance');
    io.log('2. Credit Account');
    io.log('3. Debit Account');
    io.log('4. Exit');
    io.log('--------------------------------');

    const choiceRaw = await io.question('Enter your choice (1-4): ');
    if (choiceRaw === null || choiceRaw === undefined) {
      continueFlag = 'NO';
      break;
    }
    const userChoice = String(choiceRaw).trim();

    switch (userChoice) {
      case '1':
        await Operations.call('TOTAL', io);
        break;
      case '2':
        await Operations.call('CREDIT', io);
        break;
      case '3':
        await Operations.call('DEBIT', io);
        break;
      case '4':
        continueFlag = 'NO';
        break;
      default:
        io.log('Invalid choice, please select 1-4.');
        break;
    }
  }

  io.log('Exiting the program. Goodbye!');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

async function readAmount(io, prompt) {
  const raw = await io.question(prompt);
  const amount = Number.parseFloat(String(raw).trim());
  if (Number.isNaN(amount) || amount < 0) {
    io.log('Invalid amount. Using 0.00.');
    return 0;
  }
  return roundMoney(amount);
}

function createConsoleIo() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let closed = false;
  rl.on('close', () => {
    closed = true;
  });

  return {
    log: (...args) => console.log(...args),
    question: (prompt) =>
      new Promise((resolve) => {
        if (closed) {
          resolve(null);
          return;
        }
        rl.question(prompt, (answer) => {
          // rl.question yields undefined once the input stream has ended.
          if (answer === undefined || answer === null) {
            resolve(null);
            return;
          }
          resolve(answer);
        });
      }),
    close: () => {
      if (!closed) {
        rl.close();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------
async function start() {
  const io = createConsoleIo();
  try {
    await mainLogic(io);
  } finally {
    io.close();
  }
}

if (require.main === module) {
  start();
}

module.exports = {
  DataProgram,
  Operations,
  mainLogic,
  start,
  roundMoney,
  formatAmount,
};
