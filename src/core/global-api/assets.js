/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  /**zh-cn
   * 创建asset注册方法, 如Vue.component, Vue.filter, Vue.directive
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 获取Vue的aaset
      if (!definition) {
        // 挂载在Vue的options上, 如Vue.options.components
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 有name取name, 没有name取id
          definition.name = definition.name || id
          // Vue.options._base指向Vue, 这里实际上调用的是Vue.extend
          // WHY: 为什么要用这种形式绕一圈 不直接调用呢Vue.extend呢?
          definition = this.options._base.extend(definition)
        }
        // directive的简写情况, 包装成内部可用的directive定义对象
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 挂载在Vue的options上, 如Vue.options.components
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
