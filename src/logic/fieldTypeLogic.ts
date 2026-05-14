import { FieldTypeId } from '../constants';

/**
 * Assigns a field type based on quiz answers.
 * For the prototype, we use a simple mapping.
 */
export function assignFieldType(answers: Record<number, string>): FieldTypeId {
  const counts: Record<FieldTypeId, number> = {
    'captainClipboard': 0,
    'mallRat': 0,
    'homecomingQueen': 0,
    'lostCamper': 0,
    'bigfoot': 0
  };

  Object.values(answers).forEach(fieldTypeId => {
    counts[fieldTypeId as FieldTypeId]++;
  });

  // Return the one with the highest count, or a default
  return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as FieldTypeId;
}
