/* @flow */

// can we use __proto__?
// 判断环境中是否可以使用__proto__
// __proto__属性本来只是火狐中的一个私有属性, 后来主流大厂都是实现了,
// 因此也被纳入了ES2015(ES6)规范中,详见[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/proto)
export const hasProto = '__proto__' in {}

// Browser environment sniffing
export const inBrowser = typeof window !== 'undefined'
export const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && /msie|trident/.test(UA)
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isEdge = UA && UA.indexOf('edge/') > 0
export const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android')
export const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios')
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge

// Firefox has a "watch" function on Object.prototype...
// 火狐在Object.prototype上面挂载了一个内置的watch方法, 我们可以直接使用
export const nativeWatch = ({}).watch

/**zh-cn
 * 判断addEventListener的第三个参数(options选项) 是否支持passive
 * passive为true时, UI和事件监听触发执行时候, 其JS代码会和UI渲染在俩个线程执行,
 * 此时, 事件监听的回调JS触发时, 将不会阻塞UI。
 * 这里的判断很巧妙, 先给options对象的passive属性设置一个getter, 在读取passive属性时
 * 执行代码设置我们的supportsPassive标记为true, 只有在支持passive的浏览器中, 进行
 * 事件监听时, 其内部才会去读取opts的passive属性, 触发getter, 设置标记为真
 */
export let supportsPassive = false
if (inBrowser) {
  try {
    const opts = {}
    Object.defineProperty(opts, 'passive', ({
      get () {
        /* istanbul ignore next */
        supportsPassive = true
      }
    }: Object)) // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts)
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
/**zh-cn
 * 用于判断是否是服务器端渲染, 因为vue可能在vue-server-renderer设置VUE_ENV
 * 之前被引入, 所以返回一个函数, 在适合的时候手动执行判断是否服务器端渲染
 */
let _isServer
export const isServerRendering = () => {
  // 避免多次判断, 以首次判断为准
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }
  }
  return _isServer
}

// detect devtools
// 判断浏览器环境中是否加载了vue devtools开发插件
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
// 判断是否原生
export function isNative (Ctor: any): boolean {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

// 判断环境是否支持Symbol (Why: 为什么还要额外判断Reflect?)
export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)

/**zh-cn
 * 原生的Set存在时候就直接使用原生, 否则使用polyfill
 */
let _Set
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  /**zh-cn
   * 非标准的Set实现, 仅仅支持String, Number类型
   */
  _Set = class Set implements SimpleSet {
    set: Object;
    constructor () {
      this.set = Object.create(null)
    }
    has (key: string | number) {
      /**zh-cn
       * 因为JS中对象的key只能为字符串, 如果传入一个数字,
       * 也会隐式转换为字符串, 需要注意。
       * eg:
       * ```JavaScript
       *   const set = new Set()
       *   set.add(5)
       *   set.has('5') // 在原生种返回的是false, 在我们内部的实现里返回的是true
       * ```
       * 当然, 这对Vue的执行并无影响, 毕竟我们业务代码中对象的读取值
       */
      return this.set[key] === true
    }
    add (key: string | number) {
      this.set[key] = true
    }
    clear () {
      this.set = Object.create(null)
    }
  }
}

interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}

export { _Set }
export type { SimpleSet }
