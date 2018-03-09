/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
/**zh-cn
 * 递归遍历一个对象, 去递归触发所有属性上已设置的getter(如何触发getter? 直接读就触发了~ 类似obj.xxx),
 * 将对象内部所有的嵌套属性都收集进'deep'中
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  // 遍历完后清空, seenObjects的作用只是在遍历过程中缓存各个响应式属性的id
  // 避免二次触发getter或循环引用
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // 当输入的val既不是数组也不是对象, 或者其被冻结时直接跳过
  // (对象被冻结的时候, 其不能拓展且其所有属性都不可配置, 不可写, 所以不需要响应式)
  // (别忘了 `&&` 运算符的优先级要大于 `||` 哟)
  if ((!isA && !isObject(val)) || Object.isFrozen(val)) {
    return
  }
  // 当val.__ob__存在时候, 代表此时val是响应式的, 将其加入seen
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    // 判断下是否已经存在, 若存在就直接return, 不再重复递归遍历其属性
    // 避免二次触发getter
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  // 递归遍历
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
