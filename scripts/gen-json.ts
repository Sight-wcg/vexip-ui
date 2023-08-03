import helper from 'components-helper'
import { getPackageInfo } from './utils'
import type {
  ReAttribute,
  ReComponentName,
  ReDocUrl,
  ReWebTypesSource,
  ReWebTypesType
} from 'components-helper'

const prefix: Lowercase<string> = 'v'
const lang: 'zh-CN' | 'en-US' = 'zh-CN'
const entryPath = `docs/demos/**/api.${lang}.md`
const { arrayToRegExp, getTypeSymbol, isCommonType, isUnionType, hyphenate, main } =
  helper as unknown as typeof import('components-helper')
const { pkgName, currentVersion } = await getPackageInfo('vexip-ui')
const isCn = lang === 'zh-CN'
const tbOptions = {
  props: isCn ? '属性' : 'porps',
  propsName: isCn ? '名称' : 'Name',
  propsDescription: isCn ? '说明' : 'Description',
  propsType: isCn ? '类型' : 'Type',
  propsDefault: isCn ? '默认值' : 'Default',
  propsOptions: isCn ? '可选值' : 'Options',
  events: isCn ? '事件' : 'events',
  eventsName: isCn ? '名称' : 'Name',
  eventsDescription: isCn ? '说明' : 'Description',
  slots: isCn ? '插槽' : 'slots',
  slotsName: isCn ? '名称' : 'Name',
  slotsDescription: isCn ? '说明' : 'Description',
  slotsType: isCn ? '参数' : 'Parameters',
  slotsSubtags: isCn ? '子标签' : 'Subtags',
  directives: isCn ? '指令' : 'directives',
  directivesName: isCn ? '名称' : 'Name',
  directivesDescription: isCn ? '说明' : 'Description',
  directivesType: isCn ? '参数' : 'Parameters'
}

const typeMap = {
  vue: ['Component', 'VNode', 'CSSProperties', 'StyleValue']
}

const reComponentName: ReComponentName = title => {
  return `${prefix}-${hyphenate(title)}`
}

const reWebTypesSource: ReWebTypesSource = title => {
  return { symbol: title }
}

const reDocUrl: ReDocUrl = (fileName, header, path) => {
  const docs = `https://www.vexipui.com/${lang}/components/`
  const hash = header ? `#${header.trim().replace(/\s+/g, '-').toLocaleLowerCase()}` : ''
  return `${docs}${path?.split('/')[2]}${hash}`
}

const reWebTypesType: ReWebTypesType = type => {
  const isPublicType = isCommonType(type)
  const symbol = getTypeSymbol(type)
  const isUnion = isUnionType(symbol)
  const module = findModule(symbol)

  return isPublicType || !symbol || isUnion ? type : { name: type, source: { symbol, module } }
}

function findModule(type: string): string | undefined {
  let result
  for (const key in typeMap) {
    const regExp = arrayToRegExp(typeMap[key as keyof typeof typeMap])
    const inModule = regExp.test(getTypeSymbol(type))

    if (inModule) {
      result = key
      break
    }
  }
  return result
}

const reAttribute: ReAttribute = (value, key) => {
  const str = value
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .replace(/^`(.*)`$/, '$1')
    .replace(/^~~(.*)~~$/, '')
    .replace(/<del>.*<\/del>/g, '')

  if (key === tbOptions.propsName && /^(-|—)+$/.test(str)) {
    return 'default'
  } else if (str === '' || /^(-|—)+$/.test(str)) {
    return undefined
  } else if (key === tbOptions.propsName && /v-model:(.+)/.test(str)) {
    const _str = str.match(/v-model:(.+)/)
    return _str ? _str[1] : undefined
  } else if (key === tbOptions.propsName && /v-model/.test(str)) {
    return 'model-value'
  } else if (key === tbOptions.propsName) {
    return str
      .replace(/\s*[\\*]\s*/g, '')
      .replace(/\B([A-Z])/g, '-$1')
      .toLowerCase()
  } else if (key === tbOptions.propsType) {
    return str
      .replace(/\bfunction(\(.*\))?(:\s*\w+)?\b/gi, 'Function')
      .replace(/\bdate\b/g, 'Date')
      .replace(/\([^)]*\)(?!\s*=>)/g, '')
      .replace(/(<[^>]*>|\{[^}]*}|\([^)]*\))/g, item => {
        return item.replace(/(\/|\|)/g, '=_0!')
      })
      .replace(/(\b\w+)\s*\|/g, '$1 /')
      .replace(/\|\s*(\b\w+)/g, '/ $1')
      .replace(/=_0!/g, '|')
      .replace(/`/g, '')
  } else if (key === tbOptions.propsOptions) {
    return /\[.+\]\(.+\)/.test(str) || /^\*$/.test(str)
      ? undefined
      : str.replace(/`/g, '').replace(/\([^)]*\)(?!\s*=>)/g, '')
  } else if (key === tbOptions.propsDefault) {
    return str ? str.replace(/`/g, '') : str
  } else {
    return str
  }
}

main({
  name: pkgName,
  version: currentVersion,
  entry: entryPath,
  outDir: 'dist',
  separator: '|',
  space: 2,
  reComponentName,
  reAttribute,
  reDocUrl,
  reWebTypesSource,
  reWebTypesType,
  tableRegExp:
    /#+\s+(.*\s*Props|.*\s*Events|.*\s*Slots|.*\s*Directives|.*\s*属性|.*\s*事件|.*\s*插槽|.*\s*指令|)\n+(\|?.+\|.+)\n\|?\s*:?-+:?\s*\|.+((\n\|?.+\|.+)+)/g,
  ...tbOptions
})
