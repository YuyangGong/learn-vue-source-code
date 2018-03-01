# Vue源码学习

深入学习Vue源码, 具体到每个文件, 每个细节。

## 项目结构

- **`scripts`**: contains build-related scripts and configuration files. In most cases you don't need to touch them. However, it would be helpful to familiarize yourself with the following files:

  - `scripts/alias.js`: module import aliases used across all source code and tests.

  - `scripts/config.js`: contains the build configurations for all files found in `dist/`. Check this file if you want to find out the entry source file for a dist file.

- **`dist`**: contains built files for distribution. Note this directory is only updated when a release happens; they do not reflect the latest changes in development branches.

  See [dist/README.md](https://github.com/vuejs/vue/blob/dev/dist/README.md) for more details on dist files.

- **`flow`**: contains type declarations for [Flow](https://flowtype.org/). These declarations are loaded **globally** and you will see them used in type annotations in normal source code.

- **`packages`**: contains `vue-server-renderer` and `vue-template-compiler`, which are distributed as separate NPM packages. They are automatically generated from the source code and always have the same version with the main `vue` package.

- **`test`**: contains all tests. The unit tests are written with [Jasmine](http://jasmine.github.io/2.3/introduction.html) and run with [Karma](http://karma-runner.github.io/0.13/index.html). The e2e tests are written for and run with [Nightwatch.js](http://nightwatchjs.org/).

- **`src`**: contains the source code, obviously. The codebase is written in ES2015 with [Flow](https://flowtype.org/) type annotations.

  - **`compiler`**: contains code for the template-to-render-function compiler.

    The compiler consists of a parser (converts template strings to element ASTs), an optimizer (detects static trees for vdom render optimization), and a code generator (generate render function code from element ASTs). Note the codegen directly generates code strings from the element AST - it's done this way for smaller code size because the compiler is shipped to the browser in the standalone build.

  - **`core`**: contains universal, platform-agnostic runtime code.

    The Vue 2.0 core is platform-agnostic - which means code inside `core` should be able to run in any JavaScript environment, be it the browser, Node.js, or an embedded JavaScript runtime in native applications.

    - **`observer`**: contains code related to the reactivity system.

    - **`vdom`**: contains code related to vdom element creation and patching.

    - **`instance`**: contains Vue instance constructor and prototype methods.

    - **`global-api`**: as the name suggests.

    - **`components`**: universal abstract components. Currently `keep-alive` is the only one.

  - **`server`**: contains code related to server-side rendering.

  - **`platforms`**: contains platform-specific code.

    Entry files for dist builds are located in their respective platform directory.

    Each platform module contains three parts: `compiler`, `runtime` and `server`, corresponding to the three directories above. Each part contains platform-specific modules/utilities which are then imported and injected to the core counterparts in platform-specific entry files. For example, the code implementing the logic behind `v-bind:class` is in `platforms/web/runtime/modules/class.js` - which is imported in `entries/web-runtime.js` and used to create the browser-specific vdom patching function.

  - **`sfc`**: contains single-file component (`*.vue` files) parsing logic. This is used in the `vue-template-compiler` package.

  - **`shared`**: contains utilities shared across the entire codebase.

  - **`types`**: contains TypeScript type definitions

    - **`test`**: type definitions tests


## commit信息
* 文件中添加的注释
comment(file): xxxx
* 对某个总结文件夹的总结
summary(dir): xxxx
* 对某个文件源码注释或文件目录进行更新
update(file|dir): update xxxx