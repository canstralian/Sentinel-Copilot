import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile, readdir } from "fs/promises";

async function generateReadme() {
  console.log("generating README.md...");
  
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  
  let collectionsCount = 0;
  let skillsCount = 0;
  
  try {
    const collectionsEntries = await readdir("collections", { withFileTypes: true });
    collectionsCount = collectionsEntries.filter(e => e.isDirectory()).length;
  } catch {}
  
  try {
    const skillsEntries = await readdir("skills", { withFileTypes: true });
    skillsCount = skillsEntries.filter(e => e.isDirectory()).length;
  } catch {}

  const readme = `# ${pkg.name}

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## Overview

${pkg.name} v${pkg.version} - Enterprise security management platform with collections and skills management.

## Quick Stats

- **Collections**: ${collectionsCount}
- **Skills**: ${skillsCount}

## Installation

\`\`\`bash
npm ci
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## CLI Commands

### Collection Management

\`\`\`bash
# Validate all collection manifests
npx tsx script/collection-validate.ts

# Create a new collection
npx tsx script/collection-create.ts -- --id <collection-id> --tags <tag1,tag2>
\`\`\`

### Skill Management

\`\`\`bash
# Validate all agent skills
npx tsx script/skill-validate.ts

# Create a new skill
npx tsx script/skill-create.ts -- --name <skill-name>
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Type Checking

\`\`\`bash
npm run check
\`\`\`

## Database Migrations

\`\`\`bash
npm run db:push
\`\`\`

## Project Structure

\`\`\`
├── collections/          # Collection manifests
├── skills/               # Skill manifests
├── script/               # CLI scripts
│   ├── build.ts
│   ├── collection-validate.ts
│   ├── collection-create.ts
│   ├── skill-validate.ts
│   └── skill-create.ts
├── client/               # Frontend React application
├── server/               # Backend Express application
└── shared/               # Shared schemas and types
\`\`\`

## License

MIT

---

*Generated at ${new Date().toISOString()}*
`;

  await writeFile("README.md", readme);
  console.log("README.md generated successfully");
}

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  await generateReadme();

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
