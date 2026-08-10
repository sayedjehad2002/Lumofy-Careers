// Captures where a visitor arrived from, once, on their first page of the visit.
//
// It has to be captured on ARRIVAL rather than at submit time: by the time
// someone reaches /jobs/:id/apply, document.referrer is the careers site itself
// and the campaign parameters are long gone from the URL. Stashing it in
// sessionStorage keeps it for the length of the visit without persisting
// anything across visits.
//
// Nothing here identifies a person — it is the referring site and any campaign
// tags the link carried, which is what a channel report needs and no more.

const KEY = "lumofy.attribution.v1";

export interface Attribution {
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** The page they landed on, useful for telling a job link from the home page. */
  landing?: string;
}

const clean = (v: string | null | undefined, max = 200) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : undefined;
};

/** Call once per app load. Later calls in the same visit are no-ops, so an
 *  internal navigation can never overwrite the original referrer. */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;

    const params = new URLSearchParams(window.location.search);
    // Treat a same-origin referrer as no referrer: it means an internal click,
    // not an arrival from somewhere else.
    let referrer = clean(document.referrer, 300);
    if (referrer) {
      try {
        if (new URL(referrer).host === window.location.host) referrer = undefined;
      } catch { /* malformed referrer — keep the raw string */ }
    }

    const data: Attribution = {
      referrer,
      utm_source: clean(params.get("utm_source"), 80),
      utm_medium: clean(params.get("utm_medium"), 80),
      utm_campaign: clean(params.get("utm_campaign"), 120),
      landing: clean(window.location.pathname, 200),
    };

    // Only store something worth storing; an empty record would mask a later
    // page load that does carry a referrer.
    if (data.referrer || data.utm_source || data.utm_medium || data.utm_campaign) {
      sessionStorage.setItem(KEY, JSON.stringify(data));
    } else {
      sessionStorage.setItem(KEY, JSON.stringify({ landing: data.landing }));
    }
  } catch {
    // Private mode or storage disabled: attribution is a nice-to-have, never a
    // reason for an application to fail.
  }
}

export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}
