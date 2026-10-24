const app = document.querySelector("#app");
const dialogRoot = document.querySelector("#dialog-root");
const toast = document.querySelector("#toast");

const state = {
  route: location.hash.slice(1) || "home",
  locale: localStorage.getItem("ssp-locale") || "en",
  jurisdiction: "Uttarakhand",
  questionEdits: false,
};

const states = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const issues = [
  {
    icon: "calendar", level: "High Risk", title: "Possession date can slip by 18 months",
    short: "The builder can delay possession by up to 18 months without a strong penalty. This may affect your moving plans and home loan costs.",
    clause: "Clause 7.3 · page 9",
    quote: "The Promoter may extend the Possession Date by a grace period of up to eighteen months where completion is delayed.",
    simple: "This wording gives the promoter a long extension window. Ask which events can trigger it and whether compensation still applies.",
    source: "Synthetic demo rule UK-POSS-03 · based on RERA sections 13 and 18 · not legally reviewed",
    question: "Can the delay compensation be uncapped and apply for the full delay period?",
    hi: { title: "कब्ज़ा तारीख 18 महीने तक टल सकती है", short: "बिल्डर कब्ज़ा 18 महीने तक टाल सकता है। इससे आपके शिफ्ट होने और होम लोन की योजना प्रभावित हो सकती है।", simple: "इस शब्दावली से बिल्डर को लंबा विस्तार मिलता है। पूछें कि कौन-सी घटनाएँ इसे शुरू कर सकती हैं और मुआवज़ा लागू रहेगा या नहीं।", question: "क्या देरी का मुआवज़ा बिना सीमा के और पूरी देरी अवधि के लिए लागू हो सकता है?" }
  },
  {
    icon: "percent", level: "Medium Risk", title: "You pay 24% on late dues",
    short: "If you miss a payment, the agreement charges 24% annual interest on the delay amount. This can become a large cost over time.",
    clause: "Clause 10.2 · page 12",
    quote: "Any delayed payment by the Allottee shall attract interest at the rate of twenty-four percent per annum.",
    simple: "The sample sets a 24% buyer rate but does not show an equivalent rate for promoter delay.",
    source: "Synthetic demo rule UK-INT-01 · candidate reference: Uttarakhand Rule 15 · legal review pending",
    question: "Can the rate be aligned with RERA guidelines or market standards?",
    hi: { title: "देरी पर आपको 24% देना होगा", short: "यदि आप भुगतान चूकते हैं, तो देरी की राशि पर 24% वार्षिक ब्याज लगेगा। समय के साथ यह बड़ी लागत बन सकती है।", simple: "नमूने में खरीदार के लिए 24% दर है, लेकिन बिल्डर की देरी के लिए समान दर नहीं दिखाई गई है।", question: "क्या दर को RERA दिशानिर्देशों या बाज़ार मानकों से जोड़ा जा सकता है?" }
  },
  {
    icon: "scale", level: "Medium Risk", title: "Disputes sent to arbitration",
    short: "In case of a dispute, you must go to arbitration instead of a regular court. This can be slower, costlier and harder for homebuyers.",
    clause: "Clause 12.1 · page 15",
    quote: "In case of a dispute, the parties shall refer the matter to arbitration instead of approaching the RERA authority.",
    simple: "Arbitration can be slower and costlier than the RERA authority route. Ask whether you can still approach the RERA authority directly.",
    source: "Synthetic demo rule UK-ARB-02 · candidate reference: RERA section 31 · legal review pending",
    question: "Will the same penalty apply to the builder for delays caused by them?",
    hi: { title: "विवाद मध्यस्थता में भेजे जाएँगे", short: "विवाद होने पर आपको नियमित अदालत के बजाय मध्यस्थता में जाना होगा। यह धीमा, महँगा और खरीदारों के लिए कठिन हो सकता है।", simple: "मध्यस्थता RERA प्राधिकरण के रास्ते से धीमी और महँगी हो सकती है। पूछें कि क्या आप सीधे RERA प्राधिकरण से संपर्क कर सकते हैं।", question: "क्या बिल्डर की वजह से हुई देरी पर भी वही जुर्माना लागू होगा?" }
  }
];

