/* @flow */
// CHECKOUT 

import { makeMap } from 'shared/util'

/**zh-cn
 * 用于匹配自闭合html标签
 */
export const isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
)

// Elements that you can, intentionally, leave open
// (and which close themselves)
/**zh-cn
 * 可以省略闭合标签或标签可以自闭合
 */
export const canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
)

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
/**zh-cn
 * 包含[html5](https://html.spec.whatwg.org/multipage/indices.html#elements-3)和[whatwg Phrasing Content](Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content)中
 * 所有必须闭合的标签
 */
export const isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
  'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
  'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
  'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
  'title,tr,track'
)
