// Render branded title + outro screens (1920x1080) that match the live app's
// visual language, using the same headless Chromium so fonts/colors are exact.
import { chromium } from "playwright";

const OUT =
  process.env.OUTDIR || "/home/hoveiser/Project/genesrow/evidence/ui_frames";

const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    color: #e7ecf5;
    background:
      radial-gradient(1200px 600px at 15% -10%, rgba(255,107,53,0.18), transparent 60%),
      radial-gradient(1000px 700px at 100% 0%, rgba(107,70,193,0.22), transparent 55%),
      linear-gradient(160deg, #0b1220 0%, #0e1526 55%, #0b1220 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
  }
  .grad { background: linear-gradient(135deg,#FF6B35 0%,#6B46C1 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .pill { display:inline-flex; align-items:center; gap:10px; font-weight:700; font-size:22px;
          color:#FFD9C7; border:1px solid rgba(255,107,53,0.5); background:rgba(255,107,53,0.12);
          padding:8px 18px; border-radius:999px; letter-spacing:0.5px; }
  .row { display:flex; align-items:center; gap:22px; justify-content:center; }
  .lock { width:70px; height:70px; border-radius:18px; display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#FF6B35,#6B46C1); box-shadow:0 10px 40px rgba(255,107,53,0.35); }
  .lock svg { width:38px; height:38px; stroke:#fff; }
  h1 { font-size:118px; font-weight:900; letter-spacing:-3px; line-height:1; margin-top:34px; }
  h2 { font-size:60px; font-weight:800; margin-top:14px; letter-spacing:-1px; }
  .sub { font-size:30px; font-weight:500; color:#9fb0cc; margin-top:26px; max-width:1300px; line-height:1.4; }
  .mono { font-family:'JetBrains Mono', monospace; }
  .meta { margin-top:60px; display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
  .chip { font-size:23px; color:#c7d3e8; border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.04); padding:14px 24px; border-radius:14px; }
  .chip b { color:#fff; font-weight:700; }
  .foot { position:absolute; bottom:64px; font-size:26px; color:#7f8fab; letter-spacing:1px; }
</style></head><body>${body}</body></html>`;

const lockSvg = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

const titleHtml = shell(`
  <div class="row"><div class="lock">${lockSvg}</div><h1>Gen<span class="grad">Escrow</span></h1></div>
  <div style="margin-top:26px" class="pill">v1.3.0 &nbsp;INTERACTIVE DEMO</div>
  <div class="sub">AI-validated escrow settlement on GenLayer StudioNet.<br>Watch the live contract UI enforce A1-A6 in real time.</div>
  <div class="foot">hoveiser.github.io/genesrow</div>
`);

const outroHtml = shell(`
  <h2 class="grad">Built on GenLayer</h2>
  <div class="sub">A fully interactive, reviewer-verifiable demo of GenEscrow v1.3.0.</div>
  <div class="meta">
    <div class="chip"><b>Contract</b>&nbsp;&nbsp;<span class="mono">0x0CF5095A297763A167B0d2f1CDc921b63c100cE4</span></div>
  </div>
  <div class="meta">
    <div class="chip"><b>Live demo</b>&nbsp;&nbsp;<span class="mono">hoveiser.github.io/genesrow</span></div>
    <div class="chip"><b>Source</b>&nbsp;&nbsp;<span class="mono">github.com/hoveiser/genesrow</span></div>
  </div>
  <div class="foot">Deployed &amp; byte-verified on StudioNet (chain id 61999)</div>
`);

async function render(page, html, file) {
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log("rendered", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await render(page, titleHtml, "00_title.png");
  await render(page, outroHtml, "16_outro.png");
  await browser.close();
}

main().catch((e) => {
  console.error("TITLE_ERROR", e);
  process.exit(1);
});
