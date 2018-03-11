/* @flow */

import config from '../config'
import { noop } from 'shared/util'

export let warn = noop
export let tip = noop
export let generateComponentTrace = (noop: any) // work around flow check
export let formatComponentName = (noop: any)

// debug相关的功能嘛, 生产环境中不能使用
if (process.env.NODE_ENV !== 'production') {
  // 判断是否有console对象
  const hasConsole = typeof console !== 'undefined'
  // 将横线或下划线分隔命名法转换为帕斯卡命名法
  // eg: 'my-custom-component' -> 'MyCustomComponent'
  const classifyRE = /(?:^|[-_])(\w)/g
  const classify = str => str
    .replace(classifyRE, c => c.toUpperCase())
    .replace(/[-_]/g, '')

  warn = (msg, vm) => {
    const trace = vm ? generateComponentTrace(vm) : ''

    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace)
    } else if (hasConsole && (!config.silent)) {
      console.error(`[Vue warn]: ${msg}${trace}`)
    }
  }

  tip = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg}` + (
        vm ? generateComponentTrace(vm) : ''
      ))
    }
  }

  // 获取组件名, 若设置name则用name, 否则使用文件名
  formatComponentName = (vm, includeFile) => {
    // 根节点直接返回<root>
    if (vm.$root === vm) {
      return '<Root>'
    }
    const options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm || {}
    let name = options.name || options._componentTag
    const file = options.__file
    if (!name && file) {
      // 匹配文件名
      const match = file.match(/([^/\\]+)\.vue$/)
      name = match && match[1]
    }

    return (
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }

  // 以二分法的思路来完成repeat字符串, 算法复杂度为O(logN),
  // 如果是用i++来递增的话,算法复杂度是O(N)
  const repeat = (str, n) => {
    let res = ''
    while (n) {
      if (n % 2 === 1) res += str
      if (n > 1) str += str
      n >>= 1
    }
    return res
  }

  // 生成组件追踪 
  generateComponentTrace = vm => {
    if (vm._isVue && vm.$parent) {
      const tree = []
      let currentRecursiveSequence = 0
      while (vm) {
        if (tree.length > 0) {
          const last = tree[tree.length - 1]
          // 判断是否是同一组件实例化的vm, 如果是的话代表其递归中, 记录递归次数
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++
            vm = vm.$parent
            // 递归组件不push进队列, 直接跳过
            continue
          // 判断队列中的头部是否是递归组件, 如果currentRecursiveSequence大于0, 则是
          // 此时, 修改此递归组件在tree中存放的结构, 并重置sequence参数
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence]
            currentRecursiveSequence = 0
          }
        }
        // 从子vm到父vm依次push进队列
        tree.push(vm)
        vm = vm.$parent
      }
      return '\n\nfound in\n\n' + tree
        .map((vm, i) => `${
          i === 0 ? '---> ' : repeat(' ', 5 + i * 2)
        }${
          Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm)
        }`)
        .join('\n')
    } else {
      return `\n\n(found in ${formatComponentName(vm)})`
    }
  }
}
