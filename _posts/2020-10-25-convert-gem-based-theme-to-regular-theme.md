---
title: How to convert Jekyll gem based theme to regular theme
layout: post
---
To modify a jekyll theme, often it is easier to convert gem based theme to regular them which resides in the same repository as other content.

[Official Documentation](https://jekyllrb.com/docs/themes/#converting-gem-based-themes-to-regular-themes) is good place to start. This blog is mostly note for my future self.

_Note that making copies of theme files will prevent you from receiving any theme updates._

First let's find out what theme we are using. By default Jekyll uses `minima` theme. This information is in `_config.yml` file. 

Then open the directory where the gem is
```
$ open $(bundle info --path minima)
```

Copy below folders to root of the your blog's repository
```
_inclues
_layouts
_sass
assets
```

We are going to remove the theme's gem as dependency. But before that put dependency of the theme in `Gemfile` or our theme will be broken. (these can be found in `.gemspec` file of the theme)

```ruby
# file: Gemfile
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag", "~> 2.7"
end
```

Also we need to do add them in `_config.yml` too

```yaml
# file: _config.yml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
```
Don't forget to run `bundle update`. 

Finally remove reference to theme gem
 - open `Gemfile` and remove `gem "minima", "~> 2.5"`.
 - Open `_config.yml` and remove `theme: minima`.

And we are done. 