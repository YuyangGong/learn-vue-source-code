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
// 这一步就是从array.__proto__ -> Array.prototype 转换为了 
// array.__proto__ -> arrayMethods   arrayMethods.__proto__ -> Array.prototype
// 为什么非要再把Array.prototype放在链上呢？
// 因为vue只代理(拦截)methodsToPatch里的七种方法, 其他的原型方法还是要在链上拿的, 不连接的话可就拿不到了~
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
// 代理methodsToPatch中的七种存在于Array.prototype方法, 实现响应式
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原始的方法, 从其原型链上拿到。
  const original = arrayProto[method]
  // 给arrayMethods定义方法,　相当于外包装一层, 在正常的Array.prototype.method中, 且设置其不可枚举
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
    // 观察所有新加入的元素
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知改变发生
    ob.dep.notify()
    return result
  })
})