function issueText(issue, field) {
  if (state.locale === "hi" && issue.hi && issue.hi[field]) return issue.hi[field];
  return issue[field];
}

const iconPaths = {
  upload: "M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5",
  file: "M7 3h7l4 4v14H7zM14 3v5h5M9 13h6M9 17h6",
  map: "M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  search: "m20 20-4.5-4.5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  shield: "M12 3 5 6v5c0 4.7 2.9 8.1 7 10 4.1-1.9 7-5.3 7-10V6zM9 12l2 2 4-5",
  calendar: "M5 5h14v15H5zM8 3v4m8-4v4M5 9h14M8 13h3",
  percent: "M7 17 17 7M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  scale: "M12 3v18M7 6h10M5 6 2 13h6L5 6Zm14 0-3 7h6l-3-7ZM8 21h8",
  check: "m5 12 4 4L19 6",
  book: "M4 5c3-1 5 0 8 2v14c-3-2-5-3-8-2zm16 0c-3-1-5 0-8 2v14c3-2 5-3 8-2z",
  copy: "M9 9h11v12H9zM4 3h11v6M4 3v12h5",
  send: "m21 3-7 18-4-8-8-4zM10 13 21 3",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 19h16",
  trash: "M5 7h14M9 7V4h6v3m-8 0 1 14h8l1-14",
  edit: "m4 20 4-1 11-11-3-3L5 16zM14 6l3 3",
  close: "M5 5l14 14M19 5 5 19",
  lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3",
  alert: "M12 4 3 20h18zm0 6v4m0 3v.1",
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[name]}"/></svg>`;
}

const copy = {
  en: {
    homeEyebrow: "CHECK TODAY. SIGN TOMORROW WITH CONFIDENCE.",
    homeTitle: "Your Home Agreement Deserves a Second Look.",
    homeBody: "Upload your builder-buyer agreement and get a clear verdict with the top 3 issues to question — before you sign.",
    begin: "Use synthetic sample",
    noUpload: "Demo only — no real file is uploaded in this demo",
    setupTitle: "Where is your project located?",
    setupBody: "We use your project location to apply the right RERA rules and state-specific laws.",
    continue: "Continue to review",
    readingTitle: "We’re Reading Your Agreement",
    readingBody: "This demo walks through the four stages a real pipeline would follow. No file is being analysed here.",
    result: "View synthetic result",
    verdictTitle: "Ask 3 things before you sign.",
    verdictStatus: "Proceed with Caution",
    next: "Send questions to builder",
    actionsTitle: "Here are your next steps.",
    actionsBody: "Your sample document has been reviewed. You can now use the questions below or share, download, or save this report.",
  },
  hi: {
    homeEyebrow: "आज जाँचें, कल आत्मविश्वास से हस्ताक्षर करें।",
    homeTitle: "आपके घर के एग्रीमेंट को दोबारा देखना ज़रूरी है।",
    homeBody: "अपना बिल्डर-बायर एग्रीमेंट अपलोड करें और हस्ताक्षर से पहले स्पष्ट नतीजा और पूछने लायक शीर्ष 3 मुद्दे पाएँ।",
    begin: "काल्पनिक नमूना इस्तेमाल करें",
    noUpload: "केवल डेमो — इस डेमो में असली फ़ाइल अपलोड नहीं होती",
    setupTitle: "आपका प्रोजेक्ट कहाँ स्थित है?",
    setupBody: "हम आपके प्रोजेक्ट के स्थान के अनुसार सही RERA नियम और राज्य-विशिष्ट कानून लागू करते हैं।",
    continue: "समीक्षा जारी रखें",
    readingTitle: "हम आपका एग्रीमेंट पढ़ रहे हैं",
    readingBody: "यह डेमो उन चार चरणों को दिखाता है जिनसे एक असली प्रक्रिया गुज़रेगी। यहाँ किसी फ़ाइल का विश्लेषण नहीं हो रहा है।",
    result: "काल्पनिक नतीजा देखें",
    verdictTitle: "हस्ताक्षर से पहले 3 सवाल पूछें।",
    verdictStatus: "सावधानी से आगे बढ़ें",
    next: "बिल्डर को सवाल भेजें",
    actionsTitle: "अब आपके अगले कदम।",
    actionsBody: "आपका नमूना दस्तावेज़ समीक्षित हो गया है। अब आप नीचे दिए सवालों का उपयोग कर सकते हैं या इस रिपोर्ट को साझा, डाउनलोड या सहेज सकते हैं।",
  }
};

