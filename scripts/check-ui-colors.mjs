import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const ALLOWED_FILES = new Set([
  path.normalize("src/app/globals.css"),
  path.normalize("src/shared/ui/theme/color-tokens.ts"),
]);
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const RAW_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3,8})\b|(?:rgb|hsl)a?\(/g;
const TAILWIND_PALETTE_PATTERN =
  /\b(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:[0-9]{2,3}|[a-z-]+)/g;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function findMatches(relativePath, content, pattern, label) {
  const matches = [];
  let match;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    matches.push({
      file: relativePath,
      line: getLineNumber(content, match.index),
      label,
      value: match[0],
    });
  }

  return matches;
}

const files = await collectFiles(SRC_ROOT);
const violations = [];

for (const absolutePath of files) {
  const relativePath = path.normalize(path.relative(ROOT, absolutePath));
  if (ALLOWED_FILES.has(relativePath)) {
    continue;
  }

  const content = await readFile(absolutePath, "utf8");
  violations.push(...findMatches(relativePath, content, RAW_COLOR_PATTERN, "raw-color"));
  violations.push(...findMatches(relativePath, content, TAILWIND_PALETTE_PATTERN, "tailwind-palette"));
}

if (violations.length > 0) {
  const report = violations
    .map((violation) => `${violation.file}:${violation.line} [${violation.label}] ${violation.value}`)
    .join("\n");

  console.error("UI color guard failed.\n" + report);
  process.exit(1);
}

console.log("UI color guard passed.");
