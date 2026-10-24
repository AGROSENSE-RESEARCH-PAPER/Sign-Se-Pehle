export default function ClauseSheet({ card, lang, onClose }) {
  if (!card) return null;
  const title = lang === "hi" ? card.title_hi : card.title_en;
  const ask = lang === "hi" ? card.ask_hi : card.ask_en;
  return (
    <div className="sheet open" role="dialog" aria-modal="true">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <span className="num">{card.clause_ref || card.rule_id}</span>
      <h3 style={{ fontSize: 20, color: "var(--maroon)", margin: "6px 0" }}>{title}</h3>
      {card.quote ? <blockquote>{card.quote}</blockquote> : null}
      {card.provision ? (
        <>
          <p style={{ fontWeight: 800, color: "var(--maroon)", marginBottom: 2 }}>Legal basis</p>
          <p style={{ fontSize: 15, lineHeight: 1.55 }}>{card.provision}</p>
          <p className="muted" style={{ fontSize: 13 }}>Provision text is unverified — check it against the official RERA Act / state rules before relying on it.</p>
        </>
      ) : null}
      {card.uk_rule_id ? (
        <p style={{ fontSize: 15, lineHeight: 1.55 }}>
          Uttarakhand candidate rule: <b>{card.uk_rule_id}</b>
          {card.uk_provision_ref ? ` — ${card.uk_provision_ref}` : ""}
          {card.uk_relation && card.uk_relation !== "direct" ? ` (${card.uk_relation})` : ""} · not legally verified.
        </p>
      ) : null}
      <p style={{ fontWeight: 800, color: "var(--maroon)" }}>What to ask →</p>
      <p style={{ fontSize: 16, lineHeight: 1.55 }}>{ask}</p>
      <button className="btn btn-saffron" onClick={onClose} style={{ marginTop: 10 }}>Got it</button>
    </div>
  );
}
