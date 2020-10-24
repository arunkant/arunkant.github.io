---
layout: post
title: How to start a personal blog with Jekyll and Github Pages
---

Many people want to write a blog but don't know where to begin. This post will explain how to use Jekyll to create a simple blog site and host it using Github Pages.

# What is Jekyll
[Jekyll](https://jekyllrb.com/) is a static site generator. It takes the content written in markdown format with some templates and outputs a fully static rendered site.

# Why Github Pages
The static site can be hosted with any web host but we are going to use service Github Pages. Apart from hosting the static site, it also provides many goodies like
- Automatic builds
- CDN
- SSL certificates
- Free mapping for custom domains
- Many more...

So let's get started

# Setup
First we need to setup our development enviornment. Jekyll is written in Ruby. Let's go ahead and install ruby with rbenv. I have written instruction for macOS but these can be adopted for Linux as well. (I'll probably update this post with linux instructions some time later but don't hold your breath)

## Install rbenv and rbenv-build
```
$ brew update
$ brew install rbenv rbenv-build
```
Follow the command to install rbenv in your `~/.bash_profile`. Open a new terminal window for changes to take effect.
```
# list latest stable ruby versions
$ rbenv install -l
2.5.8
2.6.6
2.7.2
jruby-9.2.13.0
maglev-1.0.0
mruby-2.1.2
rbx-5.0
truffleruby-20.2.0
truffleruby+graalvm-20.2.0

Only latest stable releases for each Ruby implementation are shown.
Use 'rbenv install --list-all' to show all local versions.
```
We are going to use version 2.7.2. 

## Install Ruby

You may face openssl issue while installing or using ruby. Add

```
export RUBY_CONFIGURE_OPTS="--with-openssl-dir=$(brew --prefix openssl@1.1)
```
in your `~/.bash_profile` so ruby is compiled with correct openssl version at install time. After that you can install Ruby with rbenv

```
# It will take some time to download and compile
$ rbenv install 2.7.2

$ rbenv global 2.7.2  # select 2.7.2
```

## Install jekyll
```
$ gem install jekyll
```

# Create a new site
```
$ jekyll new arunkant.github.io
$ cd arunkant.github.io
```
Here `arunkant` is my Github username. 

# Run the site locally
```
$ bundle exec jekyll serve --livereload
Configuration file: /Users/arunkant/code/arunkant.github.io/_config.yml
            Source: /Users/arunkant/code/arunkant.github.io
       Destination: /Users/arunkant/code/arunkant.github.io/_site
 Incremental build: disabled. Enable with --incremental
      Generating... 
       Jekyll Feed: Generating feed for posts
                    done in 0.396 seconds.
 Auto-regeneration: enabled for '/Users/arunkant/code/arunkant.github.io'
LiveReload address: http://127.0.0.1:35729
    Server address: http://127.0.0.1:4000/
  Server running... press ctrl-c to stop.
```

open [http://127.0.0.1:4000/](http://127.0.0.1:4000/) in the browser and you can see a newly created site.

## Commit to a git repository 
```
$ git init
$ git add .
$ git commit -m 'Initial commit'
```

## Push it to Github
Create a repository in Github with same name (arunkant.github.io)
```
$ git remote add origin git@github.com:arunkant/arunkant.github.io.git
$ git push origin master
```
After some time you should be able to see it live at [http://_username_.github.io](http://_username_.github.io)

## Change default config
open `_config.yml` in the root of the project and edit as needed. Commit and push again and after some time it will be live.

## Start bloggin
Create a post in `_posts` directory (see existing files for help) and push to Github. It will build it and deploy it. I already had some very old posts which I just copied from old repository.

## Next steps
There are a few things you can try
- Write more blog posts
- Go to [Jekyll Themes](https://jekyllrb.com/docs/themes/) and choose one suites your taste.
- Create your own theme
- Help your friends to start a blog
- SEO
- ...

I'll probably write a follow up when I customize the default theme.