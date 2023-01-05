import type { Plugin, ViteDevServer } from "vite"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse as parseHtml } from "node-html-parser"

import type { ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import type { SsgPage } from "../server/ssg.js"
import type { EntryImages, CreateImages } from "../transform/image.js"
import { transformPage } from "../transform/page.js"
import { transformPages } from "../transform/pages.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformEntryImages } from "../transform/image.js"
import { transformEncode } from "../transform/encode.js"
import { transformSearch } from "../transform/search.js"
import { transformDelivery } from "../transform/delivery.js"
import { resolveBase } from "../utility/base.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginServe(config: ResolvedConfig): Plugin {
  const virtualModuleId = "virtual:minista-plugin-serve"
  const resolvedVirtualModuleId = "\0" + virtualModuleId

  let server: ViteDevServer

  let useVirtualModule: boolean = false
  let ssgPages: SsgPage[] = []
  let entryImages: EntryImages = {}
  let createImages: CreateImages = {}

  return {
    name: "minista-vite-plugin:serve",
    resolveId(id) {
      if (id === virtualModuleId) {
        useVirtualModule = true
        return resolvedVirtualModuleId
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const { moduleGraph } = server
        const module = moduleGraph.getModuleById(resolvedVirtualModuleId)!
        moduleGraph.invalidateModule(module)

        const searchObj = await transformSearch({ ssgPages, config })

        return `export const searchObj = ${JSON.stringify(searchObj)}`
      }
    },
    configureServer(_server) {
      server = _server

      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const resolvedBase = resolveBase(config.main.base)

            let url = req.originalUrl || ""

            if (resolvedBase.match(/^\/.*\/$/)) {
              const reg = new RegExp(`^${resolvedBase}`)
              url = url.replace(reg, "/")
            }

            const { getSources } = (await server.ssrLoadModule(
              __dirname + "/../server/sources.js"
            )) as { getSources: GetSources }
            const { resolvedGlobal, resolvedPages } = await getSources()

            const { headTags, startTags, endTags } = transformEntryTags({
              mode: "serve",
              pathname: url,
              config,
            })

            let html = transformPage({
              url,
              resolvedGlobal,
              resolvedPages,
              headTags,
              startTags,
              endTags,
            })

            let parsedHtml = parseHtml(html, { comment: true }) as NHTMLElement

            const targetAttr = "data-minista-transform-target"

            if (parsedHtml.querySelector(`[${targetAttr}="comment"]`)) {
              parsedHtml = transformComment(parsedHtml)
            }

            if (parsedHtml.querySelector(`[${targetAttr}="image"]`)) {
              parsedHtml = await transformEntryImages({
                command: "serve",
                parsedHtml,
                config,
                entryImages,
                createImages,
              })
            }

            const dummyHtml = `<!DOCTYPE html><html><head></head><body></body></html>`
            const reactHtml = await server.transformIndexHtml(url, dummyHtml)
            const parsedReactHtml = parseHtml(reactHtml)
            const serverScripts = parsedReactHtml.querySelectorAll("script")

            serverScripts.map((script) => {
              return parsedHtml.querySelector("head")?.appendChild(script)
            })

            html = parsedHtml.toString()

            if (
              useVirtualModule ||
              parsedHtml.querySelector(`[${targetAttr}="delivery-list"]`)
            ) {
              ssgPages = await transformPages({
                resolvedGlobal,
                resolvedPages,
                config,
              })
            }

            if (parsedHtml.querySelector(`[${targetAttr}="delivery-list"]`)) {
              html = transformDelivery({ html, ssgPages, config })
            }

            const charsets = html.match(
              /<meta[^<>]*?charset=["|'](.*?)["|'].*?\/>/i
            )
            const charset = charsets ? charsets[1] : "UTF-8"

            if (charset.match(/^utf[\s-_]*8$/i)) {
              res.statusCode = 200
              res.end(html)
            } else {
              res.statusCode = 200
              res.end(transformEncode(html, charset))
            }
          } catch (e: any) {
            server.ssrFixStacktrace(e)
            next(e)
          }
        })
      }
    },
  }
}
