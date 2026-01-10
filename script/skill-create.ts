import { mkdir, writeFile, access } from "fs/promises";
import { join } from "path";
import type { SkillManifest } from "../shared/cli-schemas";

function parseArgs(): { name: string } {
  const args = process.argv.slice(2);
  let name = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      name = args[i + 1];
      i++;
    }
  }

  if (!name) {
    console.error("Error: --name is required");
    console.error("Usage: npm run skill:create -- --name <skill-name>");
    process.exit(1);
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    console.error("Error: Name must start with a letter and contain only alphanumeric characters, underscores, or hyphens");
    process.exit(1);
  }

  return { name };
}

async function createSkill() {
  const { name } = parseArgs();
  const skillsDir = "skills";
  const skillPath = join(skillsDir, name);
  const manifestPath = join(skillPath, "manifest.json");

  try {
    await access(skillPath);
    console.error(`Error: Skill "${name}" already exists`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, we can proceed
  }

  const now = new Date().toISOString();
  const displayName = name
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const manifest: SkillManifest = {
    name,
    displayName,
    description: "",
    version: "1.0.0",
    category: "utility",
    inputs: [],
    outputs: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };

  try {
    await mkdir(skillPath, { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`✓ Created skill: ${name}`);
    console.log(`  Location: ${manifestPath}`);
  } catch (error) {
    console.error("Error creating skill:", (error as Error).message);
    process.exit(1);
  }
}

createSkill();
