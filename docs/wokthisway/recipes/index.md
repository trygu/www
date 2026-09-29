---
layout: base
title: Recipes
description: Keto-friendly Asian recipes from Wok This Way — low-carb ramen, dumplings, sauces, and weeknight meals.
---

<section class="container container--wide">
    <h2 class="book-title">Recipes</h2>
    <p>A growing collection of recipes from the book. New ones land here first.</p>

    <ul class="recipe-grid">
        {% for recipe in site.recipes %}
        <li>
            <a href="{{ recipe.url }}">
                <div class="polaroid">
                    <img src="{{ recipe.image }}" alt="{{ recipe.title }}" loading="lazy">
                    <div class="caption">{{ recipe.caption }}</div>
                </div>
                <h3>{{ recipe.title }}</h3>
            </a>
        </li>
        {% endfor %}
    </ul>
</section>
