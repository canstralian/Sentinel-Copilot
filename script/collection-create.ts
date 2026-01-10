import { mkdir, writeFile, access } from "fs/promises";
import { join } from "path";
import type { CollectionManifest } from "../shared/cli-schemas";

function parseArgs(): { id: string; tags: string[] } {
  const args = process.argv.slice(2);
  let id = "";
  let tags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      id = args[i + 1];
      i++;
    } else if (args[i] === "--tags" && args[i + 1]) {
      tags = args[i + 1].split(",").map((t) => t.trim()).filter(Boolean);
      i++;
    }
  }

  if (!id) {
    console.error("Error: --id is required");
    console.error("Usage: npm run collection:create -- --id <collection-id> --tags <tag1,tag2>");
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    console.error("Error: ID must be lowercase alphanumeric with hyphens only");
    process.exit(1);
  }

  return { id, tags };
}

async function createCollection() {
  const { id, tags } = parseArgs();
  const collectionsDir = "collections";
  const collectionPath = join(collectionsDir, id);
  const manifestPath = join(collectionPath, "manifest.json");

  try {
    await access(collectionPath);
    console.error(`Error: Collection "${id}" already exists`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, we can proceed
  }

  const now = new Date().toISOString();
  const manifest: CollectionManifest = {
    id,
    name: id.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
    description: "",
    version: "1.0.0",
    tags,
    skills: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };

  try {
    await mkdir(collectionPath, { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`✓ Created collection: ${id}`);
    console.log(`  Location: ${manifestPath}`);
    if (tags.length > 0) {
      console.log(`  Tags: ${tags.join(", ")}`);
    }
  } catch (error) {
    console.error("Error creating collection:", (error as Error).message);
    process.exit(1);
  }
}

createCollection();
