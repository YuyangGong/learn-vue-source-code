/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'

export function handleError (err: Error, vm: any, info: string) {
  if (vm) {
    let cur = vm
    // 从错误捕获的当前组件, 将错误向其父组件冒泡, 冒泡过程中, 如果有钩子返回false, 则停止冒泡
    while ((cur = cur.$parent)) {
      const hooks = cur.$options.errorCaptured
      if (hooks) {
        for (let i = 0; i < hooks.length; i++) {
          try {
            const capture = hooks[i].call(cur, err, vm, info) === false
            if (capture) return
          } catch (e) {
            globalHandleError(e, cur, 'errorCaptured hook')
          }
        }
      }
    }
  }
  // 如果上面的钩子throw了error的话, 加上这里的handle会总共handle俩次
  globalHandleError(err, vm, info)
}

function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // 这里catch捕获经errorHandle处理后throw的错误(如果有的话) 
      logError(e, null, 'config.errorHandler')
    }
  }
  logError(err, vm, info)
}

// 打印错误
function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  // 只有在浏览器或weex环境(其他环境不打印, 如node)中, console对象存在时 打印错误
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err)
  } else {
    throw err
  }
}