function t(key) { return copy[state.locale][key]; }

function routeTo(route) {
  state.route = route;
  location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelector("#app")?.focus({ preventScroll: true });
}

function progress(active) {
  const items = [["file","Sample"],["map","State"],["search","Reading"],["check","Verdict"]];
  return `<ol class="progress" aria-label="Demo progress">${items.map((item, i) => `<li class="${i + 1 < active ? "done" : i + 1 === active ? "active" : ""}"><span>${i + 1 < active ? icon("check") : i + 1}</span><b>${item[1]}</b></li>`).join("")}</ol>`;
}

function privacyBand() {
  return `<section class="privacy-band">${icon("shield")}<div><strong>Private because it is synthetic</strong><p>No personal document is accepted, transmitted or stored by this demo.</p></div><ul><li>${icon("lock")} No account</li><li>${icon("file")} Fixture only</li><li>${icon("shield")} No analysis API</li></ul></section>`;
}

function homeView() {
  return `
    <section class="hero-screen">
      <div class="toran" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="hero-copy">
        <p class="eyebrow">${t("homeEyebrow")}</p>
        <h1>${t("homeTitle")}</h1>
        <p class="lede">${t("homeBody")}</p>
        <div class="upload-card">
          <span class="upload-card-icon">${icon("file")}</span>
          <div><strong>Upload Your Agreement (PDF)</strong><p>Drag &amp; drop your file here, or click to browse</p></div>
          <button class="button" data-route="setup">${t("begin")}</button>
          <small>Demo only · No file is uploaded · In production: PDF up to 20 MB</small>
        </div>
        <p class="safety-note">${icon("shield")} ${t("noUpload")}. Please do not submit personal documents.</p>
      </div>
      <div class="hero-visual" role="img" aria-label="Residential apartments at sunset">
        <p class="hand-note">Because<br>a safer home<br>begins before<br>you sign.</p>
        <small>Photo: Ravi Sharma / Unsplash</small>
      </div>
    </section>
    <section class="three-steps" aria-label="How the demo works">
      <article><span>1</span>${icon("upload")}<div><strong>Upload Agreement</strong><p>Share your builder-buyer agreement (PDF).</p></div></article>
      <article><span>2</span>${icon("search")}<div><strong>We Check Clauses</strong><p>See checked clauses with source-linked concerns.</p></div></article>
      <article><span>3</span>${icon("file")}<div><strong>Get Your Verdict</strong><p>One clear verdict and up to 3 top issues to question before you sign.</p></div></article>
    </section>
    <section class="home-report">
      <div><p class="eyebrow">SAMPLE REPORT</p><h2>A clear answer.<br>Only what matters.</h2><p>No legal jargon. Just a simple verdict and the top 3 issues you should question before signing.</p><button class="text-button" data-route="verdict">View Full Sample Report <span>→</span></button></div>
      <div class="home-sample-card">
        <p class="eyebrow">OVERALL VERDICT</p>
        <div class="home-verdict-row"><div class="verdict-ring amber">!</div><div><strong>${t("verdictStatus")}</strong><p>This agreement has a few concerning clauses that may impact your rights. Review the top issues below and consider discussing them with the builder before signing.</p></div></div>
        <p class="eyebrow">TOP 3 ISSUES TO QUESTION</p>
        <div class="sample-issues">${issues.map((issue,i) => `<button class="sample-issue" data-issue="${i}"><span class="sample-issue-icon">${icon(issue.icon)}</span><span><strong>${issueText(issue,"title")}</strong></span><span>→</span></button>`).join("")}</div>
      </div>
    </section>
    ${privacyBand()}`;
}

function stateListHTML(filter = "") {
  const q = filter.toLowerCase();
  const list = states.filter(name => !q || name.toLowerCase().includes(q));
  if (!list.length) return `<p class="state-empty">No state or UT matches that search.</p>`;
  return list.map(name => `<button type="button" class="state-item ${name === state.jurisdiction ? "selected" : ""}" data-state="${name}"><span>${name}</span>${name === state.jurisdiction ? "<b>✓</b>" : ""}</button>`).join("");
}

