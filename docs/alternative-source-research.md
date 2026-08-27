
## Elbotola public pages

The public Elbotola mobile analytics page `https://m.elbotola.com/en/analytics/season/p3glrw7hd65qdyj/` rendered a Botola 2 2025/26 season page with public overview, standings, team statistics, player statistics, and a Matches tab. After opening the Matches tab, the page exposed a full rendered match list in the browser content, including dates, team names, scores, and match-detail links. The page is a server-rendered Next.js site and the HTML contains embedded render payloads. This is a candidate for a source-specific public-page adapter, but automated-use permission, historical season URL discovery, and consistency of the rendered markup still require verification. No access control was bypassed and no data has yet been inserted from this source.

The public `https://m.elbotola.com/robots.txt` currently returns:

```text
User-Agent: *
Allow: /
Disallow: /user/
Disallow: /search
```

The public Botola 2 analytics page and Matches tab were accessible, while guessed `/en/terms/` and `/en/privacy/` paths returned 404/noindex. The page’s rendered HTML included public match cards and scores. Any adapter should stay within allowed public URLs, use conservative rate limiting, avoid `/user/` and `/search`, and treat the lack of a discovered terms page as a reason to keep usage minimal and provide attribution rather than as blanket permission for bulk scraping.

## Verified Elbotola structured endpoint

The public Matches tab loads `GET https://m.elbotola.com/api/analytics/season/p3glrw7hd65qdyj/matches?locale=en&week=1` from the browser. The endpoint returned HTTP 200 from the sandbox without credentials and returned JSON with `groups[].matches[]`, including match ID, date label, home/away team names, home/away scores, competition name, winner, and public match-detail href. The same endpoint is suitable for conservative week-by-week collection. It was verified with `curl` and returned 7,906 bytes for week 1. A source-specific importer should use a bounded week range, delay between requests, validate the schema and scores, and retain the endpoint URL and retrieval timestamp as provenance.

## Flashscore feasibility check

The user-provided Flashscore Botola Pro page was publicly reachable in a browser and displayed the competition navigation, but Flashscore's `robots.txt` disallows `/standings/` for the general user agent. More importantly, the official [Flashscore Terms of Use](https://www.flashscore.com/terms-of-use/) state that users may not use the website by embedding, aggregating, scraping, or recreating it without express consent, and prohibit extraction or utilization of a qualitatively or quantitatively substantial part of its database without explicit consent. The Terms also describe the site for personal use and prohibit commercial use. Therefore this project will not bulk-scrape Flashscore standings, fixtures, match events, odds, or player data. A licensed Flashscore/Livesport feed or other approved provider would be required for integration.
