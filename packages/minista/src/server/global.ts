import type { GetStaticData, StaticData } from "../shared/index.js"

type Global = {
  component?: new () => React.Component<any, any>
  getStaticData?: GetStaticData
}

type ImportedGlobals = {
  [key: string]: {
    default?: new () => React.Component<any, any>
    getStaticData?: GetStaticData
  }
}

export type ResolvedGlobal = {
  component?: new () => React.Component<any, any>
  staticData: StaticData
}

export function getGlobal(): Global {
  const GLOBALS: ImportedGlobals = import.meta.glob(
    [
      "/src/pages/_global.{tsx,jsx}",
      "/src/_global.{tsx,jsx}",
      "/src/global.{tsx,jsx}",
      "/src/root.{tsx,jsx}",
    ],
    {
      eager: true,
    }
  )
  const globals: Global[] =
    Object.keys(GLOBALS).length === 0
      ? [{}]
      : Object.keys(GLOBALS).map((global) => {
          return {
            component: GLOBALS[global].default || undefined,
            getStaticData: GLOBALS[global].getStaticData || undefined,
          }
        })
  const global: Global = globals[0]
  return global
}

export async function resolveGlobal(global: Global): Promise<ResolvedGlobal> {
  const resolvedGlobal = {
    component: global.component || undefined,
    staticData: global.getStaticData
      ? await global.getStaticData()
      : { props: {} },
  }
  return resolvedGlobal
}
