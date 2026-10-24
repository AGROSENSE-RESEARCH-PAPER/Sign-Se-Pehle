"use client";

import { useRef, useState } from "react";
import ClauseSheet from "../components/ClauseSheet";
import FlagCard from "../components/FlagCard";
import LangToggle from "../components/LangToggle";
import VerdictCircle from "../components/VerdictCircle";
import en from "../messages/en.json";
import hi from "../messages/hi.json";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Base path for GitHub Pages project sites (/Sign-Se-Pehle); empty on Vercel.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

// v1 state screen (Final PRD F15): only Uttarakhand is supported.
// Other states are listed but disabled in effect: picking one shows the
// unsupported message and never reaches the upload step.
const STATES = [
  { code: "UK", name: "Uttarakhand" },
  { code: "DL", name: "Delhi" },
  { code: "MH", name: "Maharashtra" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "KA", name: "Karnataka" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "WB", name: "West Bengal" },
  { code: "RJ", name: "Rajasthan" },
  { code: "GJ", name: "Gujarat" },
  { code: "BR", name: "Bihar" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "TS", name: "Telangana" },
  { code: "HR", name: "Haryana" },
  { code: "PB", name: "Punjab" },
  { code: "OTHER", name: "Other" },
];

export default function Home() {
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("home");
  const [report, setReport] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [apiOffline, setApiOffline] = useState(false);
  const [stateCode, setStateCode] = useState(null);
  const [doneSteps, setDoneSteps] = useState(0);
  const fileRef = useRef(null);
  const t = lang === "hi" ? hi : en;

  // Multi-photo upload (Final PRD F1): up to 8 photos, read in order.
  async function analyseUploads(fileList) {
    const files = Array.from(fileList || []);
    if (files.length > 8) {
      setError(t.tooManyPhotos || "Up to 8 photos per analysis — please pick 8 or fewer.");
      return;
    }
    setError("");
    setApiOffline(false);
    setScreen("reading");
    setDoneSteps(0);
    STEPS.forEach((_, i) => setTimeout(() => setDoneSteps(i + 1), 450 * (i + 1)));
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f, f.name));
      form.append("state", stateCode || "UK");
      form.append("state_code", stateCode || "UK");
      form.append("language", lang);
      const created = await fetch(`${API}/v1/analyses`, { method: "POST", body: form });
      if (!created.ok) {
        const d = await created.json().catch(() => ({}));
        throw new Error(d.detail || "Could not read these photos. Please retake weak pages and try again.");
      }
      const { id, session_token } = await created.json();
      setAnalysisId(id);
      setSessionToken(session_token || null);
      const rep = await fetch(`${API}/v1/analyses/${id}/report`, {
        headers: session_token ? { Authorization: `Bearer ${session_token}` } : {},
      }).then((r) => r.json());
      setReport(rep);
      setScreen("verdict");
    } catch (e) {
      setError(e.message || "Could not read these photos.");
      setScreen("home");
    }
  }

  async function analyse(fileOrBlob, filename) {
    setError("");
    setApiOffline(false);
    setScreen("reading");
    setDoneSteps(0);
    STEPS.forEach((_, i) => setTimeout(() => setDoneSteps(i + 1), 450 * (i + 1)));
    try {
      const form = new FormData();
      form.append("file", fileOrBlob, filename);
      // API accepts the `state` form field (stored on the analysis);
      // `state_code` is sent too so a future API field name works as well
      // (FastAPI ignores the extra field today). Upload is only reachable
      // after Uttarakhand is chosen, so this is always "UK" here.
      form.append("state", stateCode || "UK");
      form.append("state_code", stateCode || "UK");
      form.append("language", lang);
      const created = await fetch(`${API}/v1/analyses`, { method: "POST", body: form });
      if (!created.ok) {
        const d = await created.json().catch(() => ({}));
        throw new Error(d.detail || "Could not read this file. Please retake weak pages and try again.");
      }
      const { id, session_token } = await created.json();
      setAnalysisId(id);
      setSessionToken(session_token || null);
      // Track 3: report requires the capability token from POST.
      const rep = await fetch(`${API}/v1/analyses/${id}/report`, {
        headers: session_token ? { Authorization: `Bearer ${session_token}` } : {},
      }).then((r) => r.json());
      setReport(rep);
      setScreen("verdict");
    } catch (e) {
      // Demo fallback: if the API is not reachable (e.g. backend not
      // deployed yet), show the planted-issue sample report locally
      // and label it honestly, instead of a dead demo.
      const fallback = {
        verdict: "red",
        summary_en: "Ask 3 things before you sign.",
        summary_hi: "Sign karne se pehle 3 baatein poochhein.",
        top_cards: [
          { rule_id: "R-POSS-GRACE", severity: "red", provision: "RERA s.18 (text to be verified against the Act)", uk_rule_id: "UK-POSS-04", uk_provision_ref: "RERA s.18", title_en: "Possession date can slip by 18 months", title_hi: "Possession date 18 mahine khisak sakti hai", quote: "The Promoter shall be entitled to a grace period of eighteen (18) months beyond the possession date.", clause_ref: "Clause C7", ask_en: "Ask the builder to remove the grace period.", ask_hi: "Builder se grace period hatane ko kaho." },
          { rule_id: "R-INTEREST-UNEQUAL", severity: "red", provision: "RERA s.18 / s.19 (text to be verified)", uk_rule_id: "UK-INT-01", uk_provision_ref: "Uttarakhand Rules 2017, Rule 15; RERA s.13(2)", title_en: "You pay more on delays than the builder pays you", title_hi: "Aap builder se zyada jurmana doge", quote: "Interest at 24% per annum, compounded monthly, shall be payable by the Allottee on delayed payments.", clause_ref: "Clause C11", ask_en: "Ask for the same interest rate on both sides.", ask_hi: "Dono taraf ek hi interest rate maango." },
          { rule_id: "R-ARBITRATION", severity: "amber", provision: "RERA s.31 / s.71 (text to be verified)", uk_rule_id: "UK-DISPUTE-15", uk_provision_ref: "RERA s.79 / case law", title_en: "Disputes sent to arbitration", title_hi: "Vivad arbitration mein bheja jayega", quote: "All disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.", clause_ref: "Clause C19", ask_en: "Ask that RERA remedies stay available to you.", ask_hi: "Poochho ki RERA wale upay aapke liye khule rahein." },
        ],
        all_findings: [],
        checks_run: 14,
        extraction_method: "sample-fallback",
        ocr_used: false,
        pages_to_retake: [],
      };
      setReport(fallback);
      setApiOffline(true);
      setScreen("verdict");
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
    if (analysisId) fetch(`${API}/v1/analyses/${analysisId}`, {
      method: "DELETE",
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    }).catch(() => {});
    setReport(null); setAnalysisId(null); setSessionToken(null); setSheet(null); setApiOffline(false); setScreen("home");
  }

  async function downloadPdf() {
    if (!analysisId || apiOffline) return;
    try {
      const r = await fetch(`${API}/v1/analyses/${analysisId}/report.pdf`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      });
      if (!r.ok) throw new Error("pdf");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `sign-se-pehle-${analysisId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* PDF is a nice-to-have; the verdict screen stays usable. */ }
  }

  return (
    <div className="phone" style={{ backgroundImage: `url(${BASE}/assets/floral-swirl.jpg)`, backgroundSize: 340, backgroundRepeat: "repeat", backgroundBlendMode: "multiply" }}>
      {screen === "home" ? <div className="toran" style={{ backgroundImage: `url(${BASE}/assets/paisley.jpg)` }} /> : null}
      <header>
        <div className="brand">Sign <span>Se</span> Pehle</div>
        <LangToggle lang={lang} onChange={setLang} />
      </header>

      {screen === "home" && (
        <main>
          <div className="home-hero">
            <div>
              <h1>{t.h1}</h1>
              <p className="sub">{t.sub}</p>
              <div className="state-block">
                <h2 style={{ marginTop: 0 }}>{t.stateTitle}</h2>
                <p className="sub" style={{ marginBottom: 12 }}>{t.stateSub}</p>
                <div className="state-grid">
                  {STATES.map((s) => (
                    <button key={s.code} type="button"
                      className={`state-btn ${stateCode === s.code ? "selected" : ""}`}
                      onClick={() => setStateCode(s.code)}>
                      {s.name}{s.code === "UK" ? ` · ${t.stateV1}` : ""}
                    </button>
                  ))}
                </div>
                {stateCode === "UK" ? (
                  <p className="state-ok">✓ {t.stateSelected}</p>
                ) : null}
                {stateCode && stateCode !== "UK" ? (
                  <div className="error">{t.stateUnsupported}</div>
                ) : null}
                {stateCode ? (
                  <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setStateCode(null)}>{t.stateChange}</button>
                ) : null}
              </div>
              {error ? <div className="error">{error}</div> : null}
              {stateCode === "UK" ? (
                <>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" style={{ display: "none" }}
                    onChange={(e) => { const fs = e.target.files; if (fs?.length === 1) analyse(fs[0], fs[0].name); else if (fs?.length > 1) analyseUploads(fs); e.target.value = ""; }} />
                  <button className="btn btn-saffron" style={{ marginTop: 14 }} onClick={() => fileRef.current?.click()}>⬆ {t.up}</button>
                  <button className="btn btn-ghost" style={{ marginTop: 10 }}
                    onClick={() => analyse(new Blob([SAMPLE_TEXT], { type: "text/plain" }), "sample.txt")}>{t.sample}</button>
                </>
              ) : null}
              <p className="fine">{t.fine}</p>
            </div>
            <div className="hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${BASE}/assets/marble-gold.jpg`} alt="" />
              <span className="cap">{t.cap}</span>
            </div>
          </div>
          <div className="home-how">
            <h2>{t.how}</h2>
            <div className="card"><span className="num">01</span><h3>{t.s1t}</h3><p>{t.s1p}</p></div>
            <div className="card"><span className="num">02</span><h3>{t.s2t}</h3><p>{t.s2p}</p></div>
            <div className="card"><span className="num">03</span><h3>{t.s3t}</h3><p>{t.s3p}</p></div>
            <p className="disclaimer">{t.disc}</p>
          </div>
        </main>
      )}

      {screen === "reading" && (
        <main className="narrow">
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
        <main className="narrow">
          <div className="verdict-wrap">
            <VerdictCircle verdict={report.verdict} />
            <p className="verdict-line">
              {lang === "hi" ? report.summary_hi : report.summary_en}
            </p>
            <span className="chip">{report.coverage ? `${report.coverage.checked} of ${report.coverage.eligible} checks completed` : `${report.checks_run} checks run`} · {report.verdict.toUpperCase().replace("_", " ")}</span>
            {report.rule_set ? (
              <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Rule set: {report.rule_set} — Uttarakhand candidate rules are not yet legally verified.</p>
            ) : null}
            {report.unchecked_rules?.length ? (
              <p style={{ fontSize: 14, color: "#92400e", marginTop: 8 }}>Unchecked: {report.unchecked_rules.join(", ")}</p>
            ) : null}
            {apiOffline ? (
              <p style={{ fontSize: 14, color: "#92400e", marginTop: 10 }}>
                ⚠ API not reachable — sample report shown. Deploy the API and set NEXT_PUBLIC_API_URL for live analysis.
              </p>
            ) : null}
            {report.pages_to_retake?.length ? (
              <p style={{ fontSize: 15, color: "#92400e", marginTop: 10 }}>
                ⚠ Weak pages, please retake: {report.pages_to_retake.join(", ")}
              </p>
            ) : null}
            {report.ocr_used ? (
              <p style={{ fontSize: 14, color: "var(--muted)" }}>Read with OCR (Hindi + English) · method: {report.extraction_method}</p>
            ) : null}
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
            <button className="btn btn-ghost" onClick={downloadPdf}>{t.pdf}</button>
            <button className="btn btn-ghost" onClick={reset}>{t.del}</button>
          </div>
          <p className="disclaimer">{t.disc}</p>
        </main>
      )}

      {sheet ? <ClauseSheet card={sheet} lang={lang} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
