/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    // vm实例uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 用于避免vue实例被观察
    vm._isVue = true
    // merge options
    // 合并选项
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 优化内部组件实例
      // 动态选项的合并相当慢,
      // 并且其内部组件的选项也并不需要特殊处理
      initInternalComponent(vm, options)
    } else {
      // 合并选项
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    // 将自身挂载在_self上
    // 全局查了下没地方用到, 可能是为方便组件中模板内可以拿到vm实例
    // {{ _self }} 这种
    vm._self = vm
    // 顺序: 
    // 1. 初始化生命周期钩子
    // 2. 初始化事件
    // 3. 初始化渲染函数
    // 4. 执行beforeCreate钩子
    // 5. 初始化注入器
    // 6. 初始化状态
    // 7. 初始化provide
    // 8. 执行created钩子
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props 在data/props之前执行
    initState(vm)
    initProvide(vm) // resolve provide after data/props 在data/props之后执行
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 如果存在el, 则立即挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 初始化内部组件
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  // TODO: 做个缓存, 避免多次重复遍历查值
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
// 解析构造函数上的选项
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  // 递归解析
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    // 如果Ctor.super的super存在, 则会合并，导致不是同一个引用
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // super的选项改变了(不指向同一个引用)，不能使用原本的缓冲，需要重新merge生成
      // 把新生成的superOptions(由上面的resolveConstructorOptions生成)重新挂载到构造函数上
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 解析修改的选项(找不同)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // 更新基础的继承选项, 直接把modifiedOptions属性添加上去
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 这里打断了引用, 返回的是新的引用对象
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

// 解析出修改后的选项
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

// 删除重复数据
function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  // 比较lastest和sealed确保生命周期钩子在merge时没有重复
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      // 返回存在于extended的对象 或 不存在于sealed中的元素, 用于排除重复
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
