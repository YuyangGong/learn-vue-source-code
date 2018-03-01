/* @flow */

import { isObject, isDef } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 */
/**zh-cn
 * 用于渲染v-for列表的运行时辅助函数
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  /**zh-cn
   * v-for 可以遍历以下四种类型的数据
   * 1. 数组
   * 2. 字符串
   * 3. 数字n, (此种情况效果类似[1, 2, ..., n])
   * 4. 对象
   */
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    /**zh-cn
     * Object.keys同for..in一样, 不能保证遍历顺序
     * [for-in遍历顺序问题](http://w3help.org/zh-cn/causes/SJ9011)
     */
    keys = Object.keys(val)
    ret = new Array(keys.length)
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i]
      ret[i] = render(val[key], key, i)
    }
  }
  if (isDef(ret)) {
    (ret: any)._isVList = true
  }
  return ret
}
