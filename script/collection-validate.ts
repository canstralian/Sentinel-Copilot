import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { collectionManifestSchema } from "../shared/cli-schemas";
import { fromZodError } from "zod-validation-error";

async function validateCollections() {
  const collectionsDir = "collections";
  let hasErrors = false;
  let validCount = 0;

  try {
    const entries = await readdir(collectionsDir, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());

    if (directories.length === 0) {
      console.log("No collections found to validate.");
      return;
    }

    console.log(`Validating ${directories.length} collection(s)...\n`);

    for (const dir of directories) {
      const manifestPath = join(collectionsDir, dir.name, "manifest.json");

      try {
        const content = await readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(content);
        const result = collectionManifestSchema.safeParse(manifest);

        if (result.success) {
          console.log(`✓ ${dir.name}: Valid`);
          validCount++;
        } else {
          const error = fromZodError(result.error);
          console.error(`✗ ${dir.name}: Invalid`);
          console.error(`  ${error.message}\n`);
          hasErrors = true;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          console.error(`✗ ${dir.name}: Missing manifest.json`);
        } else if (error instanceof SyntaxError) {
          console.error(`✗ ${dir.name}: Invalid JSON in manifest.json`);
        } else {
          console.error(`✗ ${dir.name}: ${(error as Error).message}`);
        }
        hasErrors = true;
      }
    }

    console.log(`\nValidation complete: ${validCount}/${directories.length} valid`);

    if (hasErrors) {
      process.exit(1);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("Collections directory not found. No collections to validate.");
    } else {
      console.error("Error reading collections directory:", (error as Error).message);
      process.exit(1);
    }
  }
}

validateCollections();
