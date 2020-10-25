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

Note: We are going to take care of CSS later

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
                        <a href="{{ post.url | relative_url }}">
                            {{ post.title | escape }}
                        </a>
                        
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

# Post page
Now we have our list page, let's create a layout to see a single post. Create a file `post.html` in `_layouts` as follows

Note: By default Jekyll will render the post even if there is no layout for it.

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
        <h2> {{ page.title }} </h2>
        <p>
            {{ page.content }}
        </p>
        <footer>
            <span>
                {{ site.author }} | {{ site.email }}
            </span>
        </footer>
    </body>
</html>

```

We may also want to add pages (think like `About` page or `Portfolio` page). They’re useful for standalone content (content which is not date based or is not a group of content such as staff members or recipes). Let's create a simple layout for same.

# File: page.html
```liquid
# page.html
```

Let's create a 404 page also `404.html`
```liquid
# 404.html
```

# Refactoring layouts
By now you may have noticed that we are repeating header, footer everywhere. A template can _extend_ other templates so we can put common stuff in one file. Let's refactor it.

First let's create a directory `_includes` where we will put our common elements like header and footer. Create `header.html` and `footer.html`

TODO: copy paste files

Create a default layout `default.html` which will be base of other layouts.

Modify home.html, page.html and post.html to inherit from default layout
