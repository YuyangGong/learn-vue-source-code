/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
// 判断是否是必须具有闭合标签
import { isNonPhrasingTag } from 'web/compiler/util'

// Regular Expressions for parsing tags and attributes
/**zh-cn
 * 用于解析标签和属性的正则表达式
 * 可以匹配, `class='123'`, `class="123"`, `disabled`等格式的属性字符串,
 * 其分为`class`(属性名), `=`(等于号), `123`(属性值)三部分, 后面俩部分为整体时都是可选的
 * 比如`disabled`也是合法的属性字符串, 同时这三部分之间可以有空白字符(如空格),
 * 且此正则对这三部分用捕获分组进行了捕获, 如果是通过exec调用, 会返回具有捕获内容的数组, 具体可以见[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)
 * TODO: 检查为什么连等于号(=)也要捕获, 为什么第三四个捕获分组后面的接着的单双引号要匹配1至多个(不是一个就够了么)
 */
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
// could use https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
// but for Vue templates we can enforce a simple charset
/**zh-cn
 * 标签名(包括html内置的标签如<div>, 和我们自定义的组件名如<custome-component>)
 * 规范规定可以[qname](https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName)的
 * 注: qname是qualified name 的简写,其由名字空间(namespace)前缀(prefix)以及冒号(:),还有一个元素名称构成
 * eg: `<xsl:component></xsl:component>`, 其中`xsl`为命名空间前缀, `component`为元素名称
 * 前者 xsl 和 后者 component 应该是合法的ncname(字母或下划线 (_) 字符开头，后接 XML 规范中允许的任意字母、数字、重音字符、变音符号、句点 (.)、连字符 (-) 和下划线 (_) 的组合)
 * 但是Vue模板中我们强制使用简单的字符集(与ncname相比, 不包括重音字符、变音符号)
 */
// TODO: 正则表达式字符集合中不需要对元字符`.`进行转义, 其本身就代表字面意思
// 根据https://en.wikipedia.org/wiki/Regular_expression#Basic_concepts
// 可知, 将-放在[]的第一位或第二位则是字面量，而不是元字符, 
// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp#character-classes
// 而且在字符集中, `.`表达的是其字面意义,不再是通配符
// 所以, ncname可以改成 '[a-zA-Z_][\\w.-]'
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being pased as HTML comment when inlined in page
/**zh-cn
 * 在部分安卓webview中, 会将内联script标签中的<!--识别为html注释, 直接把后续的内容全部注释了...
 * 所以这里转义了前一个连字符(-), 以避免这种情况发生(具体可见(#7298)[https://github.com/vuejs/vue/issues/7298])
 */
const comment = /^<!\--/
const conditionalComment = /^<!\[/

/**zh-cn
 * 正则表达式的捕获分组是否异常
 * 用于避免FF中的一个[bug](https://bugzilla.mozilla.org/show_bug.cgi?id=369778)
 */
let IS_REGEX_CAPTURING_BROKEN = false
'x'.replace(/x(.)?/g, function (m, g) {
  IS_REGEX_CAPTURING_BROKEN = g === ''
})

// Special Elements (can contain anything)
/**zh-cn
 * 特殊的元素(可以包含任何内容)
 */
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t'
}

const encodedAttr = /&(?:lt|gt|quot|amp);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#10|#9);/g

// #5992
/**zh-cn
 * 根据[规范](https://www.w3.org/TR/html5/syntax.html#element-restrictions)紧接着pre, textarea标签后的第一个换行符应该被忽略, 详情见(#5992)[https://github.com/vuejs/vue/issues/5992]
 */
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

/**zh-cn
 * 解析HTML字符串
 */
