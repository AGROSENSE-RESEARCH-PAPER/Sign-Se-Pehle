export default function LangToggle({ lang, onChange }) {
  return (
    <div className="lang" role="group" aria-label="Language">
      <button className={lang === "en" ? "active" : ""} onClick={() => onChange("en")}>English</button>
      <button className={lang === "hi" ? "active" : ""} onClick={() => onChange("hi")}>हिन्दी</button>
    </div>
  );
}
