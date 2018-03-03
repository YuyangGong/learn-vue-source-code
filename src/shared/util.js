/* @flow */

export const emptyObject = Object.freeze({})

// these helpers produces better vm code in JS engines due to their
// explicitness and function inlining
/**zh-cn
 * 这些具有自解释性的辅助函数可以使得代码更清晰
 */
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

export function isTrue (v: any): boolean %checks {
  return v === true
}

export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * Check if value is primitive
 */
/**zh-cn
 * 检查是否是基本类型, 仅包括string, number, symbol, boolean
 * 不包括undefined和null
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
/**zh-cn
 * 检查输入是否是对象(只用于检查符合JSON语法类型的输入, 故不考虑一些特殊情况, 如function)
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value e.g. [object Object]
 */
/**zh-cn
 * 用于获取类型字符串, 比如[object Object],详见[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
 */
const _toString = Object.prototype.toString

export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
/**zh-cn
 * 严格的对象类型检查, 仅仅检查是否是**纯**对象(即不包括Date, Function, Regexp等内置的拓展对象类型)
 */
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 */
/**zh-cn
 * 检查一个值是否是合法的数组索引
 * 其parseFloat转换为数字后应满足
 *   - 大于零
 *   - 整数
 *   - 有限
 * 因为用于内部, 其输入的可预见的, 不会出现`123adsf`这种情况, 故没有判断相关逻辑
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * Convert a value to a string that is actually rendered.
 */
/**zh-cn
 * 将输入转换为实际渲染的字符串
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert a input value to a number for persistence.
 * If the conversion fails, return original string.
 */
/**
 * 将val转换为数字返回, 如果转换失败则返回原字符串
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
/** zh-cn
 * 创建一个map, 并返回一个函数, 此函数用于检查其输入是否存在于map中
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  const map = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 */
/**zh-cn
 * 检查输入是否是内置的tag(内置的tag只有slot,component俩种),
 * 大小写不敏感(与html保持一致, html标签的大小写本身也不敏感)
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if a attribute is a reserved attribute.
 */
/**zh-cn
 * 检查输入是否是Vue保留属性
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array
 */
/**
 * 移除array中的一个item(这里没有对NaN做处理, 应该是内部使用是不会出现包含NaN的情况)
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether the object has the property.
 */
/**
 * 检查对象**自身**属性中是否具有指定的属性
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */
/**zh-cn
 * 创建指定纯函数(指不依赖于且不改变它作用域之外的变量状态的函数)的缓冲版本的函数
 * 类似的概念还有用于递归优化的[memoization](https://en.wikipedia.org/wiki/Memoization)
 */
export function cached<F: Function> (fn: F): F {
  const cache = Object.create(null)
  return (function cachedFn (str: string) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 */
/**zh-cn
 * 将**连字符(-)连接命名法**字符串转换为**驼峰命名法**字符串
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 */
/**zh-cn
 * 首字符大写
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 */
/**zh-cn
 * 将**驼峰命名法**字符串转换为**连字符(-)连接命名法**字符串
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Simple bind, faster than native
 */
/**zh-cn
 * 手工实现的bind, 比原生的要快
 * 关于为什么原生的bind慢,可以看这篇[回答](https://stackoverflow.com/questions/8656106/why-is-function-prototype-bind-slow)
 * 总结一下就是, 原生bind会判断一下`this instance of bound`如果是的话就实例化`bound`(不是目标函数, 而是bind自身)函数
 * **instance**的判断造成了性能损失(如果你研究过instance的话, 你应该知道其是沿着原型链遍历查找的)
 */
export function bind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l: number = arguments.length
    /**zh-cn
     * 在部分运行环境中call速度要比apply更快
     * 所以这里做了一个判断, 而不是全部直接都用apply
     * 关于这一点优化, underscore做到了极致(极端?), 有兴趣的同学可以看看underscore的optimizeCb源码
     */
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }
  // record original fn length
  /**zh-cn
   * 记录原始函数的形参数量(原生的bind会绑定原始函数的形参数量)
   * eg: 
   * ```JavaScript
   *   function originFn (a, b, c) {} // 三个形参
   *   originFn.length // 3, 返回的是形参数量
   *   bind(originFn).length // 3, 返回的是上面原始函数的形参数量
   * ```
   * 而这里boundFn.length会返回1, 即其自身的形参数量,
   * 故用_length来保留原始形参的数量, 以备以后可能用到
   */
  boundFn._length = fn.length
  return boundFn
}

/**
 * Convert an Array-like object to a real Array.
 */
/**zh-cn
 * 将类数组转换为真正的数组
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 */
/**zh-cn
 * 将源对象(_from)自身及其原型链上所有可遍历的属性对直接浅拷贝到目标对象(to)上
 * 如果有同名的键, from的属性将覆盖to的属性
 */
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
/**zh-cn
 * 合并数组中所有对象自身及其原型链上的可枚举属性到一个对象中
 * 如果有同名的键, 数组中索引靠后的元素的属性将覆盖靠前的
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/)
 */
/**zh-cn
 * 一个不执行任何操作的函数
 * 其可选的三个参数用于Flow检查, 代表可传参数数量0~3.
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 */
/**zh-cn
 * 一个返回false的函数, 同样有3个可选参数
 */
export const no = (a?: any, b?: any, c?: any) => false

/**
 * Return same value
 */
/**zh-cn
 * 直接返回输入的第一个参数
 */
export const identity = (_: any) => _

/**
 * Generate a static keys string from compiler modules.
 */
/**zh-cn
 * TODO
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
/**zh-cn
 * 检查俩个值是否宽松相等
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        // 如果都是数组, 就先比较数组的长度, 再比较每个数组元素是否宽松相等
        return a.length === b.length && a.every((e, i) => {
          // 递归比较是否宽松相等
          return looseEqual(e, b[i])
        })
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        // 如果都是对象, 则先比较是否具有相同数量的可枚举属性, 再比较每个属性的值是否宽松相等
        return keysA.length === keysB.length && keysA.every(key => {
          // 递归比较是否宽松相等
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    /**zh-cn
     * 因为当俩个值都不是对象的时候, 通过String转换为字符串后对比判断是否相等
     * 所以这里与JS的宽松等于(==)表现不太一样。
     * 比如: 
     *  * undefined == null 但是 String(undefined) !== String(null)
     *  * true != 'true' 但是String(true) === String('true')
     *  * Symbol != 'Symbol()' 但是String(Symbol) === String('Symbol()')
     */
    return String(a) === String(b)
  } else {
    return false
  }
}

export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
/**zh-cn
 * 确保函数只能调用一次
 */
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
