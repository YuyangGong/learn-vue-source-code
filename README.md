# Vue源码学习

深入学习Vue源码, 具体到每个文件, 每个细节。

## 项目结构

- **`scripts`**: 与Vue构建相关的脚本和配置文件。

  - `scripts/alias.js`: 在所有源代码和测试中使用的模块导入别名。

  - `scripts/config.js`: `dist/`文件夹内所有文件的构建配置

- **`dist`**: 构建后的分发文件, 包括用于不同场景的vue文件, 具体可见`dist/README.md`(仅仅是发布的版本(release), 不包括devlopment分支上的新改动)

- **`flow`**: contains type declarations for [Flow](https://flowtype.org/). These declarations are loaded **globally** and you will see them used in type annotations in normal source code.

- **`packages`**: contains `vue-server-renderer` and `vue-template-compiler`, which are distributed as separate NPM packages. They are automatically generated from the source code and always have the same version with the main `vue` package.

- **`test`**: contains all tests. The unit tests are written with [Jasmine](http://jasmine.github.io/2.3/introduction.html) and run with [Karma](http://karma-runner.github.io/0.13/index.html). The e2e tests are written for and run with [Nightwatch.js](http://nightwatchjs.org/).

- **`src`**: Vue的源代码, 用ES2015(ES6)语法书写, 并用[Flow](https://flowtype.org/)进行静态类型检查.

  - **`compiler`**: 编译器, 用于将Vue中的template转换为render函数

    The compiler consists of a parser (converts template strings to element ASTs), an optimizer (detects static trees for vdom render optimization), and a code generator (generate render function code from element ASTs). Note the codegen directly generates code strings from the element AST - it's done this way for smaller code size because the compiler is shipped to the browser in the standalone build.

  - **`core`**: Vue核心的运行时代码, 具有通用性, 与平台无关

    - **`observer`**: 响应式系统相关代码

    - **`vdom`**: 虚拟dom创建相关的代码和补丁

    - **`instance`**: 实例构造函数和其原型上的方法

    - **`global-api`**: 全局api

    - **`components`**: 通用的抽象组件, 目前仅仅包括keep-alive

  - **`server`**: contains code related to server-side rendering.

  - **`platforms`**: contains platform-specific code.

    Entry files for dist builds are located in their respective platform directory.

    Each platform module contains three parts: `compiler`, `runtime` and `server`, corresponding to the three directories above. Each part contains platform-specific modules/utilities which are then imported and injected to the core counterparts in platform-specific entry files. For example, the code implementing the logic behind `v-bind:class` is in `platforms/web/runtime/modules/class.js` - which is imported in `entries/web-runtime.js` and used to create the browser-specific vdom patching function.

  - **`sfc`**: 包含单文件组件(`.vue`)的解析逻辑, 使用于`vue-template-compiler`npm包。

  - **`shared`**: 包括通用的工具函数

  - **`types`**: 包括TypeScript类型定义

    - **`test`**: 类型定义的相关测试


## commit信息
* 文件中添加的注释
comment(file): xxxx
* 对某个总结文件夹的总结
summary(dir): xxxx
* 对某个文件源码注释或文件目录进行更新
update(file|dir): update xxxx