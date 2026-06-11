function esc(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Executive letter-style HTML for PoC plans (classes styled in client index.css). */
export function buildPocLetterHtml(opts) {
    const { companyName, industryName = 'your industry', contactName, content, preparedBy = 'Assessment ai · AI Readiness Team', date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), } = opts;
    const salutation = contactName ? `Dear ${esc(contactName)},` : 'Dear Executive Team,';
    const objectives = content.objectives.map((o) => `<li>${esc(o)}</li>`).join('');
    const timeline = content.timeline
        .map((t) => `<tr><td class="letter-td-phase">${esc(t.phase)}</td><td>${esc(t.activity)}</td></tr>`)
        .join('');
    const metrics = content.success_metrics.map((m) => `<li>${esc(m)}</li>`).join('');
    return `
<article class="professional-letter">
  <header class="letter-head">
    <div class="letter-brand">
      <span class="letter-brand-mark">Assessment ai</span>
      <span class="letter-brand-sub">AI Readiness · Proof of Concept</span>
    </div>
    <div class="letter-meta-block">
      <p class="letter-meta"><span class="letter-meta-label">Date</span> ${esc(date)}</p>
      <p class="letter-meta"><span class="letter-meta-label">Prepared for</span> ${esc(companyName)}</p>
      <p class="letter-meta"><span class="letter-meta-label">Industry</span> ${esc(industryName)}</p>
    </div>
  </header>

  <div class="letter-rule"></div>

  <p class="letter-re">${esc(content.title)}</p>
  <p class="letter-salutation">${salutation}</p>

  <p class="letter-lead">
    Following our AI readiness assessment, we recommend a focused proof of concept to validate impact
    before broader investment. This letter outlines objectives, scope, timeline, and success criteria
    tailored to ${esc(companyName)}.
  </p>

  <section class="letter-section">
    <h2 class="letter-h2">Executive objectives</h2>
    <ul class="letter-list">${objectives}</ul>
  </section>

  <section class="letter-section">
    <h2 class="letter-h2">Scope of work</h2>
    <p class="letter-body">${esc(content.scope)}</p>
  </section>

  <section class="letter-section">
    <h2 class="letter-h2">Implementation timeline</h2>
    <table class="letter-table">
      <thead><tr><th>Phase</th><th>Activities</th></tr></thead>
      <tbody>${timeline}</tbody>
    </table>
  </section>

  <section class="letter-section">
    <h2 class="letter-h2">Success metrics</h2>
    <ul class="letter-list">${metrics}</ul>
  </section>

  <section class="letter-section letter-callout">
    <h2 class="letter-h2">Investment profile</h2>
    <div class="letter-grid-2">
      <div><span class="letter-meta-label">Typical effort</span><p class="letter-body-strong">${esc(content.effort)}</p></div>
      <div><span class="letter-meta-label">Cost-conscious path</span><p class="letter-body-strong">${esc(content.low_cost_options)}</p></div>
    </div>
  </section>

  <p class="letter-closing">
    We are prepared to mobilize a joint working session to finalize data access, stakeholders, and a
    go/no-go checkpoint at the end of the pilot window.
  </p>

  <footer class="letter-signature">
    <p class="letter-sign-off">Respectfully,</p>
    <p class="letter-sign-name">${esc(preparedBy)}</p>
    <p class="letter-sign-role">On behalf of the AI Readiness Assessment Program</p>
  </footer>
</article>`.trim();
}
