/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function };
  silent: boolean;
  productionTip: boolean;
  performance: boolean;
  devtools: boolean;
  errorHandler: ?(err: Error, vm: Component, info: string) => void;
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;
  ignoredElements: Array<string | RegExp>;
  keyCodes: { [key: string]: number | Array<number> };

  // platform
  isReservedTag: (x?: string) => boolean;
  isReservedAttr: (x?: string) => boolean;
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void;
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;

  // legacy
  _lifecycleHooks: Array<string>;
};

// 默认配置对象, Vue.config
export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // 选项合并策略
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  // 是否取消所有的日志和警告
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  // 是否在控制台显示生产环境模式的提升
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   */
  // 是否允许devtool检查代码 
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   */
  // 是否开启性能追踪
  performance: false,

  /**
   * Error handler for watcher errors
   */
  // 指定组件的渲染和观察期间未捕获错误的处理函数
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  // 为 Vue 的运行时警告赋予一个自定义处理函数。
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  // 忽略在 Vue 之外的自定义元素 (e.g. 使用了 Web Components APIs)
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // 给 v-on 自定义键位别名
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  /**zh-cn
   * 检查组件注册的标签名是否是保留标签名(此flag依赖于平台, 后期可能重写)
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  // 同上
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  // 检查一个标签是否是位置元素
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  // 获得元素的命名空间
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  // 转换成特定平台所用的标签
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  /**zh-cn
   * 检查一个attr必须使用prop绑定, 比如value,
   * 依赖于平台
   */
  mustUseProp: no,

  /**
   * Exposed for legacy reasons
   */
  // 暴露用于遗留问题
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
