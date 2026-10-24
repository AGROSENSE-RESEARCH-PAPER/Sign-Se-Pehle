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
    icon: "calendar", level: "Higher priority", title: "Possession date may move by 18 months",
    short: "The synthetic clause gives a long extension window before compensation.",
    clause: "Clause 7.3 · page 9",
    quote: "The Promoter may extend the Possession Date by a grace period of up to eighteen months where completion is delayed.",
    simple: "This wording gives the promoter a long extension window. Ask which events can trigger it and whether compensation still applies.",
    source: "Synthetic demo rule UK-POSS-03 · based on RERA sections 13 and 18 · not legally reviewed",
    question: "Please confirm the binding possession date, every allowed extension, and the compensation due for delay."
  },
  {
    icon: "percent", level: "Review priority", title: "Buyer late interest is 24%",
    short: "The sample buyer rate is high and no matching promoter rate is stated.",
    clause: "Clause 10.2 · page 12",
    quote: "Any delayed payment by the Allottee shall attract interest at the rate of twenty-four percent per annum.",
    simple: "The sample sets a 24% buyer rate but does not show an equivalent rate for promoter delay.",
    source: "Synthetic demo rule UK-INT-01 · candidate reference: Uttarakhand Rule 15 · legal review pending",
    question: "Please explain how both buyer and promoter delay rates were set, and confirm whether they are equal."
  },
  {
    icon: "scale", level: "Review priority", title: "Plan changes need clarification",
    short: "The synthetic agreement permits some changes without defining their limits.",
    clause: "Clause 12.1 · page 15",
    quote: "The Promoter may make such minor additions or alterations to the plans as may be necessary.",
    simple: "The phrase “minor alterations” is not defined in this sample. Ask what requires your written consent.",
    source: "Synthetic demo rule UK-PLAN-05 · candidate reference: RERA section 14 · legal review pending",
    question: "Please list which plan changes can be made without my written consent and how I will be notified."
  }
];

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
    homeEyebrow: "UNDERSTAND BEFORE YOU SIGN",
    homeTitle: "Your home agreement deserves a second look.",
    homeBody: "Walk through a synthetic builder-buyer agreement and see how three evidence-backed questions could be presented.",
    begin: "Try the synthetic demo",
    noUpload: "No real uploads in this demo",
    setupTitle: "Where is the sample project located?",
    setupBody: "Project location determines which local rules could apply. This demo defaults to Uttarakhand.",
    continue: "Continue demo",
    readingTitle: "We’re reading the sample agreement",
    readingBody: "These are illustrative processing stages. No AI, OCR or legal expert is running in this demo.",
    result: "View synthetic result",
    verdictTitle: "Ask 3 things before you sign.",
    next: "Prepare your questions",
    actionsTitle: "Here are your next steps.",
  },
  hi: {
    homeEyebrow: "हस्ताक्षर से पहले समझें",
    homeTitle: "आपके घर के एग्रीमेंट को दोबारा देखना ज़रूरी है।",
    homeBody: "एक काल्पनिक बिल्डर-बायर एग्रीमेंट देखें और जानें कि प्रमाण के साथ तीन सवाल कैसे दिखाए जा सकते हैं।",
    begin: "काल्पनिक डेमो देखें",
    noUpload: "इस डेमो में असली फ़ाइल अपलोड नहीं होती",
    setupTitle: "नमूना प्रोजेक्ट कहाँ स्थित है?",
    setupBody: "प्रोजेक्ट का स्थान तय करता है कि कौन से स्थानीय नियम लागू हो सकते हैं। यह डेमो उत्तराखंड पर आधारित है।",
    continue: "डेमो जारी रखें",
    readingTitle: "हम नमूना एग्रीमेंट पढ़ रहे हैं",
    readingBody: "ये केवल उदाहरणात्मक चरण हैं। इस डेमो में AI, OCR या कानूनी विशेषज्ञ काम नहीं कर रहे हैं।",
    result: "काल्पनिक नतीजा देखें",
    verdictTitle: "हस्ताक्षर से पहले 3 सवाल पूछें।",
    next: "अपने सवाल तैयार करें",
    actionsTitle: "अब आपके अगले कदम।",
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
        <div class="demo-card">
          <span class="demo-card-icon">${icon("file")}</span>
          <div><strong>Synthetic home agreement</strong><p>18 pages · Uttarakhand · English</p></div>
          <button class="button" data-route="setup">${t("begin")}</button>
        </div>
        <p class="safety-note">${icon("shield")} ${t("noUpload")}. Please do not submit personal documents.</p>
      </div>
      <div class="hero-visual" role="img" aria-label="Residential apartments at sunset">
        <p class="hand-note">Clear questions.<br>Calmer decisions.</p>
        <small>Photo: Ravi Sharma / Unsplash</small>
      </div>
    </section>
    <section class="three-steps" aria-label="How the demo works">
      <article><span>1</span>${icon("file")}<div><strong>Open the sample</strong><p>Use a clearly synthetic agreement.</p></div></article>
      <article><span>2</span>${icon("search")}<div><strong>See checked clauses</strong><p>Review illustrative, source-linked concerns.</p></div></article>
      <article><span>3</span>${icon("check")}<div><strong>Prepare questions</strong><p>Edit the three questions before sharing.</p></div></article>
    </section>
    <section class="home-report">
      <div><p class="eyebrow">SYNTHETIC SAMPLE REPORT</p><h2>One clear answer.<br>Only what matters.</h2><p>A single qualified outcome, three priorities, and evidence behind every example.</p><button class="text-button" data-route="verdict">Explore the sample report <span>→</span></button></div>
      ${verdictSummary(true)}
    </section>
    ${privacyBand()}`;
}

function setupView() {
  return `
    <div class="screen-shell">
      ${progress(2)}
      <header class="screen-heading"><p class="eyebrow">STEP 2 OF 4 · SYNTHETIC DEMO</p><h1>${t("setupTitle")}</h1><p>${t("setupBody")}</p></header>
      <div class="setup-grid">
        <section class="panel document-panel">
          <div class="number-title"><span>1</span><div><h2>Sample agreement</h2><p>No personal upload is available in this prototype.</p></div></div>
          <div class="fixture-file">${icon("file")}<div><strong>Sample_Agreement_UK.pdf</strong><small>Synthetic fixture · 18 pages</small></div><span class="status-pill success">Ready</span></div>
          <div class="page-thumbnails" aria-label="Sample document pages">${[1,2,3,4].map(n => `<div><div class="paper"><i></i><i></i><i></i><i></i><i></i></div><small>Page ${n}</small></div>`).join("")}</div>
          <p class="info-note">${icon("shield")} Real document upload will require a secure processing service and explicit consent.</p>
        </section>
        <section class="panel location-panel">
          <div class="number-title"><span>2</span><div><h2>Project location</h2><p>Select where the property project is located.</p></div></div>
          <label for="state-select">State or Union Territory</label>
          <div class="select-wrap">${icon("map")}<select id="state-select">${states.map(name => `<option ${name === state.jurisdiction ? "selected" : ""}>${name}</option>`).join("")}</select></div>
          <div class="coverage-card">${icon("book")}<div><strong id="coverage-title">Limited demo coverage</strong><p id="coverage-copy">Uttarakhand fixture rules only. Candidate rules are not legally reviewed.</p></div></div>
          <button class="button button-wide" data-route="reading">${t("continue")} <span>→</span></button>
        </section>
      </div>
    </div>`;
}

function readingView() {
  const steps = [
    ["file","Reading file","Using fixture text, not OCR"],
    ["search","Splitting clauses","Using pre-written sample sections"],
    ["book","Checking demo rules","Candidate rules, not legal review"],
    ["check","Preparing report","Building the synthetic result"]
  ];
  return `
    <div class="screen-shell">
      ${progress(3)}
      <header class="reading-hero"><div><p class="eyebrow">SYNTHETIC PROCESSING WALKTHROUGH</p><h1>${t("readingTitle")}</h1><p>${t("readingBody")}</p></div><p class="hand-note">A transparent demo<br>builds more trust.</p></header>
      <section class="pipeline panel">${steps.map((item,i) => `<article><span>${icon(item[0])}</span><b>${i+1}. ${item[1]}</b><p>${item[2]}</p></article>`).join("")}</section>
      <section class="honest-state">${icon("alert")}<div><strong>No simulated percentage</strong><p>The production experience must use real backend job states. This walkthrough advances only when you choose to view the fixture result.</p></div><button class="button" data-route="verdict">${t("result")} <span>→</span></button></section>
      <section class="retake-demo panel"><div>${icon("search")}<div><strong>How a low-quality page would work</strong><p>A real pipeline would name unreadable pages and block the verdict until they are replaced.</p></div></div><span class="status-pill">Demonstration only</span></section>
      ${privacyBand()}
    </div>`;
}

function verdictSummary(compact = false) {
  return `<div class="verdict-summary ${compact ? "compact" : ""}">
    <div class="verdict-ring">!</div>
    <div><small>ILLUSTRATIVE OUTCOME</small><h3>${t("verdictTitle")}</h3><p>Three sample clauses deserve a closer question. This is not a legal conclusion.</p></div>
    ${compact ? "" : `<aside><strong>Coverage</strong><span>12 of 15 demo checks represented</span><small>3 checks not represented · candidate rule set</small></aside>`}
  </div>`;
}

function issueCards() {
  return issues.map((issue, i) => `<button class="issue-card" data-issue="${i}" aria-label="Open evidence for ${issue.title}">
    <div class="issue-top"><span class="issue-icon">${icon(issue.icon)}</span><span class="risk ${i === 0 ? "high" : ""}">${issue.level}</span><b>→</b></div>
    <h3>${issue.title}</h3><p>${issue.short}</p><small>${issue.clause}</small>
  </button>`).join("");
}

function verdictView() {
  return `
    <div class="screen-shell verdict-screen">
      ${progress(4)}
      <div class="report-file">${icon("file")}<div><strong>Sample home agreement</strong><small>Synthetic fixture · ${state.jurisdiction}</small></div><span class="status-pill">DEMO</span></div>
      ${verdictSummary()}
      <section class="issues-section"><div class="section-title"><div><p class="eyebrow">TOP PRIORITIES</p><h2>Three issues to ask about</h2><p>Open each card to see the exact synthetic clause and candidate source.</p></div></div><div class="issue-grid">${issueCards()}</div>
        <div class="report-actions"><button class="text-button" data-modal="checks">${icon("book")} See all demo checks</button><button class="button" data-route="actions">${t("next")} <span>→</span></button></div>
      </section>
      ${privacyBand()}
    </div>`;
}

function actionsView() {
  return `
    <div class="screen-shell">
      <header class="actions-hero"><div><p class="eyebrow">REVIEW WALKTHROUGH COMPLETE</p><h1>${t("actionsTitle")}</h1><p>Use these synthetic questions to test copy, editing and sharing patterns. No agreement data is present.</p></div><span>${icon("check")}</span></header>
      <section class="action-grid">
        <button class="action-card" data-action="copy">${icon("copy")}<strong>Copy questions</strong><p>Copy all three synthetic questions.</p><span>Copy now</span></button>
        <button class="action-card whatsapp" data-action="whatsapp">${icon("send")}<strong>Preview WhatsApp share</strong><p>Open a user-initiated draft with sample text.</p><span>Open draft</span></button>
        <button class="action-card" data-action="print">${icon("download")}<strong>Print sample report</strong><p>Use your browser to save a local PDF.</p><span>Print / save PDF</span></button>
        <button class="action-card danger" data-action="delete">${icon("trash")}<strong>Reset demo session</strong><p>Clear local demo choices and return home.</p><span>Reset now</span></button>
      </section>
      <div class="actions-layout">
        <section class="panel question-list">
          <div class="section-title inline"><div><p class="eyebrow">YOUR 3 QUESTIONS</p><h2>Synthetic builder questions</h2></div><button class="text-button" data-action="edit">${icon("edit")} ${state.questionEdits ? "Save" : "Edit"}</button></div>
          ${issues.map((issue,i) => `<div class="question-row"><span>${i+1}</span><div><strong>${issue.title}</strong>${state.questionEdits ? `<textarea aria-label="Edit question ${i+1}">${issue.question}</textarea>` : `<p>${issue.question}</p>`}</div></div>`).join("")}
        </section>
        <aside class="scope-card">${icon("shield")}<div><h2>Your privacy in this demo</h2><p>There is nothing to delete from a server because no document or report is uploaded. Reset removes local display choices only.</p><button class="outline-button" data-action="delete">${icon("trash")} Reset demo</button></div></aside>
      </div>
    </div>`;
}

function openIssue(index) {
  const issue = issues[index];
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-close-dialog></div><section class="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
    <div class="drawer-handle"></div><button class="close-button" data-close-dialog aria-label="Close evidence">${icon("close")}</button>
    <div class="drawer-label">${icon(issue.icon)}<span>${issue.clause}</span><b class="risk ${index === 0 ? "high" : ""}">${issue.level}</b></div>
    <h2 id="evidence-title">${issue.title}</h2>
    <section class="evidence-block"><h3>${icon("file")} Synthetic clause</h3><blockquote>“${issue.quote}”</blockquote></section>
    <section class="evidence-block"><h3>${icon("search")} In simple words</h3><p>${issue.simple}</p></section>
    <section class="evidence-block"><h3>${icon("book")} Candidate rule / provision</h3><p>${issue.source}</p></section>
    <section class="evidence-block question"><h3>${icon("send")} What to ask the builder</h3><p>${issue.question}</p><button class="outline-button" data-copy-one="${index}">${icon("copy")} Copy sample question</button></section>
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
    await navigator.clipboard.writeText(issues[Number(copyOne)].question);
    showToast("Synthetic question copied.");
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "copy") {
    await navigator.clipboard.writeText(issues.map((issue,i) => `${i+1}. ${issue.question}`).join("\n\n"));
    showToast("Three synthetic questions copied.");
  } else if (action === "whatsapp") {
    const text = encodeURIComponent(`Synthetic demo questions — not legal advice:\n\n${issues.map((issue,i) => `${i+1}. ${issue.question}`).join("\n\n")}`);
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

document.addEventListener("change", (event) => {
  if (event.target.id !== "state-select") return;
  state.jurisdiction = event.target.value;
  const supported = state.jurisdiction === "Uttarakhand";
  document.querySelector("#coverage-title").textContent = supported ? "Limited demo coverage" : "Review incomplete";
  document.querySelector("#coverage-copy").textContent = supported ? "Uttarakhand fixture rules only. Candidate rules are not legally reviewed." : `No local demo rules are represented for ${state.jurisdiction}. A production result must remain incomplete.`;
  document.querySelector(".coverage-card").classList.toggle("warning", !supported);
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
