const BaseAdapter = require('./BaseAdapter');

/**
 * Development & Testing Source Adapter.
 * Emulates compliant external API/RSS responses without scraping or violating terms.
 */
class DemoSourceAdapter extends BaseAdapter {
  async fetch() {
    return [
      {
        id: 'DOI-10.1021/acs.chemrev.demo01',
        title: 'Advances in Catalytic Hydrogenation of Carbon Dioxide',
        abstract: 'Comprehensive review of heterogeneous catalysts for CO2 reduction into methanol.',
        fullBody: 'CO2 reduction using metal-organic frameworks (MOFs) shows record turnover frequencies under ambient pressures...',
        authorName: 'Dr. Aris Thorne',
        url: 'https://open-access.chemistry-journal.org/articles/co2-hydrogenation-2026',
        license: 'CC-BY-4.0',
        publishedDate: new Date().toISOString()
      },
      {
        id: 'DOI-10.1021/acs.chemrev.demo02',
        title: 'Electrochemical Synthesis of Ammonia Under Ambient Conditions',
        abstract: 'Nitrogen reduction reaction (NRR) pathways evaluated with single-atom iron catalysts.',
        fullBody: 'Ambient ammonia synthesis avoids the high temperature and pressure constraints of the conventional Haber-Bosch process...',
        authorName: 'Dr. Sophia Chen',
        url: 'https://open-access.chemistry-journal.org/articles/ambient-ammonia-2026',
        license: 'CC-BY-4.0',
        publishedDate: new Date().toISOString()
      }
    ];
  }

  normalize(rawItem) {
    return {
      externalId: rawItem.id,
      title: rawItem.title,
      excerpt: rawItem.abstract,
      content: rawItem.fullBody,
      author: {
        name: rawItem.authorName,
        bio: `Contributor via ${this.sourceConfig.name}`
      },
      canonicalUrl: rawItem.url,
      attributionText: `Originally published by ${this.sourceConfig.name}. Shared under ${rawItem.license}.`,
      license: rawItem.license,
      publishedAt: new Date(rawItem.publishedDate)
    };
  }
}

module.exports = DemoSourceAdapter;