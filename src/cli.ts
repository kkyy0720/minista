import fs from "fs-extra"
import { cac } from "cac"

import { getUserConfig } from "./user.js"
import { getConfig } from "./config.js"
import { systemConfig } from "./system.js"
import { getViteConfig } from "./vite.js"
import { getMdxConfig } from "./mdx.js"
import { emptyResolveDir } from "./empty.js"
import { createDevServer } from "./server.js"
import { previewLocal } from "./preview.js"
import {
  generateViteImporters,
  generateTempRoot,
  generateTempPages,
  generateAssets,
  generateNoStyleTemp,
  generateHtmlPages,
  generatePublic,
  generateDownload,
  generateBeautify,
} from "./generate.js"

function printVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  const pkgVersion = pkg.version
  return pkgVersion
}

const cli = cac("minista")

cli
  .command("[root]")
  .alias("dev")
  .action(async () => {
    try {
      const userConfig = await getUserConfig()
      const config = await getConfig(userConfig)
      const mdxConfig = await getMdxConfig(config)
      const viteConfig = await getViteConfig(config, mdxConfig)

      await Promise.all([
        emptyResolveDir(systemConfig.temp.viteImporter.outDir),
        emptyResolveDir(systemConfig.temp.icons.outDir),
      ])
      await generateViteImporters(config, viteConfig)

      await createDevServer(viteConfig)
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.command("build [root]").action(async () => {
  try {
    const userConfig = await getUserConfig()
    const config = await getConfig(userConfig)
    const mdxConfig = await getMdxConfig(config)
    const viteConfig = await getViteConfig(config, mdxConfig)

    await Promise.all([
      emptyResolveDir(systemConfig.temp.root.outDir),
      emptyResolveDir(systemConfig.temp.assets.outDir),
      emptyResolveDir(systemConfig.temp.pages.outDir),
      emptyResolveDir(systemConfig.temp.viteImporter.outDir),
      emptyResolveDir(config.out),
    ])
    await Promise.all([generateViteImporters(config, viteConfig)])
    await Promise.all([
      generateTempRoot(config, mdxConfig),
      generateTempPages(config, mdxConfig),
      generateAssets(config, viteConfig),
    ])
    await Promise.all([generateNoStyleTemp()])
    await Promise.all([generateHtmlPages(config), generatePublic(config)])
    await Promise.all([generateDownload(config)])
    await Promise.all([
      generateBeautify(config, "html"),
      generateBeautify(config, "css"),
      generateBeautify(config, "js"),
    ])
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli.command("preview [root]").action(async () => {
  try {
    const userConfig = await getUserConfig()
    const config = await getConfig(userConfig)
    const mdxConfig = await getMdxConfig(config)
    const viteConfig = await getViteConfig(config, mdxConfig)

    await previewLocal(viteConfig)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli.help()
cli.version(printVersion())
cli.parse()