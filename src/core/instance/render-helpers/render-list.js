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
     * Object.keys的[规范](http://www.ecma-international.org/ecma-262/6.0/#sec-object.keys)
     * 中指出, If an implementation defines a specific order of enumeration for the for-in statement, the same order must be used for the elements of the array returned in step 4(笔者注: 这里的第四步指的是Object.keys内部实现的第四步).
     * 如上, 规范中规定当for-in的返回有**特定顺序**时, Object.keys的遍历顺序应当与for-in一致
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
