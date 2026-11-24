import { normalizePhone } from './phone.js';

describe('normalizePhone', () => {
  it.each([
    '09171234567',
    '9171234567',
    '+639171234567',
    '0917 123 4567',
    '+63 917-123-4567',
  ])('turns %s into +639171234567', (input) => {
    expect(normalizePhone(input)).toBe('+639171234567');
  });

  it.each(['', '12345', '08171234567', '+6391712345678', 'juan@example.com'])(
    'rejects %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});
