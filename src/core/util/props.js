/* @flow */

import { warn } from './debug'
import { observe, observerState } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

// 验证prop
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]
  // 检查propsData对象自身上是否有相应的key(父组件是否向子组件传值)
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]
  // handle boolean props
  // boolean类型的props
  if (isType(Boolean, prop.type)) {
    // Boolean类型的prop, 当其子实例没有默认值, 而父实例也没有传值的时候设置为false
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    // prop.type不包括字符串, 但是传入的值中有字符串, 且其为空字符串或其值与连字符命名法的key相等,
    // 则我们可以认定其value为true
    } else if (!isType(String, prop.type) && (value === '' || value === hyphenate(key))) {
      value = true
    }
  }
  // check default value
  // 简单默认value, WHY: 为什么这里不用!hasOwn(propsData, key)判断？
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    // 因为默认值是一个新的副本, 需要observer去观察它
    const prevShouldConvert = observerState.shouldConvert
    observerState.shouldConvert = true
    observe(value)
    observerState.shouldConvert = prevShouldConvert
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    // 跳过weex循环列表子组件的验证(WHY: 那为什么不跳过web平台的循环列表呢？要跳过的话怎么判断是循环列表？)
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

/**
 * Get the default value of a prop.
 */
/**zh-cn
 * 获得prop的默认值
 */
// TODO: 这个propOptions是否可以改成propOption呢, 毕竟不是数组
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  // 如果在prop选项上用户没有定义default的话，返回undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  // 当default的类型是对象或者数组, 却没有返回函数时, 发出警告,
  // isObject内部使用的是typeof, 所以虽然某种意义上function也是对象,
  // 不过这里被排除了。
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  // WHY?
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  // 当default是函数时, 且要求的prop的type不是函数时候,
  // 可以认定其为生成defualt值的工厂函数,
  // 这时, 手动执行其并返回(绑定this为vm)
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
/**zh-cn
 * 判断一个prop是否是合法的, 若不合法则发出警告
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  // 必填
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  // 不必填时, 传入null或undefined(WHY: 这是合法的么？为什么不用hasOwnProperty判断呢？)
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  // WHY: type也能为true么???
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    // 非数组的情况下, 转换为数组
    if (!Array.isArray(type)) {
      type = [type]
    }
    // 遍历整个type数组, 直至找到valid的类型, 或到数组尾部
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }
  if (!valid) {
    warn(
      `Invalid prop: type check failed for prop "${name}".` +
      ` Expected ${expectedTypes.map(capitalize).join(', ')}` +
      `, got ${toRawType(value)}.`,
      vm
    )
    return
  }
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}
// 包含五种JS基本类型的正则
const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

// 判断值(value)是否为我们期望的类型(type)
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  // 这里传的type是一个相应的构造函数, 我们要获取其字符串形式的名称
  // eg: Number -> 'Number'
  const expectedType = getType(type)
  // 检查是否是五种基本类型之一
  if (simpleCheckRE.test(expectedType)) {
    // 五种基本类型之一的话, 则可以直接用typeof判断其具体的类型
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    // 可能是基本类型包装对象, 
    // 比如 new String('test'), 这种用new实例化基本类型构造函数创建出来的对象,
    // 这种情况上面直接对比其typeof返回的字符串就不行了, 因为基本类型包装对象
    // 都会返回'object', 这时候我们通过instanceof判断是否是相应构造函数的实例即可
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  // 如果要求的类型是对象, 则判断其是否是纯对象(避免RegExp, Array之类内置对象的干扰)
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
/**zh-cn
 * 用匹配函数字符串名的方法去检查内置的类型,
 * 因为当跨vms/irames时, 简单的对比检查会失败。
 * eg: iframe1的Boolean构造函数和iframe2的Boolean构造函数不相等...
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

// 判断type与fn是否是同一类型的构造函数, 
// 如果fn是一个数组, 则判断其内部是否包含与type同类型的元素
function isType (type, fn) {
  if (!Array.isArray(fn)) {
    return getType(fn) === getType(type)
  }
  for (let i = 0, len = fn.length; i < len; i++) {
    if (getType(fn[i]) === getType(type)) {
      return true
    }
  }
  /* istanbul ignore next */
  return false
}
