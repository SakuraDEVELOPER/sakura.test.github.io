import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const steps = [
  {
    name: "profiles",
    scriptPath: path.resolve(process.cwd(), "scripts/migrate-firebase-profiles-to-supabase.mjs"),
  },
  {
    name: "comments",
    scriptPath: path.resolve(process.cwd(), "scripts/migrate-firebase-comments-to-supabase.mjs"),
  },
  {
    name: "presence",
    scriptPath: path.resolve(process.cwd(), "scripts/migrate-firebase-presence-to-supabase.mjs"),
  },
];

function runStep(step, forwardedArgs) {
  console.log(`[migrate:all] starting ${step.name}`);

  const result = spawnSync(process.execPath, [step.scriptPath, ...forwardedArgs], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`${step.name} migration failed with exit code ${result.status}`);
  }

  if (result.error) {
    throw result.error;
  }

  console.log(`[migrate:all] finished ${step.name}`);
}

function main() {
  const forwardedArgs = process.argv.slice(2);

  for (const step of steps) {
    runStep(step, forwardedArgs);
  }

  console.log("[migrate:all] all migrations finished");
}

try {
  main();
} catch (error) {
  console.error("[migrate:all] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
