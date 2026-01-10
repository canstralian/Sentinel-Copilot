import { z } from "zod";

export const collectionManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., 1.0.0)"),
  tags: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type CollectionManifest = z.infer<typeof collectionManifestSchema>;

export const skillManifestSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Name must start with a letter and contain only alphanumeric characters, underscores, or hyphens"),
  displayName: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., 1.0.0)"),
  category: z.string().optional(),
  inputs: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    required: z.boolean().default(true),
    description: z.string().optional(),
  })).default([]),
  outputs: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    description: z.string().optional(),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SkillManifest = z.infer<typeof skillManifestSchema>;