function setupView() {
  return `
    <div class="screen-shell">
      ${progress(2)}
      <header class="screen-heading"><p class="eyebrow">STEP 2 OF 4 · SYNTHETIC DEMO</p><h1>${t("setupTitle")}</h1><p>${t("setupBody")}</p></header>
      <div class="setup-grid">
        <section class="panel document-panel">
          <div class="number-title"><span>1</span><div><h2>Your Agreement (Uploaded)</h2><p>You can upload a PDF or clear photos from your phone.</p></div></div>
          <div class="upload-card small">
            <span class="upload-card-icon">${icon("file")}</span>
            <div><strong>Upload Your Agreement</strong><p>Drag &amp; drop a PDF here, or click to browse</p></div>
            <button class="button" data-route="reading">Use sample file</button>
            <small>Demo only · Sample file used · PDF, JPG, PNG up to 20 MB in production</small>
          </div>
          <p class="uploaded-label">Uploaded Files (4 pages) <button class="text-button" data-action="clear-pages">Clear all</button></p>
          <div class="page-thumbnails" aria-label="Sample document pages">${state.pagesCleared ? `<p class="state-empty">No pages in this demo. <button class="text-button" data-action="restore-pages">Restore sample pages</button></p>` : [1,2,3,4].map(n => `<div><div class="paper"><i></i><i></i><i></i><i></i><i></i></div><small>Page ${n}</small></div>`).join("")}</div>
          <p class="info-note">${icon("shield")} Real document upload will require a secure processing service and explicit consent.</p>
        </section>
        <section class="panel location-panel">
          <div class="number-title"><span>2</span><div><h2>Project location</h2><p>Select the state or union territory where your project is located.</p></div></div>
          <label for="state-search">Search state or union territory…</label>
          <div class="search-wrap">${icon("search")}<input id="state-search" type="search" placeholder="Search state or union territory…" autocomplete="off" /></div>
          <div class="state-list" id="state-list" role="listbox" aria-label="States and union territories">${stateListHTML()}</div>
          <p class="info-note">${icon("map")} We use your project location to apply the right RERA rules.</p>
          <div class="coverage-card ${state.jurisdiction === "Uttarakhand" ? "" : "warning"}">${icon("book")}<div><strong id="coverage-title">${state.jurisdiction === "Uttarakhand" ? "Limited demo coverage" : "Review incomplete"}</strong><p id="coverage-copy">${state.jurisdiction === "Uttarakhand" ? "Uttarakhand fixture rules only. Candidate rules are not legally reviewed." : `No local demo rules are represented for ${state.jurisdiction}. A production result must remain incomplete.`}</p></div></div>
          <button class="button button-wide" data-route="reading">${t("continue")} <span>→</span></button>
        </section>
      </div>
      <section class="setup-strip"><div><strong>Uttarakhand demo coverage</strong><p>One state in this demo</p></div><div><strong>State-specific RERA rules</strong><p>Applied automatically in production</p></div><div><strong>Private by demo</strong><p>No document is stored</p></div><div><strong>Synthetic only</strong><p>Not a legal opinion</p></div></section>
    </div>`;
}

function readingView() {
  const steps = [
    ["file","Reading file","Extracting text from your agreement…"],
    ["search","Splitting clauses","Identifying and organising key clauses."],
    ["book","Checking rules","Demo rules are being reviewed."],
    ["check","Preparing report","Creating your clear verdict and insights."]
  ];
  return `
    <div class="screen-shell">
      ${progress(3)}
      <header class="reading-hero"><div><p class="eyebrow">YOUR AGREEMENT IS BEING CHECKED</p><h1>${t("readingTitle")}</h1><p>${t("readingBody")}</p></div><p class="hand-note">A safer home<br>begins with<br>clear information.</p></header>
      <section class="pipeline panel">${steps.map((item,i) => `<article class="${i === 0 ? "active" : ""}"><span>${icon(item[0])}</span><b>${i+1}. ${item[1]}</b><p>${item[2]}</p></article>`).join("")}</section>
      <div class="demo-progress"><div class="demo-progress-bar"><span style="width:35%"></span></div><strong>35%</strong><small>Illustrative demo progress — not a real job status. Production progress must come from backend job states.</small></div>
      <section class="honest-state">${icon("alert")}<div><strong>Demo walkthrough</strong><p>This walkthrough advances only when you choose to view the fixture result.</p></div><button class="button" data-route="verdict">${t("result")} <span>→</span></button></section>
      <section class="retake-demo panel"><div>${icon("alert")}<div><strong>2 pages need clearer photos</strong><p>Some pages are a bit blurry. Please retake them for the best results.</p><div class="retake-pages"><div><div class="paper retake"><b>!</b></div><small>Page 4</small></div><div><div class="paper retake"><b>!</b></div><small>Page 7</small></div></div></div></div><button class="button" data-action="retake-demo">Retake weak pages</button></section>
      ${privacyBand()}
    </div>`;
}

