export default function FlagCard({ card, lang, onOpen }) {
  const title = lang === "hi" ? card.title_hi : card.title_en;
  return (
    <div className="card" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
      <span className="num">! {card.clause_ref || card.rule_id}</span>
      <h3>{title}</h3>
      <p>›</p>
    </div>
  );
}
