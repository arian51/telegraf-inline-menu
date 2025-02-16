import {ContextFunc, ContextKeyFunc, ContextKeyIndexArrFunc} from '../generic-types'
import {prefixEmoji, PrefixOptions} from '../prefix'

import {getRowsOfButtons} from './align'
import {KeyboardPart} from './types'

type OptionsFunc = ContextFunc<(string | number)[] | {[key: string]: string}>

interface SelectButtonOptions {
  columns?: number;
  maxRows?: number;
  currentPage?: number;
  textFunc: ContextKeyIndexArrFunc<string>;
  hide?: ContextKeyFunc<boolean>;
}

export function generateSelectButtons(actionBase: string, options: readonly (string | number)[], selectOptions: SelectButtonOptions): KeyboardPart {
  const {textFunc, hide, columns, maxRows, currentPage} = selectOptions
  const buttons = options
    .map(o => String(o))
    .map((key, i, arr) => {
      const action = `${actionBase}-${key}`
      const textKey = async (ctx: any): Promise<string> => textFunc(ctx, key, i, arr)
      const hideKey = async (ctx: any): Promise<boolean> => hide ? hide(ctx, key) : false
      return {
        text: textKey,
        action,
        hide: hideKey
      }
    })

  return getRowsOfButtons(buttons, columns, maxRows, currentPage)
}

export interface SelectButtonCreatorOptions extends PrefixOptions {
  getCurrentPage?: ContextFunc<number | undefined>;
  textFunc?: ContextKeyIndexArrFunc<string>;
  prefixFunc?: ContextKeyIndexArrFunc<string>;
  isSetFunc?: ContextKeyFunc<boolean>;
  multiselect?: boolean;
  hide?: ContextKeyFunc<boolean>;
}

export function selectButtonCreator(action: string, optionsFunc: OptionsFunc, additionalArgs: SelectButtonCreatorOptions): (ctx: any) => Promise<KeyboardPart> {
  const {getCurrentPage, textFunc, prefixFunc, isSetFunc, multiselect} = additionalArgs
  return async (ctx: any) => {
    const optionsResult = await optionsFunc(ctx)
    const keys = Array.isArray(optionsResult) ? optionsResult : Object.keys(optionsResult)
    const currentPage = getCurrentPage && await getCurrentPage(ctx)
    const fallbackKeyTextFunc = Array.isArray(optionsResult) ?
      (_ctx: any, key: string) => key :
      (_ctx: any, key: string) => optionsResult[key]
    const textOnlyFunc = textFunc || fallbackKeyTextFunc
    const keyTextFunc = async (...args: any[]): Promise<string> => prefixEmoji(textOnlyFunc, prefixFunc || isSetFunc, {
      hideFalseEmoji: !multiselect,
      ...additionalArgs
    }, ...args)
    return generateSelectButtons(action, keys, {
      ...additionalArgs,
      textFunc: keyTextFunc,
      currentPage
    })
  }
}

export function selectHideFunc(keyFromCtx: (ctx: any) => string, optionsFunc: OptionsFunc, userHideFunc?: ContextKeyFunc<boolean>): ((ctx: any) => Promise<boolean>) {
  return async (ctx: any) => {
    const key = keyFromCtx(ctx)
    const optionsResult = await optionsFunc(ctx)
    const keys = Array.isArray(optionsResult) ? optionsResult : Object.keys(optionsResult)
    if (!keys.map(o => String(o)).includes(key)) {
      return true
    }

    if (userHideFunc && await userHideFunc(ctx, key)) {
      return true
    }

    return false
  }
}
