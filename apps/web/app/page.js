"use client";

import { useRef, useState } from "react";
import ClauseSheet from "../components/ClauseSheet";
import FlagCard from "../components/FlagCard";
import LangToggle from "../components/LangToggle";
import VerdictCircle from "../components/VerdictCircle";
import en from "../messages/en.json";
import hi from "../messages/hi.json";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Same planted-issue sample as eval/sample_agreement.txt, so the
// "Try a sample" demo works even without a file on hand.
const SAMPLE_TEXT = `AGREEMENT FOR SALE — SAMPLE (planted issues for demo/eval only)

Clause 2: Carpet Area
The carpet area of the apartment is 820 sq ft as per the approved plan.

Clause 3: Total Price
The total price of the apartment is 7500000 rupees, payable in instalments as per the payment schedule.

Clause 7: Possession Date
The Promoter shall hand over possession on 30 June 2028. The Promoter shall be entitled to a grace period of eighteen (18) months beyond the possession date.

Clause 11: Interest on Delayed Payments
Interest at 24% per annum, compounded monthly, shall be payable by the Allottee on delayed payments. The Promoter shall pay interest at 10% per annum on delayed possession.

Clause 19: Dispute Resolution
All disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.
`;

const STEPS = ["Reading pages", "Splitting clauses", "Checking rules", "Preparing your report"];

export default function Home() {
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("home");
  const [report, setReport] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [doneSteps, setDoneSteps] = useState(0);
  const fileRef = useRef(null);
  const t = lang === "hi" ? hi : en;

  async function analyse(fileOrBlob, filename) {
    setError("");
    setScreen("reading");
    setDoneSteps(0);
    STEPS.forEach((_, i) => setTimeout(() => setDoneSteps(i + 1), 450 * (i + 1)));
    try {
      const form = new FormData();
      form.append("file", fileOrBlob, filename);
      form.append("state", "baseline");
      form.append("language", lang);
      const created = await fetch(`${API}/v1/analyses`, { method: "POST", body: form });
      if (!created.ok) {
        const d = await created.json().catch(() => ({}));
        throw new Error(d.detail || "Could not read this file. Please retake weak pages and try again.");
      }
      const { id } = await created.json();
      setAnalysisId(id);
      const rep = await fetch(`${API}/v1/analyses/${id}/report`).then((r) => r.json());
      setReport(rep);
      setScreen("verdict");
    } catch (e) {
      setError(e.message);
      setScreen("home");
    }
  }

  function copyQs() {
    if (!report) return;
    const qs = report.top_cards.map((c) => `• ${lang === "hi" ? c.ask_hi : c.ask_en}`).join("\n");
    const txt = (lang === "hi" ? "Sign karne se pehle main ye poochna chahta hun:\n" : "Before I sign, I would like to ask:\n") + qs;
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
  }

  function waLink() {
    if (!report) return "#";
    const qs = report.top_cards.map((c) => `• ${lang === "hi" ? c.ask_hi : c.ask_en}`).join("\n");
    return `https://wa.me/?text=${encodeURIComponent("Before I sign, I would like to ask:\n" + qs)}`;
  }

  function reset() {
    if (analysisId) fetch(`${API}/v1/analyses/${analysisId}`, { method: "DELETE" }).catch(() => {});
    setReport(null); setAnalysisId(null); setSheet(null); setScreen("home");
  }

  return (
    <div className="phone">
      {screen === "home" ? <div className="toran" /> : null}
      <header>
        <div className="brand">Sign <span>Se</span> Pehle</div>
        <LangToggle lang={lang} onChange={setLang} />
      </header>

      {screen === "home" && (
        <main>
          <h1>{t.h1}</h1>
          <p className="sub">{t.sub}</p>
          <div className="hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/marble-gold.jpg" alt="" />
            <span className="cap">{t.cap}</span>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) analyse(f, f.name); e.target.value = ""; }} />
          <button className="btn btn-saffron" onClick={() => fileRef.current?.click()}>⬆ {t.up}</button>
          <button className="btn btn-ghost" style={{ marginTop: 10 }}
            onClick={() => analyse(new Blob([SAMPLE_TEXT], { type: "text/plain" }), "sample.txt")}>{t.sample}</button>
          <p className="fine">{t.fine}</p>
          <h2>{t.how}</h2>
          <div className="card"><span className="num">01</span><h3>{t.s1t}</h3><p>{t.s1p}</p></div>
          <div className="card"><span className="num">02</span><h3>{t.s2t}</h3><p>{t.s2p}</p></div>
          <div className="card"><span className="num">03</span><h3>{t.s3t}</h3><p>{t.s3p}</p></div>
          <p className="disclaimer">{t.disc}</p>
        </main>
      )}

      {screen === "reading" && (
        <main>
          <h1>{t.read}</h1>
          <p className="sub">{t.readsub}</p>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`step ${doneSteps > i ? "done" : ""}`}>
                <span className="dot">{i + 1}</span><span>{s}</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {screen === "verdict" && report && (
        <main>
          <div className="verdict-wrap">
            <VerdictCircle verdict={report.verdict} />
            <p className="verdict-line">
              {lang === "hi" ? report.summary_hi : report.summary_en}
            </p>
            <span className="chip">14 checks run · {report.verdict.toUpperCase()}</span>
          </div>
          <h2>{t.fix}</h2>
          {report.top_cards.map((c) => (
            <FlagCard key={c.rule_id} card={c} lang={lang} onOpen={() => setSheet(c)} />
          ))}
          <h2>{t.all}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.7 }}>
            {report.all_findings.length} findings · {report.top_cards.length} shown first
          </p>
          <div className="row">
            <button className="btn btn-maroon" onClick={copyQs}>{t.copy}</button>
            <a className="btn btn-teal" href={waLink()} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href={`${API}/v1/analyses/${analysisId}/report.pdf`} target="_blank" rel="noreferrer">{t.pdf}</a>
            <button className="btn btn-ghost" onClick={reset}>{t.del}</button>
          </div>
          <p className="disclaimer">{t.disc}</p>
        </main>
      )}

      {sheet ? <ClauseSheet card={sheet} lang={lang} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