function verdictSummary(compact = false) {
  return `<div class="verdict-summary ${compact ? "compact" : ""}">
    <div class="verdict-ring amber">!</div>
    <div><small>OVERALL VERDICT</small><h3>${t("verdictTitle")}</h3><p>This agreement has a few concerning clauses that may impact your rights. Review the top 3 issues below and ask these questions to the builder before signing.</p></div>
    ${compact ? "" : `<aside><strong>Coverage</strong><span>12 of 15 demo checks represented</span><small>3 checks not represented · candidate rule set · ${state.jurisdiction !== "Uttarakhand" ? "REVIEW INCOMPLETE for this location" : "Uttarakhand fixture only"}</small></aside>`}
  </div>`;
}

function issueCards() {
  return issues.map((issue, i) => `<button class="issue-card" data-issue="${i}" aria-label="Open evidence for ${issueText(issue,"title")}">
    <div class="issue-top"><span class="issue-icon">${icon(issue.icon)}</span><span class="risk ${i === 0 ? "high" : ""}">${issue.level}</span><b>→</b></div>
    <h3>${issueText(issue,"title")}</h3><p>${issueText(issue,"short")}</p><small>${issue.clause}</small>
  </button>`).join("");
}

function verdictView() {
  return `
    <div class="screen-shell verdict-screen">
      ${progress(4)}
      <button class="text-button" data-route="setup">← Back to upload</button>
      <div class="report-file">${icon("file")}<div><strong>Your Home Agreement (PDF)</strong><small>Synthetic fixture · ${state.jurisdiction} · Demo, not a real analysis</small></div><span class="status-pill">DEMO</span></div>
      <div class="verdict-layout">
        ${verdictSummary()}
        <aside class="what-means panel"><h3>What this means</h3><ul><li>The agreement is not a red flag, but has important risks you should address.</li><li>These issues are common in many builder agreements.</li><li>Ask clear questions and get written replies before you sign.</li></ul></aside>
      </div>
      <section class="issues-section"><div class="section-title"><div><p class="eyebrow">TOP 3 ISSUES TO ASK ABOUT</p><h2>Top 3 issues to ask about</h2><p>These are the most important clauses in your agreement. Tap to see simple explanations and suggested questions.</p></div></div><div class="issue-grid">${issueCards()}</div>
        <div class="report-actions"><button class="text-button" data-modal="checks">${icon("book")} See all checks (12) →</button><button class="button" data-route="actions">${t("next")} <span>→</span></button></div>
      </section>
      ${privacyBand()}
    </div>`;
}

