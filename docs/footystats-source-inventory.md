# FootyStats source inventory

Verified from the user-provided pages on 2026-08-27.

| Competition | Dataset page | Available seasons / competition IDs | Match rows shown | Player rows shown |
|---|---|---|---:|---:|
| Botola Pro | https://footystats.org/morocco/botola-pro/datasets | 2025/26 `15434`; 2024/25 `13286`; 2023/24 `10412`; 2022/23 `8287`; 2021/22 `6582`; 2020/21 `5367`; 2019/20 `2898`; 2018/19 `1682`; 2017/18 `566`; 2016/17 `567`; 2015/16 `568`; 2014/15 `569`; 2013/14 `570` | 240 per listed season | 510–564 where available; none before 2018/19 |
| Botola 2 | https://footystats.org/morocco/botola-2/datasets | 2025/26 `16134`; 2024/25 `13642`; 2023/24 `10411`; 2022/23 `8291`; 2021/22 `6583`; 2020/21 `5317`; 2019/20 `2900`; 2018/19 `1683`; 2017/18 `571`; 2016/17 `572`; 2015/16 `573`; 2014/15 `574`; 2013/14 `575` | 240 per listed season (page says 239/240 for current overview) | Low counts where available; none before 2018/19 |
| Morocco Cup | https://footystats.org/morocco/cup/datasets | 2024/25 `14859` | 47 | No player stats |

Each page states that CSV downloads are available and that programmatic or automated downloads should use the FootyStats API. The links are under the `c-dl.php` endpoint, for example `https://footystats.org/c-dl.php?type=matches&comp=13286`. The repository currently supports a bounded match CSV contract and must add a FootyStats-specific adapter for the actual headers before promotion. Access/licensing and API credentials remain operator responsibilities.
