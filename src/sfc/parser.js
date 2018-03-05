/* @flow */

/**zh-cn
 * deindent库, 用于删去缩进(由空格' '或'\t'组成), 其源码可见[deindent](https://github.com/yyx990803/de-indent/blob/master/index.js)
 * eg: deindent('    <div>test</div>') -> '<div>test</div>'
 */
import deindent from 'de-indent'
import { parseHTML } from 'compiler/parser/html-parser'
import { makeMap } from 'shared/util'

/**zh-cn
 * 匹配换行
 *  - 在window中是\r\n
 *  - 在linux/unix/OS X中是\n
 */
const splitRE = /\r?\n/g
/**zh-cn
 * 匹配任意除了换行符以外的字符
 */
const replaceRE = /./g
/**zh-cn
 * 判断是否是特殊的html标签(script, style, template)
 */
const isSpecialTag = makeMap('script,style,template', true)

type Attribute = {
  name: string,
  value: string
};

/**
 * Parse a single-file component (*.vue) file into an SFC Descriptor Object.
 */
/**zh-cn
 * 将一个单文件组件解析成SFC(single file compoent的缩写)描述对象
 */
export function parseComponent (
  content: string,
  options?: Object = {}
): SFCDescriptor {
  const sfc: SFCDescriptor = {
    /**zh-cn
     * style和customBlocks可以有多个, 但是template和script只能有一个
     */
    template: null,
    script: null,
    styles: [],
    customBlocks: []
  }
  let depth = 0
  let currentBlock: ?SFCBlock = null

  /**zh-cn
   * 处理开始标签的相关逻辑
   */
  function start (
    tag: string,
    attrs: Array<Attribute>,
    unary: boolean,
    start: number,
    end: number
  ) {
    // 嵌套层级为0时(即最外层标签, 只有四种情况, style script template以及自定义标签)
    if (depth === 0) {
      currentBlock = {
        type: tag,
        content: '',
        start: end,
        /**zh-cn
         * 将属性键值对由数组的形式转换为对象的形式, 将无值的属性,视值为true的props(TODO: write a post to explain what different between props and attribute)
         */
        attrs: attrs.reduce((cumulated, { name, value }) => {
          cumulated[name] = value || true
          return cumulated
        }, {})
      }
      // style, template, script时
      if (isSpecialTag(tag)) {
        checkAttrs(currentBlock, attrs)
        if (tag === 'style') {
          // 支持多个style标签
          sfc.styles.push(currentBlock)
        } else {
          // 仅仅支持单例的template和script
          sfc[tag] = currentBlock
        }
      } else { // custom blocks
        /**zh-cn
         * 自定义模块直接推入customBlocks
         * 比如`vue-i18n`的`<i18n></i18n>`
         */
        sfc.customBlocks.push(currentBlock)
      }
    }
    // 非自闭合标签, 嵌套层级加1
    if (!unary) {
      depth++
    }
  }

  /**zh-cn
   * 检查标签的属性, 并将其比较通用的四种(Vue-loader内置支持的四种)处理并直接挂载在block上, 方便后续从block上取出来使用
   * 我们也能使用除了这四种之外的属性, 不过需要遍历attrs去查找对比name
   */
  function checkAttrs (block: SFCBlock, attrs: Array<Attribute>) {
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i]
      if (attr.name === 'lang') {
        block.lang = attr.value
      }
      if (attr.name === 'scoped') {
        block.scoped = true
      }
      if (attr.name === 'module') {
        block.module = attr.value || true
      }
      if (attr.name === 'src') {
        block.src = attr.value
      }
    }
  }

  /**zh-cn
   * 处理闭合标签的相关逻辑
   */
  function end (tag: string, start: number, end: number) {
    // 嵌套1层, 且currentBlock存在的时候, 代表我们最外层标签成功匹配到了闭合标签
    // 1. 如果嵌套大于1层, 则中间还有额外的开始标签(eg: `<script><div></script>`), 这是不合规的, 这里直接depth--跳过了
    // 2. 如果currentBlock不存在, 则代表最外层不是(style, script, template, 用户自定义块(customBlock))这四种之一, 也跳过
    if (depth === 1 && currentBlock) {
      currentBlock.end = start
      // 去除匹配的内容(即`<script>.....</script>`中间的内容)的每行缩进
      let text = deindent(content.slice(currentBlock.start, currentBlock.end))
      // pad content so that linters and pre-processors can output correct
      // line numbers in errors and warnings
      /**zh-cn
       * 为避免代码风格检查器和预处理器可以正确的输出有问题和经过的代码的行数,
       * 对其进行填充
       */
      if (currentBlock.type !== 'template' && options.pad) {
        text = padContent(currentBlock, options.pad) + text
      }
      currentBlock.content = text
      currentBlock = null
    }
    depth--
  }

  function padContent (block: SFCBlock, pad: true | "line" | "space") {
    if (pad === 'space') {
      // 将前置用于缩进的所有符号都替换为空格
      return content.slice(0, block.start).replace(replaceRE, ' ')
    } else {
      // 这里统一将 \r?\n 替换为 \n(或//\n)
      const offset = content.slice(0, block.start).split(splitRE).length
      const padChar = block.type === 'script' && !block.lang
      // WHY： 在换行符前用俩个//代表什么？为什么只有原生script才这样用？
        ? '//\n'
        : '\n'
      return Array(offset).join(padChar)
    }
  }

  /**zh-cn
   * 因为处理的SFC, 所以这里只给传了options.start和options.end俩个方法
   */
  parseHTML(content, {
    start,
    end
  })

  return sfc
}