function actionsView() {
  return `
    <div class="screen-shell">
      <header class="actions-hero"><div><p class="eyebrow">REVIEW COMPLETE</p><h1>${t("actionsTitle")}</h1><p>${t("actionsBody")} Demo only — no agreement data is present.</p></div><span>${icon("check")}</span></header>
      <section class="action-grid">
        <button class="action-card" data-action="copy">${icon("copy")}<strong>Copy questions</strong><p>Copy all 3 key questions to your clipboard.</p><span>Copy Questions</span></button>
        <button class="action-card whatsapp" data-action="whatsapp">${icon("send")}<strong>Send on WhatsApp</strong><p>Share the questions with your builder, family or anyone you trust.</p><span>Send on WhatsApp</span></button>
        <button class="action-card" data-action="print">${icon("download")}<strong>Download one-page PDF</strong><p>Get a clean, easy-to-read PDF with your top 3 questions.</p><span>Download PDF</span></button>
        <button class="action-card danger" data-action="delete">${icon("trash")}<strong>Delete my document</strong><p>Remove your document and report instantly from our system.</p><span>Delete Now</span></button>
      </section>
      <div class="actions-layout">
        <section class="panel question-list">
          <div class="section-title inline"><div><p class="eyebrow">YOUR 3 QUESTIONS (EDITABLE)</p><h2>Your 3 Questions</h2><p>You can edit the questions below before sharing or downloading.</p></div><button class="text-button" data-action="edit">${icon("edit")} ${state.questionEdits ? "Save" : "Edit"}</button></div>
          ${issues.map((issue,i) => `<div class="question-row"><span>${i+1}</span><div><strong>${issueText(issue,"title")}</strong>${state.questionEdits ? `<textarea aria-label="Edit question ${i+1}">${issueText(issue,"question")}</textarea>` : `<p>${issueText(issue,"question")}</p>`}</div></div>`).join("")}
        </section>
        <aside class="scope-card">${icon("shield")}<div><h2>Your privacy matters.</h2><p>Your document is encrypted, never shared, and automatically deleted when you choose. In this demo there is nothing to delete from a server because no document is uploaded. Reset removes local display choices only. No saved report is offered in this demo — a production save would need secure storage and a 30-day deletion policy.</p><button class="outline-button" data-action="delete">${icon("trash")} Delete My Document Now</button></div></aside>
      </div>
    </div>`;
}

function openIssue(index) {
  const issue = issues[index];
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-close-dialog></div><section class="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
    <div class="drawer-handle"></div><button class="close-button" data-close-dialog aria-label="Close evidence">${icon("close")}</button>
    <div class="drawer-label">${icon(issue.icon)}<span>${issue.clause}</span><b class="risk ${index === 0 ? "high" : ""}">${issue.level}</b></div>
    <h2 id="evidence-title">${issueText(issue,"title")}</h2>
    <section class="evidence-block"><h3>${icon("file")} Your Clause (from your agreement)</h3><blockquote>“${issue.quote}”</blockquote></section>
    <section class="evidence-block"><h3>${icon("search")} In simple words</h3><p>${issueText(issue,"simple")}</p></section>
    <section class="evidence-block"><h3>${icon("book")} Relevant rule / provision</h3><p>${issue.source}</p></section>
    <section class="evidence-block question"><h3>${icon("send")} What to ask the builder</h3><p>${issueText(issue,"question")}</p><button class="outline-button" data-copy-one="${index}">${icon("copy")} Copy sample question</button></section>
    <p class="drawer-disclaimer">Synthetic fixture only · Not legal advice · No rule has been legally approved for release.</p>
  </section>`;
  document.body.classList.add("dialog-open");
  document.querySelector(".close-button").focus();
}

function openInfo(type) {
  const info = {
    privacy: ["Privacy in this demo","No personal file input is provided. The demo stores only your language choice in this browser. No document text is transmitted."],
    scope: ["What works here","Navigation, state selection, evidence drawers, copy, editable sample questions, print and reset are interactive. OCR, analysis, legal review, server deletion and report generation are not connected."],
    disclaimer: ["Important disclaimer","All agreements, clauses, findings and questions shown are synthetic illustrations. Nothing here is a legal opinion or a recommendation to sign."],
    checks: ["Demo coverage","Twelve illustrative check categories are represented. Three are intentionally marked unrepresented to demonstrate an incomplete rule catalog. Production release requires versioned rules and qualified legal review."],
  }[type];
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-close-dialog></div><section class="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title"><button class="close-button" data-close-dialog aria-label="Close">${icon("close")}</button><p class="eyebrow">SIGN SE PEHLE DEMO</p><h2 id="info-title">${info[0]}</h2><p>${info[1]}</p><button class="button" data-close-dialog>Understood</button></section>`;
  document.body.classList.add("dialog-open");
  document.querySelector(".close-button").focus();
}

