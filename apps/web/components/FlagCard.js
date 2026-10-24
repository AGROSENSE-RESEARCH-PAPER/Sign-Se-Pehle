export default function FlagCard({ card, lang, onOpen }) {
  const title = lang === "hi" ? card.title_hi : card.title_en;
  return (
    <div className="card" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
      <span className="num">! {card.clause_ref || card.rule_id}</span>
      <h3>{title}</h3>
      {card.provision ? <p className="muted" style={{ fontSize: 13 }}>Legal basis: {card.provision}</p> : null}
      {card.uk_rule_id ? <p className="muted" style={{ fontSize: 13 }}>Uttarakhand candidate: {card.uk_rule_id} — not legally verified</p> : null}
      <p>›</p>
    </div>
  );
}
