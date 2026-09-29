---
layout: base
description: Keto-friendly Asian recipes — low-carb ramen, dumplings, sauces, and weeknight meals.
jsonld:
  "@context": https://schema.org
  "@type": Book
  name: "Wok This Way – A Keto Journey Through Asia"
  author:
    "@type": Person
    name: "Trygve Falch"
  datePublished: 2025-01-01
  description: A keto-friendly Asian cookbook filled with low-carb recipes, from ramen to dumplings, that bring joy and flavor to your table.
  image: /images/wokthisway.jpeg
  publisher: Self-Published
  url: "https://www.amazon.com/dp/B0F3P4BPRZ"
---

<section class="container book-section">
    <div class="book-flex">
        <div class="book-image-wrapper">
            <a href="{{ site.amazon }}" target="_blank" rel="noopener" aria-label="Buy Wok This Way on Amazon">
                <img src="/images/wokthisway.jpeg" alt="Wok This Way – Keto Asian Cookbook cover" class="book-cover" loading="lazy">
            </a>
        </div>
        <article class="book-info">
            <h2 class="book-title">About the Book</h2>
            <div class="book-description">
                <p><strong>Wok This Way</strong> delivers flavor-forward, keto-friendly recipes inspired by East Asian kitchens—brothy ramens, hotpots, dumplings, and umami-rich sauces. Practical swaps and clear techniques make low-carb cooking approachable for everyday life.</p>
                <ul>
                    <li>Brothy and dry-style keto ramen</li>
                    <li>Dumplings using napa or pak choi wrappers</li>
                    <li>Sauces and sides that boost flavor</li>
                    <li>Smart swaps that keep carbs low</li>
                    <li>Practical guidance for keto and intermittent fasting</li>
                </ul>
                <p class="no-rice">No rice. No guilt. Just good food.</p>
            </div>
            <div class="amazon-link-wrapper">
                <a href="{{ site.amazon }}" target="_blank" rel="noopener" class="amazon-link">
                    Buy on Amazon
                </a>
            </div>
        </article>
    </div>
</section>

<section class="container container--wide" id="recipes">
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
