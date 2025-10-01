---
title: The Un-Abstracted Frontend
layout: post
---
## Building a Modern React App from Scratch (No Vite, No Next.js!)
Grounded Development: Why the "Magic" Needs to Stop
If you're new to modern JavaScript, running npx create-react-app or npx create-vite feels like pure magic. In seconds, you have a working app!

But what actually converts your cool ES6 consts and your funky JSX into browser-friendly code?

We're going to strip away the abstractions and build a clean, predictable development environment using just npm, webpack (the Bundler), and Babel (the Transpiler). We will build the pipeline in three phases, adding a new capability in each step.

## Phase 1: The Vanilla JS Core (Handling Modern JavaScript)
Our first goal is simple: Get a modern JS file to run in the browser.

### 1. Project Initialization and Structure
Every modern project starts here.

```Bash

# Create the folder and start npm
mkdir grounded-app
cd grounded-app
npm init -y

# Create the source and output directories
mkdir src dist
```
### 2. The Core Tools: webpack and Babel
We need a bundler to combine files and a transpiler to convert modern JS.

```bash

# Install bundler/server tools and Babel core
npm install --save-dev \
  webpack webpack-cli webpack-dev-server \
  @babel/core babel-loader @babel/preset-env
```
### 3. The Code: Modern JS
Let's use an arrow function that older browsers might not understand.

src/index.js

```js

const greet = (name) => {
    console.log(`Hello, ${name}! This is modern JS.`);
};

document.addEventListener('DOMContentLoaded', () => {
    greet('Grounded Developer');
});
```
4. Configuration for Transpilation
We tell Babel what transformations to apply, and we tell webpack how to use Babel.

.babelrc (In the project root)

```JSON
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": "defaults"
      }
    ]
  ]
}
```

webpack.config.js (Minimal Setup)

```js

const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      // THE BABEL RULE: Apply babel-loader to all .js files outside node_modules
      {
        test: /\.js$/, 
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
    ],
  },
  mode: 'development'
};
```
What happens: webpack bundles the file, and the babel-loader ensures the arrow function is converted to a browser-safe function() {} along the way.

## Phase 2: Handling Assets (CSS and Images)
A frontend app isn't just JavaScript. Now we teach webpack to handle other file types using Loaders and Plugins.

### 5. Adding Assets and Loaders
We need loaders for CSS and a plugin to manage our HTML file.

```bash

# Install asset loaders and the HTML plugin
npm install --save-dev style-loader css-loader html-webpack-plugin
```
### 6. Configuration for HTML and CSS
A. HTML Plugin: We use html-webpack-plugin to generate the output HTML and inject the script tag automatically.
index.html (Update the entry point to be served as the template)

```html

...
<body>
    <div id="app"></div>
    </body>
...
```
B. webpack.config.js (Adding the asset rules)
```js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); 

module.exports = {
  // ... (entry, output, devServer, mode remain the same)

  module: {
    rules: [
      // ... (Babel rule remains)
      
      // NEW CSS RULE
      {
        test: /\.css$/,
        // Loaders run R-L: css-loader resolves imports, style-loader injects into DOM
        use: ['style-loader', 'css-loader'],
      },
      // NEW IMAGE/ASSET RULE (using webpack 5's built-in Asset Module)
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource', // Copies the file to 'dist' and provides the URL
      },
    ],
  },
  
  // NEW PLUGIN SECTION
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'), 
      filename: 'index.html',
    }),
  ],

  // ... (devServer remains the same)
};
```
### 7. The Final npm Scripts
We create our convenient scripts to start the server and run the final production build.

package.json (Scripts section)

```json

"scripts": {
  "build": "webpack --mode production",
  "start": "webpack serve --open --mode development"
},
```
## Phase 3: Layering React (JSX Transformation)
Finally, we introduce React and its primary feature, JSX.

### 8. Installing React and the JSX Preset
We need the actual React libraries and the special Babel preset to handle JSX.

```bash

# Install React core libraries
npm install react react-dom

# Install the Babel preset for JSX
npm install --save-dev @babel/preset-react
```
### 9. Configure Babel and webpack for JSX
We update the configs to recognize JSX files and syntax.

.babelrc (Add the React preset)

```json

{
  "presets": [
    "@babel/preset-react", // <-- Now handles JSX syntax!
    ["@babel/preset-env", { "targets": "defaults" }]
  ]
}
```
webpack.config.js (Update to include the .jsx extension)

```js

// ...
  module: {
    rules: [
      // Updated test regex to include .jsx files
      {
        test: /\.(js|jsx)$/, 
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
      // ... (asset rules remain)
    ],
  },
  
  resolve: {
    // Allows importing files with .js or .jsx extensions without specifying them
    extensions: ['.js', '.jsx'], 
  },
// ...
```
### 10. Write Your React Code
Our code is now built on the new standard.

src/App.js

```js

import React from 'react';

const App = ({ title }) => {
  // JSX in action!
  return <h1>{title}</h1>;
};

export default App;
```
src/index.js

```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app');
    const root = ReactDOM.createRoot(container);
    
    root.render(
        <App title="Final Grounded Setup Complete!" />
    );
});
```
**Final Thoughts**: The End of the Magic
What you have now is the entire build pipeline for a modern single-page application.

The "magic" of frameworks like Vite and Next.js is simply that they pre-configure these 10 steps for you in a highly optimized way. By building it yourself, you now understand exactly what is happening under the hood. It's good to have a predictable development environment.