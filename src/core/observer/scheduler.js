/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

// 用于避免循环更新
export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
/**zh-cn
 * 重置scheduler的状态
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  // 生产环境下不重置circular
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
 /**zh-cn
  * 依次出队列并且执行watcher, 直至队列清空
  */
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  /**zh-cn
   * 排序的目的有:
   * 1. 以 父组件到子组件 的顺序依次更新组件(因为父组件在子组件之前渲染)
   * 2. 组件中用户的watch应该在渲染的watch之前执行(因为用户的watch在渲染watch之前创建)
   * 3. 当父组件的watch执行时组件被销毁,  忽略子组件的watch
   */
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  /**zh-cn
   * 不缓存队列长度, 因为可能在执行队列中的watcher的时候,
   * 其watch给队列动态push了状态
   */
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    /**zh-cn
     * 在非生产环境中检查并停止循环更新
     * 之前我们设置了has[i]为null, 如果在此处watch中
     */
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  // 在更新状态前保持队列的拷贝, 以便在重置调度器状态后可以用于调用相关生命周期钩子
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  // 需在执行钩子之前reset状态,因为可能在下面的生命周期钩子里再次修改数据(WHY？如果再次修改数据, 会flush么)
  resetSchedulerState()

  // call component updated and activated hooks
  // 调用组件相关生命周期钩子(activated在updated之前)
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  // 触发devtools钩子
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}
// 执行updated钩子
function callUpdatedHooks (queue) {
  // 先进的后执行？, 为什么要缓存, 而且从高位向低位执行？
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
/**zh-cn
 * 将一个在patch过程中已经activated的kept-alive组件排入队中
 * 此队列将在整棵完整的树都被Patch后进行相关操作
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  /**zh-cn
   * 通过设置inactive, 可以方便render函数依赖其检查相关vm是否在inactive树中
   */
  vm._inactive = false
  activatedChildren.push(vm)
}

// 执行队列中所有元素的activated钩子
function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  // 如果has[id]不为null就代表已经进过队列, 为避免watch循环执行, 直接跳过
  if (has[id] == null) {
    has[id] = true
    // 当不在flushing状态时, 将watcher直接push进队列中
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      /**zh-cn
       * 当正在flushing时, 将watcher按照id顺序插入到队列中, 但
       * 若此watcher执行过, 就放在目前正在执行的索引后的位置
       */
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // 如果waiting不存在就, nextTick时执行我们的queue
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
