import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "dist-packs");
const packages = [
  { name: "@bywaretech/bysentinel-core", dir: "packages/core" },
  { name: "@bywaretech/bysentinel-providers", dir: "packages/providers" },
  { name: "@bywaretech/bysentinel-aws-lambda", dir: "packages/aws-lambda" },
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const pkg of packages) {
  await run("pnpm", ["--filter", pkg.name, "run", "clean"]);
}

await run("pnpm", ["build"]);

for (const pkg of packages) {
  await run("pnpm", ["pack", "--pack-destination", outDir], resolve(root, pkg.dir));
}

console.log(`Packed ${packages.length} packages into ${outDir}`);

function run(command, args, cwd = root) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}
