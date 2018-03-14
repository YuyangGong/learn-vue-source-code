/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 返回实例上所有的属性名(不包括原型上的属性, 但是包括自身不可枚举的属性）
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
/** zh-cn
 * 当设置了一个响应式的属性, 默认被设置的新值也会被转化为响应式的 
 * 然而当传递props时，其可能是一个嵌套的被frozen的数据结构,
 * 转化它将会影响优化, 所以我们不强制转化它
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
/* zh-cn
 * 观察者实例用于观察被观察对象(有点绕...), 其会将被观察对象的
 * 属性转化为getter/setters, 用以收集依赖并分发更新
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 给value绑定__ob__属性为this(当前的Observer实例), __ob__不可枚举
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  /**zh-cn
   * 遍历对象自身的每个可枚举属性并将其转换为getter/setters
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  /**zh-cn
   * 观察数组每一项
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
/* zh-cn
 * 通过连接原型链的方式对target对象进行补充, 使target可以获取到src上的方法和属性(同名方法无法获取, 会被shadow)
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
/** zh-cn
 * 通过定义不可枚举属性的方式对target对象进行补充, 同名情况下src会覆盖target
 */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**zh-cn
 * 尝试为传入的value创建一个observer实例,
 * 如果成功observed则返回这个新的observer实例,
 * 如果value已经被observe过, 则返回已经存在的observer实例
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 不需要observe对象(isObject内部是用typeof判断的, 也包括Array)以外的类型和vm实例
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果已经被观察过就返回已经存在的observe实例, 避免重复
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  // 满足以下5点才回对value进行观察
  // 1. 状态中设置的shouldConvert为ture
  // 2. 非服务器端渲染
  // 3. 数组或纯对象
  // 4. 对象(数组)可拓展, (没有被Object.seal 或 Object.freeze限制), 可以创建新属性
  // 5. 不是Vue实例
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  // 如果是作为根节点数据, 并且当前value能够被observe,
  // 则ob.vmCount增1, 以正确记录数量
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 定义对象上的一个响应式属性
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 创建一个dep实例
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 若此属性不可配置, 直接返回。 
  // 不可配置代表此属性, 无法修改, 也无法删除, 其是**固定的**, 不需要响应式.
  // 而且, 当对不可配置的属性进行defineProperty时, 也会报如`Cannot redefine property`的error。
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 拿到用户预定义的getter/setter(如果有的话)
  const getter = property && property.get
  const setter = property && property.set

  // 根据shallow标记, 决定是否对其val也进行观察
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // 这里的get和set本质上操作的都是val, 利用词法作用域保存在context中
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 当值没改变时, 直接return跳过 (后面那个判断用于NaN)
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      // WHY: 只有非生产环境才能使用customSetter?
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 这是的setter是用于预定义的setter, 如果存在则调用此setter
      if (setter) {
        setter.call(obj, newVal)
      // 若setter不存在, 直接将新值赋值给val
      } else {
        val = newVal
      }
      // val发生了改变, 重新observe
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
/**zh-cn
 * 设置对象属性。
 * 如果设置的是对象原本不存在的属性, 将会触发修改通知
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果设置的是对象具体索引的值, 通过splice来做修改
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 如果存在于对象上, 但是不存在于其Object原型上, 则直接赋值。
  // 为什么这里不用hasOwn呢？原型链中间部分的也可以覆盖？
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // 避免在运行时给Vue实例或根data设置响应式属性, 
  // 应该在其data选项中声明
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 当target不是被观察的对象时, 直接设置其key
  if (!ob) {
    target[key] = val
    return val
  }
  // 设置的是原本object上不存在的属性的话, 需要定义其为响应式,
  // 并触发改变通知
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
/**zh-cn
 * 删除一个属性并且在必要时触发改变
 */
export function del (target: Array<any> | Object, key: any) {
  // 数组, 且key为索引的话, 直接splice删除
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果不存在其对象自身上, 则直接return。
  if (!hasOwn(target, key)) {
    return
  }
  // 删除相关属性
  delete target[key]
  if (!ob) {
    return
  }
  // 触发通知
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
/**zh-cn
 * 当数组被touch时, 触发各个数组元素的depend(如果有的话),
 * 不同于普通Object, 数组的索引并不能设置getter/setter
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
