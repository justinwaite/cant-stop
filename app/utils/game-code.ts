const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  }
  return code;
}

export function isValidGameCode(code: string): boolean {
  return /^[A-Z]{5}$/.test(code);
}
