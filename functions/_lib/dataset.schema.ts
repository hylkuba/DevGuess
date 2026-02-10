import { z } from "zod";

export const domainValues = [
  "frontend",
  "backend",
  "mobile",
  "data",
  "devops",
  "cloud",
  "security",
  "gamedev",
  "embedded",
  "observability"
] as const;

export const primaryUseValues = [
  "ui",
  "api",
  "data-processing",
  "storage",
  "messaging",
  "testing",
  "build",
  "ci-cd",
  "iac",
  "monitoring",
  "auth",
  "networking"
] as const;

export const platformTargetValues = [
  "web",
  "server",
  "mobile",
  "desktop",
  "cloud",
  "embedded",
  "multi"
] as const;

export const runtimeValues = [
  "browser",
  "node",
  "jvm",
  "dotnet",
  "python",
  "native",
  "wasm",
  "managed-cloud"
] as const;

export const primaryLanguageValues = [
  "js-ts",
  "python",
  "java",
  "csharp",
  "cpp",
  "c",
  "go",
  "rust",
  "ruby",
  "php",
  "kotlin",
  "swift",
  "sql",
  "other",
  "none"
] as const;

export const licenseValues = [
  "MIT",
  "Apache-2.0",
  "BSD",
  "MPL",
  "GPL",
  "AGPL",
  "Proprietary",
  "Public-Domain",
  "Mixed",
  "Other"
] as const;

export const stewardTypeValues = [
  "community",
  "foundation",
  "company",
  "standards-body"
] as const;

export const stewardValues = [
  "Google",
  "Microsoft",
  "Meta",
  "Amazon",
  "Apple",
  "JetBrains",
  "HashiCorp",
  "Apache",
  "CNCF",
  "W3C",
  "IETF",
  "Community",
  "Other"
] as const;

export const kindTree = {
  Language: ["General-purpose", "Systems", "Scripting", "Query/DSL"],
  Framework: ["Frontend", "Backend", "Full-stack", "Mobile", "Game"],
  Library: ["UI", "Data", "Networking", "Testing"],
  Database: ["Relational", "Document", "Key-value", "Graph", "Search", "Time-series"],
  Tool: ["Build", "Package manager", "CI/CD", "IaC", "Observability", "VCS", "Container", "Server", "Messaging", "Data pipeline"],
  "Platform/Runtime": ["Cloud platform", "Container runtime", "Serverless runtime", "Language runtime", "Operating system"],
  "Protocol/Standard": ["Web standard", "Network protocol", "Data format"]
} as const;

export const topLevelKindValues = Object.keys(kindTree) as Array<keyof typeof kindTree>;

const kindPathSchema = z
  .array(z.string().min(1))
  .min(1)
  .max(2)
  .superRefine((value, ctx) => {
    const [topLevel, secondLevel] = value;
    if (!topLevelKindValues.includes(topLevel as keyof typeof kindTree)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid top-level kind: ${topLevel}`
      });
      return;
    }

    if (secondLevel) {
      const allowedSecond = kindTree[topLevel as keyof typeof kindTree];
      if (!allowedSecond.includes(secondLevel as never)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid child kind "${secondLevel}" for kind "${topLevel}"`
        });
      }
    }
  });

export const techItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  kindPath: kindPathSchema,
  domains: z.array(z.enum(domainValues)).min(1),
  primaryUse: z.array(z.enum(primaryUseValues)).min(1),
  platformTargets: z.array(z.enum(platformTargetValues)).min(1),
  runtimes: z.array(z.enum(runtimeValues)).min(1),
  ecosystemPath: z.array(z.string().min(1)).min(1).max(3),
  primaryLanguage: z.enum(primaryLanguageValues),
  license: z.enum(licenseValues),
  stewardType: z.enum(stewardTypeValues),
  steward: z.enum(stewardValues),
  initialReleaseYear: z.number().int().min(1950).max(2100),
  openSource: z.boolean()
});

export const techDatasetSchema = z.array(techItemSchema).min(1).superRefine((items, ctx) => {
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate id: ${item.id}`
      });
    }
    seenIds.add(item.id);

    const uniqueArrayFields: Array<keyof typeof item> = [
      "domains",
      "primaryUse",
      "platformTargets",
      "runtimes",
      "kindPath",
      "ecosystemPath",
      "aliases"
    ];

    for (const field of uniqueArrayFields) {
      const value = item[field];
      if (Array.isArray(value)) {
        const deduped = new Set(value.map((entry) => String(entry)));
        if (deduped.size !== value.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${item.id}: "${field}" must not contain duplicates`
          });
        }
      }
    }
  }
});

export type TechItem = z.infer<typeof techItemSchema>;
export type TechDataset = z.infer<typeof techDatasetSchema>;
export type Domain = (typeof domainValues)[number];
export type PrimaryUse = (typeof primaryUseValues)[number];
export type PlatformTarget = (typeof platformTargetValues)[number];
export type Runtime = (typeof runtimeValues)[number];
export type PrimaryLanguage = (typeof primaryLanguageValues)[number];
export type License = (typeof licenseValues)[number];
export type StewardType = (typeof stewardTypeValues)[number];
export type Steward = (typeof stewardValues)[number];
