import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { skillManifestSchema } from "../shared/cli-schemas";
import { fromZodError } from "zod-validation-error";

async function validateSkills() {
  const skillsDir = "skills";
  let hasErrors = false;
  let validCount = 0;

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());

    if (directories.length === 0) {
      console.log("No skills found to validate.");
      return;
    }

    console.log(`Validating ${directories.length} skill(s)...\n`);

    for (const dir of directories) {
      const manifestPath = join(skillsDir, dir.name, "manifest.json");

      try {
        const content = await readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(content);
        const result = skillManifestSchema.safeParse(manifest);

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
      console.log("Skills directory not found. No skills to validate.");
    } else {
      console.error("Error reading skills directory:", (error as Error).message);
      process.exit(1);
    }
  }
}

validateSkills();
