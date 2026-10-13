// check-perf-budget.mjs - Performance Budget and Non-Blocking Resource Verification
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");

console.log("==========================================");
console.log("  Disha PWA Performance Budget Checker    ");
console.log("==========================================");

if (!fs.existsSync(DIST_DIR)) {
  console.error("❌ Error: dist/ directory does not exist. Run 'npm run build' first.");
  process.exit(1);
}

// 1. Check Bundle Sizes
const BUDGETS = {
  MAX_TOTAL_JS_KB: 650, // 650 kB budget for low-end rural mobile connectivity
  MAX_TOTAL_CSS_KB: 30, // 30 kB budget for stylesheets
  MAX_INDEX_HTML_KB: 10 // 10 kB budget for initial HTML document
};

let totalJsBytes = 0;
let totalCssBytes = 0;
const assetsDir = path.join(DIST_DIR, "assets");

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    if (file.endsWith(".js")) {
      totalJsBytes += stats.size;
    } else if (file.endsWith(".css")) {
      totalCssBytes += stats.size;
    }
  }
}

const totalJsKb = (totalJsBytes / 1024).toFixed(2);
const totalCssKb = (totalCssBytes / 1024).toFixed(2);

console.log(`\n📦 Bundle Size Audit:`);
console.log(`- Total JavaScript: ${totalJsKb} kB (Budget: <= ${BUDGETS.MAX_TOTAL_JS_KB} kB)`);
console.log(`- Total CSS:        ${totalCssKb} kB (Budget: <= ${BUDGETS.MAX_TOTAL_CSS_KB} kB)`);

let budgetFailed = false;

if (totalJsBytes / 1024 > BUDGETS.MAX_TOTAL_JS_KB) {
  console.error(`❌ JavaScript bundle exceeds budget of ${BUDGETS.MAX_TOTAL_JS_KB} kB!`);
  budgetFailed = true;
} else {
  console.log(`✅ JavaScript bundle size is within budget.`);
}

if (totalCssBytes / 1024 > BUDGETS.MAX_TOTAL_CSS_KB) {
  console.error(`❌ CSS bundle exceeds budget of ${BUDGETS.MAX_TOTAL_CSS_KB} kB!`);
  budgetFailed = true;
} else {
  console.log(`✅ CSS bundle size is within budget.`);
}

// 2. Check for Blocking Resources in index.html
console.log(`\n⚡ Render-Blocking Resource Audit:`);
const indexPath = path.join(DIST_DIR, "index.html");
if (fs.existsSync(indexPath)) {
  const htmlContent = fs.readFileSync(indexPath, "utf-8");

  // Verify that all script tags are non-blocking (type="module", async, or defer)
  const scriptRegex = /<script\b([^>]*)>/gi;
  let match;
  let blockingScriptFound = false;

  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const attrs = match[1];
    // Inline script or module/async/defer is non-blocking
    const isModule = /type=["']module["']/i.test(attrs);
    const isAsync = /\basync\b/i.test(attrs);
    const isDefer = /\bdefer\b/i.test(attrs);
    const hasSrc = /\bsrc=/i.test(attrs);

    if (hasSrc && !isModule && !isAsync && !isDefer) {
      console.error(`❌ Render-blocking external script found: ${match[0]}`);
      blockingScriptFound = true;
    }
  }

  if (!blockingScriptFound) {
    console.log(`✅ Zero render-blocking external scripts detected.`);
  } else {
    budgetFailed = true;
  }
}

if (budgetFailed) {
  console.error("\n❌ Performance budget check FAILED.");
  process.exit(1);
} else {
  console.log("\n✅ All performance budgets and non-blocking audits PASSED.");
  process.exit(0);
}
