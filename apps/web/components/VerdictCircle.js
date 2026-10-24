export default function VerdictCircle({ verdict }) {
  // limited_clear is never shortened to "safe" in words, but the circle
  // itself shows CLEAR; the summary line carries the full wording.
  const label = verdict === "limited_clear" ? "CLEAR" : verdict.toUpperCase();
  return <div className={`circle ${verdict}`}>{label}</div>;
}
