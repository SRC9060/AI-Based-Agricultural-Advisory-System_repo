import fs from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) {
  throw new Error("Pass the Lighthouse JSON report path.");
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const performance = Math.round((report.categories?.performance?.score ?? 0) * 100);
const pwa = Math.round((report.categories?.pwa?.score ?? 0) * 100);

console.log(`Lighthouse mobile scores — Performance: ${performance}, PWA: ${pwa}`);

if (performance < 75) {
  console.warn(
    `Performance score ${performance} is below the preferred 75, but the CI run will continue.`,
  );
}
if (pwa < 90) {
  throw new Error(`PWA score ${pwa} is below the required 90.`);
}
