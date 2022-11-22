import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPage } from "../server/ssg.js"

export function transformDataDelivery({
  ssgPages,
  config,
}: {
  ssgPages: SsgPage[]
  config: ResolvedConfig
}) {
  const { include, exclude, trimTitle, sortBy } = config.main.delivery
  const filterdPages = ssgPages.filter((page) => {
    return picomatch.isMatch(page.path, include, {
      ignore: exclude,
    })
  })
  return filterdPages
    .map((page) => {
      let title: string
      title = page.title ? page.title : ""

      if (!title) {
        const pTitle = page.html.match(
          /<title[^<>]*?>\s*\n*(.*?)\s*\n*<\/title>/i
        )
        title = pTitle ? pTitle[1] : ""
      }
      const regTrimTitle = new RegExp(trimTitle)
      title = title ? title.replace(regTrimTitle, "") : ""

      return {
        title,
        path: page.path,
      }
    })
    .sort((a, b) => {
      let itemA: string
      let itemB: string
      itemA = sortBy === "path" ? a.path.toUpperCase() : a.title
      itemB = sortBy === "path" ? b.path.toUpperCase() : b.title

      if (itemA < itemB) {
        return -1
      }
      if (itemA > itemB) {
        return 1
      }
      return 0
    })
}

export function transformStrDelivery(
  data: {
    title: string
    path: string
  }[]
) {
  const items = data.map((item) => {
    return `<li class="minista-delivery-item">
  <div class="minista-delivery-item-content">
    <a
      class="minista-delivery-item-content-link"
      href="${item.path}"
    ></a>
    <div class="minista-delivery-item-content-inner">
      <p class="minista-delivery-item-content-name">${item.title}</p>
      <p class="minista-delivery-item-content-slug">${item.path}</p>
    </div>
    <div class="minista-delivery-item-content-background"></div>
  </div>
</li>`
  })
  const itemsStr = items.join("\n")

  return itemsStr
    ? `<ul class="minista-delivery-list">\n` + itemsStr + `\n</ul>`
    : ""
}

export function transformDelivery({
  html,
  ssgPages,
  config,
}: {
  html: string
  ssgPages: SsgPage[]
  config: ResolvedConfig
}) {
  const data = transformDataDelivery({ ssgPages, config })
  const str = transformStrDelivery(data)

  return html.replace(
    /<div[^<>]*?data-minista-transform-target="delivery".*?>\s*\n*<\/div>/gi,
    str
  )
}
