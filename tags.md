---
title: Tags
permalink: /tags/
---

{%- assign tag_names = "" | split: "" -%}
{%- for post in site.posts -%}
  {%- for t in post.tags -%}
    {%- assign tag_names = tag_names | push: t -%}
  {%- endfor -%}
{%- endfor -%}
{%- assign tag_names = tag_names | uniq | sort -%}

{%- assign cats = site.categories | sort -%}
{%- if cats.size > 0 %}
<h2>Categories</h2>
<ul class="cat-cloud">
  {%- for cat in cats %}
  <li>
    <a href="{{ '/categories/' | append: cat[0] | append: '/' | relative_url | downcase }}">
      {{ cat[0] }} <span class="count">{{ cat[1].size }}</span>
    </a>
  </li>
  {%- endfor %}
</ul>
{%- endif %}

<h2>Tags</h2>
<ul class="tag-cloud">
  {%- for t in tag_names %}
  <li>
    <a href="{{ '/tags/' | append: t | append: '/' | relative_url }}">
      #{{ t }} <span class="count">{{ site.tags[t].size }}</span>
    </a>
  </li>
  {%- endfor %}
</ul>