function closeDialog() {
  dialogRoot.innerHTML = "";
  document.body.classList.remove("dialog-open");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setJurisdiction(name) {
  state.jurisdiction = name;
  const supported = name === "Uttarakhand";
  document.querySelectorAll(".state-item").forEach(el => {
    const on = el.dataset.state === name;
    el.classList.toggle("selected", on);
    el.innerHTML = `<span>${el.dataset.state}</span>${on ? "<b>✓</b>" : ""}`;
  });
  const title = document.querySelector("#coverage-title");
  const copyEl = document.querySelector("#coverage-copy");
  const card = document.querySelector(".coverage-card");
  if (title) title.textContent = supported ? "Limited demo coverage" : "Review incomplete";
  if (copyEl) copyEl.textContent = supported ? "Uttarakhand fixture rules only. Candidate rules are not legally reviewed." : `No local demo rules are represented for ${name}. A production result must remain incomplete.`;
  if (card) card.classList.toggle("warning", !supported);
}

function render() {
  const views = { home: homeView, setup: setupView, reading: readingView, verdict: verdictView, actions: actionsView };
  app.innerHTML = (views[state.route] || homeView)();
  document.documentElement.lang = state.locale === "hi" ? "hi" : "en";
  document.querySelector("#locale-toggle").setAttribute("aria-pressed", state.locale === "hi");
  document.querySelectorAll("[data-route]").forEach(el => el.classList.toggle("current", el.dataset.route === state.route));
}

document.addEventListener("click", async (event) => {
  const route = event.target.closest("[data-route]")?.dataset.route;
  if (route) {
    document.querySelector("#mobile-nav").hidden = true;
    document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
    routeTo(route);
    return;
  }
  const issue = event.target.closest("[data-issue]")?.dataset.issue;
  if (issue !== undefined) { openIssue(Number(issue)); return; }
  const modal = event.target.closest("[data-modal]")?.dataset.modal;
  if (modal) { openInfo(modal); return; }
  if (event.target.closest("[data-close-dialog]")) { closeDialog(); return; }
  const copyOne = event.target.closest("[data-copy-one]")?.dataset.copyOne;
  if (copyOne !== undefined) {
    await navigator.clipboard.writeText(issueText(issues[Number(copyOne)],"question"));
    showToast("Synthetic question copied.");
    return;
  }
  const stateBtn = event.target.closest("[data-state]")?.dataset.state;
  if (stateBtn) { setJurisdiction(stateBtn); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "clear-pages") { state.pagesCleared = true; render(); showToast("Sample pages hidden in this demo."); return; }
  if (action === "restore-pages") { state.pagesCleared = false; render(); showToast("Sample pages restored."); return; }
  if (action === "retake-demo") { showToast("Retake is illustrated only in this demo — no file is uploaded."); return; }
  if (action === "copy") {
    await navigator.clipboard.writeText(issues.map((issue,i) => `${i+1}. ${issueText(issue,"question")}`).join("\n\n"));
    showToast("Three synthetic questions copied.");
  } else if (action === "whatsapp") {
    const text = encodeURIComponent(`Synthetic demo questions — not legal advice:\n\n${issues.map((issue,i) => `${i+1}. ${issueText(issue,"question")}`).join("\n\n")}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  } else if (action === "print") {
    window.print();
  } else if (action === "delete") {
    localStorage.removeItem("ssp-locale");
    state.locale = "en"; state.jurisdiction = "Uttarakhand"; state.questionEdits = false;
    showToast("Local demo choices reset.");
    setTimeout(() => routeTo("home"), 400);
  } else if (action === "edit") {
    state.questionEdits = !state.questionEdits;
    render();
    showToast(state.questionEdits ? "Editing enabled for this view." : "Sample edits kept only on this screen.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "state-search") return;
  const list = document.querySelector("#state-list");
  if (list) list.innerHTML = stateListHTML(event.target.value);
});

document.querySelector("#locale-toggle").addEventListener("click", () => {
  state.locale = state.locale === "en" ? "hi" : "en";
  localStorage.setItem("ssp-locale", state.locale);
  render();
  showToast(state.locale === "hi" ? "हिंदी चुनी गई" : "English selected");
});

document.querySelector("#menu-button").addEventListener("click", (event) => {
  const nav = document.querySelector("#mobile-nav");
  nav.hidden = !nav.hidden;
  event.currentTarget.setAttribute("aria-expanded", String(!nav.hidden));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialogRoot.innerHTML) closeDialog();
});
window.addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (route && route !== state.route) { state.route = route; render(); }
});

render();
