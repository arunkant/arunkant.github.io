---
title: Archive
permalink: /archive/
---

<ol class="post-list" reversed>
  {%- for post in site.posts %}
  <li class="post-item">
    <time class="post-item-date" datetime="{{ post.date | date_to_xmlschema }}">
      <span class="d-year">{{ post.date | date: "%Y" }}</span>
      <span class="d-md">{{ post.date | date: "%b %-d" }}</span>
    </time>
    <div class="post-item-body">
      <a class="post-item-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
      {%- if post.description %}
      <p class="post-item-desc">{{ post.description }}</p>
      {%- endif %}
    </div>
  </li>
  {%- endfor %}
</ol>
