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
            <a class="recipe-card" href="{{ recipe.url }}">
                <div class="recipe-card__img">
                    <img src="{{ recipe.image }}" alt="{{ recipe.title }}" loading="lazy">
                </div>
                <h3 class="recipe-card__title">{{ recipe.title }}</h3>
                <p class="recipe-card__caption">{{ recipe.caption }}</p>
            </a>
        </li>
        {% endfor %}
    </ul>
</section>