export function parseHTML (html, options) {
  const stack = []
  const expectHTML = options.expectHTML
  const isUnaryTag = options.isUnaryTag || no
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index = 0
  let last, lastTag
  while (html) {
    last = html
    // Make sure we're not in a plaintext content element like script/style
    /**zh-cn
     * 确定不在纯文本内容元素中(如script/style/textarea)
     * 这里只需满足, 1.之前没有标签 或 2.不在纯文本内容元素中
     */
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')
      /**zh-cn
       * 当第一个字符就是'<'的时候, 处理以下五种情况
       * 若非'<'开头 或 不符合以下五种情况, 则按text处理
       *  - 注释 eg: <!-- -->
       *  - 条件注释 eg: <![if !IE]><![endif]>
       *  - 文档类型声明 eg: <!DOCTYPE html>
       *  - 开始标签 eg: <div class="example">
       *  - 闭合标签 eg: </div>
       */
      if (textEnd === 0) {
        // Comment:
        // 注释:
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')
          // TODO 这里的逻辑不可能等于0, 只需要判断是否大于0就OK
          // 当注释的后半部分('-->'')存在时执行以下逻辑
          if (commentEnd >= 0) {
            if (options.shouldKeepComment) {
              // 截取注释内容
              options.comment(html.substring(4, commentEnd))
            }
            advance(commentEnd + 3)
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 条件注释, 详见(wiki)[http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment]
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')
          /**zh-cn
           * 同样的, 当有选择注释的结束部分才走以下逻辑
           * 不做任何处理, 直接调用advance, 修改当前Index和截断html
           * 相当与直接跳过了选择注释
           */
          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // Doctype:
        // 文档类型声明, 也直接跳过
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // End tag:
        // 处理闭合标签
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // Start tag:
        // 处理开始标签
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          // 紧接在pre,textarea后的第一个换行符'\n'要忽略
          if (shouldIgnoreFirstNewline(lastTag, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        // rest如果是这四种情况(注释,条件注释,开始标签,闭合标签)之一就跳出, 否则一直循环
        // 这里没有包括doctype文档类型声明(因为其只能位于文档开头)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          /**zh-cn
           * 若非以上四种情况, 则把'<'当做纯文本处理
           */
          next = rest.indexOf('<', 1)
          /**zh-cn
           * 这里当目前的'<'后续没有'<'时, 直接跳出了, 没有做任何处理
           * 但是, 后续会判断当前字符串与last(上次)字符串是否相等, 
           * 相等的话就直接将'<'及其以后整个字符串当做纯文本来处理
           */
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        // 获取text
        text = html.substring(0, textEnd)
        advance(textEnd)
      }
      /**zh-cn
       * 当不存在<时, 将整个html字符串当做纯文本
       */
      if (textEnd < 0) {
        text = html
        html = ''
      }
      /**zh-cn
       * 处理纯文本
       */
      if (options.chars && text) {
        options.chars(text)
      }
    } else {
      /**zh-cn
       * 只有当 栈中有元素, 且其为纯文本内容元素(script/style/textarea)时才会进这一步
       */
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      /**zh-cn
       * 实际标签名是不限制大小写的, 这里把stackedTag转化为小写, 主要目的是统一缓存的键值
       */
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        // TODO: stackedTag不是一定为纯文本内容元素么
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            // 同comment这个正则, 用来避免[#7298](https://github.com/vuejs/vue/issues/7298)
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        /**zh-cn
         * 忽略开头的'\n' 这里是用于textarea
         */
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        /**zh-cn
         * 处理纯文本
         */
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }
    /**zh-cn
     * 当html与上次保留的html相等时, 代表没有被处理, 不是以上类型
     * 此时的整个html都当做纯文本处理
     * 注: 若此时栈未空, 则代表还有标签未闭合
     */
    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`)
      }
      break
    }
  }

  // Clean up any remaining tags
  // 清除栈中剩下的标签
  parseEndTag()

  /**zh-cn
   * 除去解析完的html字符串, 并手动设置索引为当前索引
   */
  function advance (n) {
    index += n
    html = html.substring(n)
  }
  /**zh-cn
   * 解析开始标签, 如'<div class="test">'
   * 如果语法合法, 则返回一个对象, 包含了
   *  - tagName 标签名
   *  - attrs 属性数组
   *  - start 开始查找的字符位于html中位置
   *  - end 结束查找的字符位于html中位置
   *  - unarySlash 为空字符串'' 或者 slash'/'
   */
  function parseStartTag () {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length)
        // 将匹配attr得到的整个数组(包含匹配到的完整字符，匹配分组等)都push进attrs
        match.attrs.push(attr)
      }
      if (end) {
        // 为空字符串'' 或者 slash'/'
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  /**zh-cn
   * 执行开始标签进栈相关的逻辑
   */
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      /**zh-cn
       * 当上一个标签是p, 且目前的标签是一个必须闭合的标签时候, 将前一个p当做自闭合的p标签
       * eg: `<p><div>`这种情况, 将p当做自闭合标签
       */
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      /**zh-cn
       * 如果上一个标签可以省略闭合标签, 且目前的开始标签与其一致, 将其做结束标签处理(因为这种标签不能相互嵌套)
       * eg: `<li><li>`
       */
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }
    // TODO 为什么要用或判断下unarySlash呢, 可能是自定义组件中用到
    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs = new Array(l)
    // 逐个解析属性
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
      // 用IS_REGEX_CAPTURING_BROKEN判断来避免FF中的一个[bug](https://bugzilla.mozilla.org/show_bug.cgi?id=369778)
      // TODO 这里判断了下原字符串内包不包含双引号, 如果包含则代表原本预期的args[3]就为'', 不需要删除
      // 但是为什么不判断下单引号呢
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        if (args[3] === '') { delete args[3] }
        if (args[4] === '') { delete args[4] }
        if (args[5] === '') { delete args[5] }
      }
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
    }
    // 当非自闭和标签时将tag对象进栈
    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs })
      lastTag = tagName
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }
  /**zh-cn
   * 解析闭合标签, 如'</div>'
   */
  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index
    // 统一处理成小写
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
    }

    // Find the closest opened tag of the same type
    // 查找最近的相同类型的开始标签
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      // 如果没有传入标签名, 则记为0
      pos = 0
    }
    if (pos >= 0) {
      // Close all the open elements, up the stack
      // 关闭栈上所有的中间标签(处于tagName开始标签之后的未闭合标签)
      // 如果pos小于i(即存在于上述情况)或tagName不存在(TODO 什么情况下会不存在, 猜测是结尾), 就在非生产环境中做出警告(标签未正常闭合)
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        // end函数存在时候, 则用end来处理闭合标签的逻辑
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      // 移除栈上存在于pos之后未合法闭合的开始标签
      stack.length = pos
      // pos不为0时, 即栈未清空, 还有其他标签时, 设置lastTag为栈最上面的标签
      lastTag = pos && stack[pos - 1].tag
    // 当pos小于0的时候, 代表其栈中未找到匹配的开始标签, 则判断其是否为自闭合标签(</br>, </p>, WHY？只有这俩种标签可以自闭合么？)
    // 处理br标签的逻辑
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    // 处理p闭合标签的逻辑
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
