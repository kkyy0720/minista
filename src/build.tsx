import fs from "fs-extra"
import path from "path"
import url from "url"
import pc from "picocolors"
import { Fragment } from "react"
import { build as esBuild } from "esbuild"
import mdx from "@mdx-js/esbuild"
import type { Options as MdxOptions } from "@mdx-js/esbuild"
import { build as viteBuild, mergeConfig } from "vite"
import type { InlineConfig } from "vite"

import type {
  RootStaticContent,
  RootEsmContent,
  RootJsxContent,
  GlobalStaticData,
  GetGlobalStaticData,
  PageEsmContent,
  PageJsxContent,
  StaticData,
  StaticDataItem,
  GetStaticData,
} from "./types.js"
import { resolvePlugin } from "./esbuild.js"
import { renderHtml } from "./render.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function buildTempPages(
  entryPoints: string[],
  buildOptions: {
    outbase: string
    outdir: string
    mdxConfig: MdxOptions
  }
) {
  const ministaPkgURL = new URL(
    path.resolve(__dirname + "/../package.json"),
    import.meta.url
  )
  const ministaPkg = JSON.parse(fs.readFileSync(ministaPkgURL, "utf8"))
  const userPkgURL = new URL(path.resolve("package.json"), import.meta.url)
  const userPkg = JSON.parse(fs.readFileSync(userPkgURL, "utf8"))

  const esbuildExternal = [
    ...Object.keys(ministaPkg.dependencies || {}),
    ...Object.keys(ministaPkg.devDependencies || {}),
    ...Object.keys(ministaPkg.peerDependencies || {}),
    ...Object.keys(userPkg.dependencies || {}),
    ...Object.keys(userPkg.devDependencies || {}),
    ...Object.keys(userPkg.peerDependencies || {}),
    "*.css",
    "*.scss",
    "*.sass",
  ]

  await esBuild({
    entryPoints: entryPoints,
    outbase: buildOptions.outbase,
    outdir: buildOptions.outdir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    format: "esm",
    platform: "node",
    inject: [
      path.resolve(__dirname + "/../lib/shim-react.js"),
      path.resolve(__dirname + "/../lib/shim-fetch.js"),
    ],
    external: esbuildExternal,
    plugins: [
      mdx(buildOptions.mdxConfig),
      resolvePlugin({
        "react/jsx-runtime": "react/jsx-runtime.js",
      }),
    ],
  }).catch(() => process.exit(1))
}

export async function buildStaticPages(
  entryPoints: string[],
  tempRootFilePath: string,
  buildOptions: {
    outbase: string
    outdir: string
  },
  assetsTagStr?: string
) {
  const rootStaticContent = await buildRootEsmContent(tempRootFilePath)
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      const extname = path.extname(entryPoint)
      const basename = path.basename(entryPoint, extname)
      const dirname = path
        .dirname(entryPoint)
        .replace(buildOptions.outbase, buildOptions.outdir)
      const filename = path.join(dirname, basename + ".html")

      await buildStaticPage(
        entryPoint,
        filename,
        rootStaticContent,
        assetsTagStr
      )
    })
  )
}

export async function buildRootEsmContent(tempRootFilePath: string) {
  const defaultRootEsmContent = {
    component: Fragment,
    staticData: { props: {} },
  }
  if (!tempRootFilePath) {
    return defaultRootEsmContent
  } else {
    const rootEsmContent: RootEsmContent = await import(tempRootFilePath)
    const rootJsxContent: RootJsxContent = rootEsmContent.default
      ? rootEsmContent.default
      : Fragment

    const staticData: GlobalStaticData = rootEsmContent.getStaticData
      ? await buildGlobalStaticData(rootEsmContent.getStaticData)
      : { props: {} }

    return { component: rootJsxContent, staticData: staticData }
  }
}

export async function buildGlobalStaticData(
  getGlobalStaticData: GetGlobalStaticData
) {
  const response = await getGlobalStaticData()
  return response
}

