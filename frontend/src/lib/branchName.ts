// "MRB Optical Clinic Pasay" -> { clinic: "MRB Optical Clinic", place: "Pasay" }.
// A name that does not follow that pattern has no parts.
function splitBranch(name: string): { clinic: string; place: string } | null {
  const match = /^(.+?\sClinic)\s+(\S+)$/.exec(name);
  return match ? { clinic: match[1], place: match[2] } : null;
}

// "MRB Optical · Pasay", short enough for the top bar.
export function shortBranchName(name: string): string {
  const parts = splitBranch(name);
  return parts ? `${parts.clinic.replace(/\s+Clinic$/, '')} · ${parts.place}` : name;
}

// The branch card at the bottom of the staff sidebar: the title "MRB Optical Clinic", the line
// "Pasay branch" and the mark "MR".
export function branchCardText(name: string): { mark: string; title: string; sub: string } {
  const mark = name.slice(0, 2).toUpperCase();
  const parts = splitBranch(name);
  return parts
    ? { mark, title: parts.clinic, sub: `${parts.place} branch` }
    : { mark, title: name, sub: '' };
}
