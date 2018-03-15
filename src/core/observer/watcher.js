/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
/**zh-cn
 * 一个watcher 解析一个表达式, 搜集依赖,
 * 并且在表达式的值改变的时候触发回调,
 * watcher常常用于$watch api和directives
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    // WHY: 开发环境直接设置expression为expOrFn的字符串形式？
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 解析表达式
    // 当expOrFn为函数时
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 此时expOrFn为路径, 如`obj.attr1`, parsePath将返回一个函数, 
      // 此函数接受一个对象为参数, 返回此对象相应属性(如上文中的obj.attr1)的值
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 是否立即触发, 如果lazy为true, 将立即以表达式的当前值触发回调
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 执行getter并重新收集依赖
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      // WHY： 这里this.user具体代表的是什么意思？开发环境？
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 如果deep为true, 则递归遍历value对象, 触发每个属性的getter
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  /**zh-cn
   * 给directive增加依赖
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 当已存在于newDepIds的id, 直接忽略
    if (!this.newDepIds.has(id)) {
      // 收集依赖dep的id及对象到newDepIds以及newDeps上
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // 检查此dep是否已经存在于id中,
      // 通过depIds, 来记录当前watcher已经订阅的dep,避免重复订阅dep
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  /**zh-cn
   * 清除依赖集合
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 当不存在于新生代依赖中就直接从dep中移除
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // 移除原本的老生代依赖, 并将原本的新生代依赖转换为老生代
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  /**zh-cn
   * 订阅者接口
   * 将在依赖改变时候调用
   */
  update () {
    /* istanbul ignore else */
    // lazy为true时, 不run, 设置dirty为true
    if (this.lazy) {
      this.dirty = true
    // 同步run
    } else if (this.sync) {
      this.run()
    // 放在队列中, nextTick的时候run
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  /**zh-cn
   * scheduler job接口
   * 将被scheduler调用
   */
  run () {
    if (this.active) {
      const value = this.get()
      // 
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        /**zh-cn
         * 当设置了watcher的deep为true, 或观察对象/数组时, 
         * 当值相同时, 应该同样也触发回调, 因为其属性可能被改变(引用没变)
         */
        isObject(value) ||
        this.deep
      ) {
        // set new value
        // 设置新value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  /**zh-cn
   * 获取watcher的value
   * 这仅仅在lazy watcher中才会用到
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  /**zh-cn
   * 收集此watcher的所有依赖
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  /**zh-cn
   * 将目前watcher从所有的依赖订阅列表中移除
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      /**zh-cn
       * 将目前的watcher从vm的watch列表中移除,
       * 这步操作性能开销较大, 当vm已经被移除时, 跳过这步
       */
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
