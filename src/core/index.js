import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'

// 初始化Vue全局API
initGlobalAPI(Vue)

// 在Vue原型上定义$isServer setter, 用于判断是否服务器端渲染
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 在Vue原型上定义$ssrContext, 用于判断服务器端渲染的环境(WHY: 什么是ssrContext)
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

Vue.version = '__VERSION__'

export default Vue
