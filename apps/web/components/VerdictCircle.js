export default function VerdictCircle({ verdict }) {
  return <div className={`circle ${verdict}`}>{verdict.toUpperCase()}</div>;
}
