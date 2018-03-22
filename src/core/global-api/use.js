/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果已经install, 则直接返回, 不重复install
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 保存额外参数
    const args = toArray(arguments, 1)
    // 把当前的构造函数加入到args头部
    args.unshift(this)
    // 先判断plugin.install, 具有更高有限级
    // 若plugin.install是函数, 则绑定this为plugin, 调用此函数 
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    // 若plugin自身为函数, 则绑定this为null, 调用此函数
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
