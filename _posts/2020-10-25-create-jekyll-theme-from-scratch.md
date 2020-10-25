---
title: How to create Jekyll theme from scratch
layout: post
---
delete _layouts, assets, _includes and _sass dirs

# Hello world
create a _layouts folder and create a file named `home.html` add below content

```html
<html>
    Hello world!
</html>
```
And build using `bundle exec jekyll serve`
Remember that `index.markdown` has `layout: home` in it's frontmatter. Open http://127.0.0.1:4000/ in browser

# Using variables
Now that we have a scalaton structure we can start with our first task that is to list all blog posts when we open the website. Jekyll uses [Liquid template](https://jekyllrb.com/docs/liquid/) system. If you have experience with other templating engine (Jinja2, ) then you will be comfortable with it. Jekyll provides [many variables](https://jekyllrb.com/docs/variables/) which can be used in the templates. Let's showcase it with `site.title` which is in `_config.yml`

```html
<html>
    Welcome to {{ site.title }} by {{ site.author }}
</html>
```

TIP: install [Liquid](https://marketplace.visualstudio.com/items?itemName=sissel.shopify-liquid) extension in VS Code.
Note: Difference b/w `\{\%\- \-\%\}` and `\{\% \%\}` is that [earlier will strip the white space around it](https://stackoverflow.com/questions/57865720/shopify-liquid-differences-between-and)

# list all posts
```liquid
<html>
    <head>
        <title>{{ site.title }} </title>
    </head>
    <body>
        <header>
            <span>
                {{ site.title }}
            </span>
        </header>
        <h2> Posts </h2>
        <ul>
            {%- for post in site.posts -%}
                <li>
                    <span>
                        {{ post.date }}
                    </span> -
                    <span>
                        {{ post.title | escape }}
                    </span>
                </li>
            {%- endfor -%}
        </ul>
        <footer>
            <span>
                {{ site.author }} | {{ site.email }}
            </span>
        </footer>
    </body>
</html>
```