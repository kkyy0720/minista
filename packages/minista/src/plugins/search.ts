import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import { resolveBase } from "../utility/base.js"

export function pluginSearch(config: ResolvedConfig): Plugin {
  let command: "build" | "serve"
  let activeSearch = false

  const output = path.join(config.sub.tempDir, "search.txt")

  return {
    name: "minista-vite-plugin:search",
    config(_, viteConfig) {
      command = viteConfig.command
    },
    async buildStart() {
      await fs.remove(output)
    },
    async transform(code, id) {
      if (
        command === "serve" &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)search\.js$/)
      ) {
        const importCode = `import { searchObj as data } from "virtual:minista-plugin-serve"`
        const replacedCode = code
          .replace(
            /const response = await fetch/,
            "//const response = await fetch"
          )
          .replace(
            /const data = await response/,
            "//const data = await response"
          )
        return {
          code: importCode + "\n\n" + replacedCode,
          map: null,
        }
      }

      if (
        command === "build" &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)search\.js$/)
      ) {
        if (!activeSearch) {
          await fs.outputFile(output, "")
          activeSearch = true
        }

        const resolvedBase = resolveBase(config.main.base)

        let filePath = path.join(
          config.main.search.outDir,
          config.main.search.outName + ".json"
        )
        filePath = resolvedBase.match(/^\/.*\/$/)
          ? path.join(resolvedBase, filePath)
          : path.join("/", filePath)

        const replacedCode = code.replace(
          /\/@minista-temp\/__minista_plugin_search\.json/,
          filePath
        )
        return {
          code: replacedCode,
          map: null,
        }
      }
    },
  }
}
