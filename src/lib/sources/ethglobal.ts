import * as cheerio from "cheerio";
import type { Opportunity, SourceAdapter } from "../types";
import { buildTags, canonicalizeTerms } from "../normalize";
import { buildOpportunity } from "./_shared";

// ETHGlobal does not have a public API, so we scrape the /events page.
const ETHGLOBAL_URL = "https://ethglobal.com/events";

export const ethglobalAdapter: SourceAdapter = {
  meta: {
    id: "ethglobal",
    label: "ETHGlobal",
    category: "hackathon",
    homepage: "https://ethglobal.com",
    tier: "green",
  },
  async fetch(): Promise<Opportunity[]> {
    const res = await fetch(ETHGLOBAL_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`ETHGlobal fetch failed: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const out: Opportunity[] = [];

    $('a[href^="/events/"]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href || href.includes("happy-hour") || href.includes("pragma-")) return;

      let title = $el.find("h2").first().text().trim();
      
      // Fallback if h2 isn't found
      if (!title) {
         // Some cards just use heavily styled divs
         title = $el.find(".font-bold").first().text().trim();
      }

      if (!title || !title.toLowerCase().includes("eth")) return;

      const fullText = $el.text();
      // Only keep events that are hackathons
      if (!fullText.toLowerCase().includes("hackathon")) return;

      const sourceUrl = `https://ethglobal.com${href}`;
      const isRemote = fullText.toLowerCase().includes("async") || fullText.toLowerCase().includes("online");
      
      // Try to extract location
      let location = "TBA";
      if (!isRemote) {
        const spans = $el.find("span").toArray();
        for (const span of spans) {
          const text = $(span).text().trim();
          if (text.includes(",") && !text.includes("—")) {
            location = text;
            break;
          }
        }
      } else {
        location = "Online";
      }

      // Try to find an image
      const imageUrl = $el.find("img").attr("src");
      
      out.push(
        buildOpportunity("ethglobal", "ETHGlobal", {
          category: "hackathon",
          title,
          sourceUrl,
          imageUrl: imageUrl || undefined,
          location: location !== "TBA" ? location : undefined,
          isRemote,
          tags: buildTags({
            explicit: canonicalizeTerms(["web3", "ethereum", "blockchain"]),
            text: title + " " + fullText,
            limit: 8,
          }),
        })
      );
    });

    return out;
  },
};
