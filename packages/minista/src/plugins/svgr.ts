import type { Plugin } from "vite"
import fs from "fs-extra"
import { transformWithEsbuild } from "vite"

import type { ResolvedConfig } from "../config/index.js"

/*! Fork: vite-plugin-svgr | https://github.com/pd4d10/vite-plugin-svgr */
export function pluginSvgr(config: ResolvedConfig): Plugin {
  const svgrOptions = config.main.assets.svgr.svgrOptions
  return {
    name: "minista-vite-plugin:svgr",
    async transform(code, id) {
      if (id.endsWith(".svg")) {
        const { transform: transformSvgr } = await import("@svgr/core")
        const { default: jsx } = await import("@svgr/plugin-jsx")

        const svgCode = await fs.readFile(id, "utf8")
        const componentCode = await transformSvgr(svgCode, svgrOptions, {
          filePath: id,
          caller: {
            previousExport: code,
            defaultPlugins: [jsx],
          },
        })
        const res = await transformWithEsbuild(componentCode, id, {
          loader: "jsx",
        })
        return {
          code: res.code,
          map: null,
        }
      }
    },
  }
}
