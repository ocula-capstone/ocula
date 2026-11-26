// The patients list already opens filtered by name (?q=), which is how a record is reached today.
export const recordsLink = (patient: string): string =>
  `/staff/patients?q=${encodeURIComponent(patient)}`;
