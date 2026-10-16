function divide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function computeRates(totals) {
  const ctr = divide(totals.clicks, totals.impressions);
  const cr = divide(totals.leads, totals.clicks);
  return {
    ctr: ctr === null ? null : ctr * 100,
    cpc: divide(totals.cost, totals.clicks),
    cr: cr === null ? null : cr * 100,
    cpl: divide(totals.cost, totals.leads),
  };
}

function statusFor(totals, cpl, targetCpl) {
  if (totals.cost > 0 && totals.leads === 0) return "no-leads";
  if (cpl !== null && cpl > targetCpl) return "expensive";
  return "ok";
}

export function summarize(rows, targetCpl = 1500) {
  const byCampaign = new Map();

  for (const row of rows) {
    const current = byCampaign.get(row.campaign) ?? {
      campaign: row.campaign,
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
    };
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.leads += row.leads;
    byCampaign.set(row.campaign, current);
  }

  const totals = {
    impressions: 0,
    clicks: 0,
    cost: 0,
    leads: 0,
  };

  const campaigns = [];

  for (const data of byCampaign.values()) {
    totals.impressions += data.impressions;
    totals.clicks += data.clicks;
    totals.cost += data.cost;
    totals.leads += data.leads;

    const rates = computeRates(data);
    campaigns.push({
      ...data,
      ...rates,
      status: statusFor(data, rates.cpl, targetCpl),
    });
  }

  campaigns.sort((a, b) => b.cost - a.cost);

  const totalRates = computeRates(totals);

  return {
    totals: {
      ...totals,
      ...totalRates,
    },
    campaigns,
  };
}
