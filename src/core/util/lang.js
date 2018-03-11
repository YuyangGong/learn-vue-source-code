/* @flow */

/**
 * Check if a string starts with $ or _
 */
 // 检查一个字符串是否以`$`或`_`开头
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
/**zh-cn
 * 定义指定对象的一个属性,
 * 与直接obj[key]不同, 可以设置其是否可枚举
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
// 解析简单的路径(如`obj.attr`)
const bailRE = /[^\w.$]/
export function parsePath (path: string): any {
  // 包含不合法字符的时候直接返回undefined
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  // 返回一个函数, 接受对象作为参数, 返回此对象具体path的值
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
