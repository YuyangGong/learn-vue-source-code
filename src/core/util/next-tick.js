/* @flow */
/* globals MessageChannel */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIOS, isNative } from './env'

const callbacks = []
let pending = false

// 执行并清空回调队列
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  // TODO: copies.length也没有缓存, 理论上是不会被修改的, 应该缓存呀
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using both micro and macro tasks.
// In < 2.4 we used micro tasks everywhere, but there are some scenarios where
// micro tasks have too high a priority and fires in between supposedly
// sequential events (e.g. #4521, #6690) or even between bubbling of the same
// event (#6566). However, using macro tasks everywhere also has subtle problems
// when state is changed right before repaint (e.g. #6813, out-in transitions).
// Here we use micro task by default, but expose a way to force macro task when
// needed (e.g. in event handlers attached by v-on).
let microTimerFunc
let macroTimerFunc
let useMacroTask = false

// Determine (macro) Task defer implementation.
// Technically setImmediate should be the ideal choice, but it's only available
// in IE. The only polyfill that consistently queues the callback after all DOM
// events triggered in the same loop is by using MessageChannel.
/* istanbul ignore if */
/**zh-cn
 * 决定macro task的具体实现函数, 优先使用setImmediate(立即执行, 但是只有IE支持)
 * 其次尝试采用MessageChannel做polyfill实现类似setImmediate的功能
 * 以上都不支持, 则最后回退到setTimeout(fn, 0)
 */
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  macroTimerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else if (typeof MessageChannel !== 'undefined' && (
  isNative(MessageChannel) ||
  // PhantomJS
  MessageChannel.toString() === '[object MessageChannelConstructor]'
)) {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = flushCallbacks
  macroTimerFunc = () => {
    port.postMessage(1)
  }
} else {
  /* istanbul ignore next */
  macroTimerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

// Determine MicroTask defer implementation.
// 决定micro task的具体实现函数
// 使用原生的Promise.then, 若原生不支持则回退到macro task的实现
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  microTimerFunc = () => {
    p.then(flushCallbacks)
    // in problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    // 在IOS上, 部分有问题的UIWebViews中, 执行Promise.then将回调push进
    // microTask的队列中后, 其队列不会立即执行并清空, 而是需要等到浏览器
    // 需要执行其他任务时才情况microtask队列, 因此这里通过setTimeout设置一个timmer
    // 强制浏览器执行macrotask队列
    if (isIOS) setTimeout(noop)
  }
} else {
  // fallback to macro
  // 若原生Promise不被支持, 则回退到macro task的实现
  microTimerFunc = macroTimerFunc
}

/**
 * Wrap a function so that if any code inside triggers state change,
 * the changes are queued using a Task instead of a MicroTask.
 */
/**zh-cn
 * 包装一个函数, 使得其任何内部代码触发状态改变时, 其改变应该
 * 被排进macro任务队列, 而不是micro任务队列
 */
export function withMacroTask (fn: Function): Function {
  return fn._withTask || (fn._withTask = function () {
    useMacroTask = true
    const res = fn.apply(null, arguments)
    useMacroTask = false
    return res
  })
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将cb包装下push进回调队列中
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  /**zh-cn
   * 还没挂起时, 执行挂起操作(其会在下一个micro或macro事件中清空callbacks)
   */
  if (!pending) {
    pending = true
    if (useMacroTask) {
      macroTimerFunc()
    } else {
      microTimerFunc()
    }
  }
  // $flow-disable-line
  // 如果cb不存在, 则返回一个promise, 会在下一次micro(或macro) task中被执行
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