export async function buildStaticPage(
  entryPoint: string,
  outFile: string,
  rootStaticContent: RootStaticContent,
  assetsTagStr?: string
) {
  const pageEsmContent: PageEsmContent = await import(path.resolve(entryPoint))
  const pageJsxContent: PageJsxContent = pageEsmContent.default
  const defaultStaticDataItem = { props: {}, paths: {} }

  const staticData: StaticData = pageEsmContent.getStaticData
    ? await buildStaticData(pageEsmContent.getStaticData)
    : undefined

  if (!staticData) {
    const staticDataItem = defaultStaticDataItem
    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      outFile,
      rootStaticContent,
      assetsTagStr
    )
  }

  if ("props" in staticData && "paths" in staticData === false) {
    const staticDataItem = { ...defaultStaticDataItem, ...staticData }
    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      outFile,
      rootStaticContent,
      assetsTagStr
    )
  }

  if ("paths" in staticData) {
    const staticDataItem = { ...defaultStaticDataItem, ...staticData }

    let fixedOutfile = outFile
    for await (const [key, value] of Object.entries(staticDataItem.paths)) {
      const reg = new RegExp("\\[" + key + "\\]", "g")
      fixedOutfile = fixedOutfile.replace(reg, `${value}`)
    }

    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      fixedOutfile,
      rootStaticContent,
      assetsTagStr
    )
  }

  if (Array.isArray(staticData) && staticData.length > 0) {
    const entryPoints = staticData

    await Promise.all(
      entryPoints.map(async (entryPoint) => {
        const staticDataItem = { ...defaultStaticDataItem, ...entryPoint }

        let fixedOutfile = outFile
        for await (const [key, value] of Object.entries(staticDataItem.paths)) {
          const reg = new RegExp("\\[" + key + "\\]", "g")
          fixedOutfile = fixedOutfile.replace(reg, `${value}`)
        }

        return await buildHtmlPage(
          pageJsxContent,
          staticDataItem,
          fixedOutfile,
          rootStaticContent,
          assetsTagStr
        )
      })
    )
  }
}

export async function buildStaticData(getStaticData: GetStaticData) {
  const response = await getStaticData()
  return response
}

export async function buildHtmlPage(
  pageJsxContent: PageJsxContent,
  staticDataItem: StaticDataItem,
  routePath: string,
  rootStaticContent: RootStaticContent,
  assetsTagStr?: string
) {
  const RootComponent: any = rootStaticContent.component
  const globalStaticData = rootStaticContent.staticData
  const PageComponent: any = pageJsxContent
  const staticProps = staticDataItem.props

  const html = await renderHtml(
    <RootComponent {...globalStaticData?.props} {...staticProps}>
      <PageComponent {...globalStaticData?.props} {...staticProps} />
    </RootComponent>,
    assetsTagStr
  )

  await fs
    .outputFile(routePath, html)
    .then(() => {
      console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(routePath)}`)
    })
    .catch((err) => {
      console.error(err)
    })
}

export async function buildTempAssets(
  viteConfig: InlineConfig,
  buildOptions: {
    fileName: string
    outdir: string
    assetDir: string
  }
) {
  const customConfig = {
    build: {
      write: false,
      rollupOptions: {
        input: {
          __minista_auto_bundle_asset_pages: path.resolve(
            __dirname + "/../dist/pages.js"
          ),
        },
      },
    },
  }
  const mergedConfig = mergeConfig(viteConfig, customConfig)

  const result: any = await viteBuild(mergedConfig)
  const items = result.output

  if (Array.isArray(items) && items.length > 0) {
    items.map((item) => {
      if (item.fileName.match(/__minista_auto_bundle_asset_pages\.css/)) {
        const customFileName = `${buildOptions.outdir}/${buildOptions.fileName}.css`
        return item?.source && fs.outputFile(customFileName, item?.source)
      } else if (item.fileName.match(/__minista_auto_bundle_asset_pages\.js/)) {
        return
      } else {
        const customFileName =
          buildOptions.outdir + item.fileName.replace(buildOptions.assetDir, "")
        const customCode = item?.source
          ? item?.source
          : item?.code
          ? item?.code
          : ""
        return customCode && fs.outputFile(customFileName, customCode)
      }
    })
  }
}

export async function buildAssetsTagStr(
  entryPoints: string[],
  buildOptions: {
    outbase: string
    outdir: string
  }
) {
  const assetsTags = entryPoints.map((entryPoint) => {
    const assetPath = entryPoint.replace(
      buildOptions.outbase,
      buildOptions.outdir
    )
    if (assetPath.endsWith(".css")) {
      return `<link rel="stylesheet" href="/${assetPath}">`
    } else if (assetPath.endsWith(".js")) {
      return `<script defer src="/${assetPath}"></script>`
    }
  })
  const assetsTagStr = assetsTags.join("")
  return assetsTagStr
}

export async function buildCopyDir(
  targetDir: string,
  outDir: string,
  log?: "public" | "assets"
) {
  return fs
    .copy(targetDir, outDir)
    .then(() => {
      if (log === "public") {
        console.log(
          `${pc.bold(pc.green("BUILD"))} ${pc.bold(
            targetDir + "/**/* -> " + outDir
          )}`
        )
      }
      if (log === "assets") {
        console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(outDir)}`)
      }
    })
    .catch((err) => {
      console.error(err)
    })
}
