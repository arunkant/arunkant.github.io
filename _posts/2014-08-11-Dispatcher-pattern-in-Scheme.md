---
layout: post
title: Dynamic dispatch pattern in Scheme/Racket
description: Implementing dynamic method dispatch — the polymorphism trick that powers JavaScript's toString — in plain Scheme.
categories: [Programming]
tags: [scheme, racket, javascript, patterns]
redirect_from:
  - /2014/08/11/Dispatcher-pattern-in-Scheme.html
---

Many programming languages use this pattern to dynamically select method implementation based on one or more _special_ arguments. For example in JavaScript we have toString() for both objects and arrays, but It works differently.

{% highlight javascript %}
> [].toString()
''

> {}.toString()
'[object Object]'
{% endhighlight %}
This is called single dispatch because method/function selection is based on one special argument (``[]`` or ``{}`` before ``.``(dot) in this case).

We can implement similler pattern in Scheme easily,
{% highlight racket %}
#lang racket
(define (cat-constructor name)
  (define (dispatcher m)
    (cond ((eq? m 'name) name)
          ((eq? m 'make-noise)
            (string-append "Cat " name " says meow!!"))
          (else (error "Error: no method/property found with name:" m))))
  dispatcher)

(define (dog-constructor name)
  (define (dispatcher m)
    (cond ((eq? m 'name) name)
          ((eq? m 'make-noise)
            (string-append "Dog " name " says wow!!"))
          (else (error "Error: no method/property found with name:" m))))
  dispatcher)

(define kitty (cat-constructor "RoundBall"))
(kitty 'name) ;; "RoundBall"
(kitty 'make-noise) ;; "Cat RoundBall says meow!!"

(define dogg (dog-constructor "Shibe"))
(dogg 'name) ;; "Shibe"
(dogg 'make-noise) ;; "Dog Shibe says wow!!"
{% endhighlight %}

``'make-noise`` do different things if applied to different object like ``kitty`` or ``dogg``.

In next article we will explore JavaScript prototypal inheritance using Scheme.
