import { describe, expect, it } from "vitest"

import {
  transformLinkTag,
  transformScriptTag,
  transformEntryTags,
} from "../../src/transform/tags"
import { resolveConfig } from "../../src/config"

describe("transformLinkTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = transformLinkTag({
      command: "serve",
      pathname: "/",
      entry: {
        name: "style",
        input: "src/assets/style.scss",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
      config,
    })
    expect(result).toEqual(
      `<link rel="stylesheet" href="/@minista-project-root/src/assets/style.scss">`
    )
  })

  it("Ssg", async () => {
    const config = await resolveConfig({})
    const result = transformLinkTag({
      command: "build",
      pathname: "/",
      entry: {
        name: "style",
        input: "src/assets/style.scss",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
      config,
    })
    expect(result).toEqual(`<link rel="stylesheet" href="/assets/style.css">`)
  })
})

describe("transformScriptTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = transformScriptTag({
      command: "serve",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "defer",
      },
      config,
    })
    expect(result).toEqual(
      `<script defer src="/@minista-project-root/src/assets/script.ts"></script>`
    )
  })

  it("Ssg", async () => {
    const config = await resolveConfig({})
    const result = transformScriptTag({
      command: "build",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: "",
      },
      config,
    })
    expect(result).toEqual(
      `<script type="module" src="/assets/script.js"></script>`
    )
  })

  it("Ssg attributes false", async () => {
    const config = await resolveConfig({})
    const result = transformScriptTag({
      command: "build",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: { include: ["**/*"], exclude: [] },
        position: "head",
        attributes: false,
      },
      config,
    })
    expect(result).toEqual(`<script src="/assets/script.js"></script>`)
  })
})

describe("transformEntryTags", () => {
  it("Serve blank", async () => {
    const config = await resolveConfig({})
    const result = transformEntryTags({
      command: "serve",
      pathname: "/",
      config,
    })
    expect(result).toEqual({
      headTags: `<script type="module" src="/@minista/dist/server/bundle.js"></script>
<script type="module" src="/@minista/dist/server/hydrate.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })

  it("Serve entry", async () => {
    const config = await resolveConfig({
      assets: { entry: "src/assets/style.scss" },
    })
    const result = transformEntryTags({
      command: "serve",
      pathname: "/",
      config,
    })
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" href="/@minista-project-root/src/assets/style.scss">
<script type="module" src="/@minista/dist/server/bundle.js"></script>
<script type="module" src="/@minista/dist/server/hydrate.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })

  it("Ssg blank", async () => {
    const config = await resolveConfig({})
    const result = transformEntryTags({
      command: "build",
      pathname: "/",
      config,
    })
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
<script type="module" data-minista-build-hydrate-src="/assets/hydrate.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })

  it("Ssg entry", async () => {
    const config = await resolveConfig({
      assets: { entry: "src/assets/style.scss" },
    })
    const result = transformEntryTags({
      command: "build",
      pathname: "/",
      config,
    })
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" href="/assets/style.css">
<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
<script type="module" data-minista-build-hydrate-src="/assets/hydrate.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })

  it("Ssg entry array (duplicate)", async () => {
    const config = await resolveConfig({
      assets: { entry: ["src/assets/index.ts", "src/assets/index.css"] },
    })
    const result = transformEntryTags({
      command: "build",
      pathname: "/",
      config,
    })
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" href="/assets/index.css">
<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
<script type="module" src="/assets/index.js"></script>
<script type="module" data-minista-build-hydrate-src="/assets/hydrate.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })
})
