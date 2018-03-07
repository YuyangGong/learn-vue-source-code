/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */
// def用于设置一个object的属性, 但与直接`object[key] = value`不同的是
// def方法可以通过第四个参数设置是否可枚举, 默认否
import { def } from '../util/index'


const arrayProto = Array.prototype
// 以Array的原型prototype创建对象
// 使用`const arrayMethods = {};arrayMethods.__proto__ = arrayProto`也可以实现同样的效果
export const arrayMethods = Object.create(arrayProto)

// Vue监听的数组方法
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原始的方法, 从其原型链上拿到。
  const original = arrayProto[method]
  // 给arrayMethods定义方法,　相当于外包装一层
  def(arrayMethods, method, function mutator (...args) {
    // 执行数组原型方法, 并保存结果(此时this指向的数组自身已经发生了变化)
    const result = original.apply(this, args)
    // 获取观察器
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果有将插入元素插入数组, 则通过observeArray观察变化
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知改变发生
    ob.dep.notify()
    return result
  })
})
