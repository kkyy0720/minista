import fg from "fast-glob"
import { cac } from "cac"
import { build } from "esbuild"

type Options = {
  entryPoints: string
  outBase: string
  outDir: string
}

const cli = cac()

cli
  .command("[...files]", "Build TypeScript source code into JavaScript")
  .option("--entryPoints [entryPoints]", "[string | string[]]", {
    default: ["src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}", "!src/@types"],
  })
  .option("--outBase [outBase]", "[string]", { default: "src" })
  .option("--outDir [outDir]", "[string]", { default: "dist" })
  .action(async (_: string, options: Options) => {
    try {
      const entryPoints = await fg(options.entryPoints)

      await build({
        entryPoints: entryPoints,
        outbase: options.outBase,
        outdir: options.outDir,
        format: "esm",
        platform: "node",
        logLevel: "info",
      }).catch(() => process.exit(1))
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.parse()
