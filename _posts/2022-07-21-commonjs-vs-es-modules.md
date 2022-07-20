---
title: Developer Rhapsody
layout: post
---

Recently I started learning javascript. we are removing difference between frontend vs backend programmer. I believe most people can do both.

Node JS started and used CommonJS (previously called ServerJS) module system. It loads modules sync. It was fine when reading from file is predictable and long running process on server. Browser cannot load modules and dependencies sync as it would block the UI. So ES Modules were born. they work with both Node (v13.2.0) and browser (script type="module" attribute)

## CommonJS module
Let's create a CommonJS module for calculating fibonanchi (why not?) and use it in an application.


```js
// fib.js
function fib(n) {
    if (n == 0 || n == 1) return n;
    return fib(n - 1) + fib(n - 2);
}

module.exports = { fib } // Shorthand property names https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer
```

And let's use it our app
```js
// app.js

const { fib } = require('./fib.js'); // ".js" is unnecessory using destructuring assignment https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
console.log(fib(10));
```
```
$ node app.js
55
```

Here we notice use of `module.exports` Indicating CommmonJS module

## ES Modules
let's write same with ES modules, we only need to change `modules.export` to `expoert ...` and `require` to `import` statements.
```mjs
// fib.mjs
function fib(n) {
    if (n == 0 || n == 1) return n;
    return fib(n - 1) + fib(n - 2);
}

export { fib } // Shorthand property names https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer
```

And let's use it in our app
```js
// app.mjs
import { fib } from './fib.mjs';
console.log(fib(10));
```
```
$ node app.mjs 
55
```

See how we are using extension `.mjs`. Node give SyntaxError if we try to use ES Modules marking them as such.


```
(node:26455) Warning: To load an ES module, set "type": "module" in the package.json or use the .mjs extension.
...
SyntaxError: Cannot use import statement outside a module
```
So we can either use `.mjs` extension or we can set type as module in package.json file.

There we have it. CommonJS and ES modules. ES Modules are future but there is lots of existing code written and CommonJS will be here for long time.