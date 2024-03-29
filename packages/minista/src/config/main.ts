import type {
  UserConfig as ViteUserConfig,
  CSSOptions as ViteCSSOptions,
} from "vite"
import type { Config as SvgrOptions } from "@svgr/core"
import type { SvgstoreAddOptions } from "@qrac/svgstore"
import type { Options as RemarkGfmOptions } from "remark-gfm"
import type { Options as RehypeHighlightOptions } from "rehype-highlight"
import type { Options as MdxOptions } from "@mdx-js/rollup"
import type { Format as ArchiverFormat, ArchiverOptions } from "archiver"
import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"
import { deepmergeCustom } from "deepmerge-ts"

import type { ResolvedUserConfig } from "./user.js"
import type { EntryPatterns } from "./entry.js"
import type { AliasPatterns } from "./alias.js"
import type { ImageOptimize } from "./image.js"

export type MainConfig = {
  root: string
  base: string
  public: string
  out: string
  assets: {
    entry: EntryPatterns
    outDir: string
    outName: string
    images: {
      outDir: string
      outName: string
      remoteName: string
      optimize: ImageOptimize
    }
    svgr: {
      svgrOptions: SvgrOptions
    }
    icons: {
      srcDir: string
      outDir: string
      outName: string
      svgstoreOptions: SvgstoreAddOptions
    }
    fonts: {
      outDir: string
      outName: string
    }
    bundle: {
      outName: string
    }
    partial: {
      usePreact: boolean
      useIntersectionObserver: boolean
      outName: string
      rootAttrSuffix: string
      rootValuePrefix: string
      rootDOMElement: "div" | "span"
      rootStyle: React.CSSProperties
      intersectionObserverOptions: {
        root: Element | null
        rootMargin: string
        thresholds: ReadonlyArray<number>
      }
    }
  }
  resolve: {
    alias: AliasPatterns
  }
  css: ViteCSSOptions
  markdown: {
    useRemarkGfm: boolean
    useRehypeHighlight: boolean
    remarkGfmOptions: RemarkGfmOptions
    rehypeHighlightOptions: RehypeHighlightOptions
    mdxOptions: MdxOptions
  }
  search: {
    outDir: string
    outName: string
    include: string[]
    exclude: string[]
    baseUrl: string
    trimTitle: string
    targetSelector: string
    hit: {
      minLength: number
      number: boolean
      english: boolean
      hiragana: boolean
      katakana: boolean
      kanji: boolean
    }
  }
  storyapp: {
    useImport: boolean
    outDir: string
  }
  delivery: {
    include: string[]
    exclude: string[]
    trimTitle: string
    sortBy: "path" | "title"
    archives: {
      srcDir: string
      outDir: string
      outName: string
      format: ArchiverFormat
      options?: ArchiverOptions
      ignore?: string[]
      button?: {
        title?: string
        color?: string
      }
    }[]
  }
  beautify: {
    useHtml: boolean
    useAssets: boolean
    htmlOptions: HTMLBeautifyOptions
    cssOptions: CSSBeautifyOptions
    jsOptions: JSBeautifyOptions
  }
  vite: ViteUserConfig
}

export type ResolvedMainConfig = MainConfig

export const defaultMainConfig: MainConfig = {
  root: "",
  base: "/",
  public: "public",
  out: "dist",
  assets: {
    entry: "",
    outDir: "assets",
    outName: "[name]",
    images: {
      outDir: "assets/images",
      outName: "[name]",
      remoteName: "remote",
      optimize: {
        layout: "constrained",
        breakpoints: [
          320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840,
        ],
        resolution: [1, 2],
        format: "inherit",
        formatOptions: {},
        quality: undefined,
        aspect: undefined,
        background: undefined,
        fit: "cover",
        position: "centre",
      },
    },
    svgr: {
      svgrOptions: {},
    },
    icons: {
      srcDir: "src/assets/icons",
      outDir: "assets/images",
      outName: "[dirname]",
      svgstoreOptions: {
        cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
      },
    },
    fonts: {
      outDir: "assets/fonts",
      outName: "[name]",
    },
    bundle: {
      outName: "bundle",
    },
    partial: {
      usePreact: false,
      useIntersectionObserver: true,
      outName: "hydrate",
      rootAttrSuffix: "partial-hydration",
      rootValuePrefix: "ph",
      rootDOMElement: "div",
      rootStyle: { display: "contents" },
      intersectionObserverOptions: {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
      },
    },
  },
  resolve: {
    alias: [],
  },
  css: {
    modules: {
      scopeBehaviour: "local",
      globalModulePaths: [],
      generateScopedName: undefined,
      hashPrefix: "",
      localsConvention: "camelCaseOnly",
    },
    preprocessorOptions: {
      scss: {},
      less: {},
      stylus: {},
    },
  },
  markdown: {
    useRemarkGfm: true,
    useRehypeHighlight: true,
    remarkGfmOptions: {},
    rehypeHighlightOptions: {},
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  },
  search: {
    outDir: "assets",
    outName: "search",
    include: ["**/*"],
    exclude: ["/404"],
    baseUrl: "",
    trimTitle: "",
    targetSelector: "[data-search]",
    hit: {
      minLength: 3,
      number: false,
      english: true,
      hiragana: false,
      katakana: true,
      kanji: true,
    },
  },
  storyapp: {
    useImport: false,
    outDir: "story",
  },
  delivery: {
    include: ["**/*"],
    exclude: ["/404"],
    trimTitle: "",
    sortBy: "path",
    archives: [],
  },
  beautify: {
    useHtml: true,
    useAssets: false,
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
      inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
    },
    cssOptions: {
      indent_size: 2,
      space_around_combinator: true,
    },
    jsOptions: {
      indent_size: 2,
    },
  },
  vite: {},
}

export async function resolveMainConfig(
  userConfig?: ResolvedUserConfig
): Promise<ResolvedMainConfig> {
  const defaultConfig = defaultMainConfig
  const inlineConfig = userConfig || {}

  const customDeepmerge = deepmergeCustom({
    mergeArrays: false,
  })
  const mergedConfig = customDeepmerge(
    defaultConfig,
    inlineConfig
  ) as ResolvedMainConfig
  return mergedConfig
}
