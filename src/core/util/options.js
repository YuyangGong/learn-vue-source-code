/* @flow */

import config from '../config'
import { warn } from './debug'
import { nativeWatch } from './env'
import { set } from '../observer/index'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
// 将父子选项合并的策略
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
/**zh-cn
 * WHY: 只有在非开发环境才给el和propsData赋值合并策略？
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
// 用以递归合并俩个对象的辅助函数
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal
  const keys = Object.keys(from)
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    toVal = to[key]
    fromVal = from[key]
    // to的同名属性不会被from覆盖
    if (!hasOwn(to, key)) {
      // set, 确保新增加的属性也是响应式的
      set(to, key, fromVal)
    // 都为纯对象时候, 递归merge
    } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
// 合并数据或函数
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  // 当vm不存在时, 一般用于Vue.extend()中
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    // 在Vue.extend的合并中, 父子都应该为函数
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    /**zh-cn
     * 当父子都存在时, 返回一个函数, 合并数据的逻辑都放在这个函数当中,
     * 如果相应的val是函数, 则调用后合并
     */
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    // 当vm存在时, 返回一个函数
    // 在此函数中将默认数据与实例数据合并
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

// 合并data选项的策略
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
      // vm不存在且childVal不为函数时, 直接返回parentVal
      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 */
/**zh-cn
 * 合并钩子函数为数组
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal
    ? parentVal
      // 父钩子在前, 子钩子在后
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
/**zh-cn
 * 合并Assets(包括component, filter, directive)
 */
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  // 以原型的方式来继承父选项中的属性
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    // 直接将childVal上的所有属性map到res中, 如有同名属性
    // childVal中的会"覆盖"res原本的属性(其实通过res.__proto__.xxx也可以取到, 或Object.getPropertyOf(res).xxx)
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
/**zh-cn
 * watch选项
 * 将父子之间的watch, merge为一个数组
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  // 如果支持火狐上的Object.prototype.watch, 就可以直接不合并watcher, 返回空对象即可
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  // watchers的merge为以下三步
  // 1. 创建一个空对象, 对parentVal进行**浅**拷贝
  // 2. 将拷贝后的对象与childVal进行合并, 其中如果具有同名属性则合并为数组
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */
/**zh-cn
 * 其他选项的合并策略(如果存在同名属性, 后者会覆盖前者, 是完全覆盖, Obj.__proto__也取不到的那种)
 * 包括props, methods, inject, computed
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 */
/**zh-cn
 * 默认策略, 优先使用子组件的值, 但其不存在时才使用父组件的值
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
/**zh-cn
 * 验证组件名是否合法
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

export function validateComponentName (name: string) {
  // 字母开头, 数字、字母、下划线(_)、连字符(-)组成
  if (!/^[a-zA-Z][\w-]*$/.test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'can only contain alphanumeric characters and the hyphen, ' +
      'and must start with a letter.'
    )
  }
  // 检查是否是内置标签名或保留标签名
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
/**zh-cn
 * 将用户传入的props, 统一转换为对象格式
 * 若传入的是数组, 比如 ['propA', 'propB'] ->
 * { propA: {type: null}, propB: {type: null} }
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  // 数组的输入, 如['prop1', 'prop2']
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        // 统一转换成驼峰命名法
        name = camelize(val)
        // 转换成对象, 不限定类型
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  // 纯对象的输入(既不是数组又不是纯对象的话, 则返回空对象)
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      // 转换为驼峰命名法
      name = camelize(key)
      // 非纯对象比如Number, Bollean之类的, 为传入的类型, 要包装下
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  // TODO: 貌似和每个normalizeProps的风格没有统一，而且为什么要统一转换为 驼峰命名法？
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
/**zh-cn
 * 统一inject的格式
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      // 当值不为纯对象时, 则此时值代表是其源属性
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
/**zh-cn
 * 统一directives的格式
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      // 如果是函数, 统一转换为对象的格式
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

// 开发环境中, 传入选项的对象, 如果不是纯对象(TODO: write what is plain object), 则发出警告 
function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
/**zh-cn
 * 合并俩个选项对象, 主要用于实例化和继承
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }
  // WHY: 什么情况下child会是函数？
  if (typeof child === 'function') {
    child = child.options
  }
  // 统一props, inject, directives的格式
  normalizeProps(child, vm)
  normalizeInject(child, vm)
  normalizeDirectives(child)
  // extend
  const extendsFrom = child.extends
  // merge的顺序为 parent -> 组件extends -> 组件mixin
  if (extendsFrom) {
    parent = mergeOptions(parent, extendsFrom, vm)
  }
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
/**zh-cn
 * 解析asset(目前只有directive, filter, component三种)
 * 子实例可能有时候需要使用到定义在其祖先链上的asset, 命名方式可能不同
 * 调用例子: resolveAsset(this.$options, 'filters', id, true)
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  // 首先检查options自身的assets是否具有相关id
  // 检查id源字符串
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  // 将id转换成驼峰命名法后再检查一次
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  // 将id转换成帕斯卡命名法后再检查一次
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
