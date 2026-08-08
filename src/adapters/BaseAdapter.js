/**
 * Abstract Base Class for Ingestion Source Adapters.
 * All specific providers (e.g., RSS, arXiv API, Crossref, PubMed) must extend this class.
 */
class BaseAdapter {
  constructor(sourceConfig) {
    if (new.target === BaseAdapter) {
      throw new TypeError('Cannot instantiate abstract class BaseAdapter directly.');
    }
    this.sourceConfig = sourceConfig;
  }

  /**
   * Fetches raw items from the source endpoint.
   * @returns {Promise<Array>} Array of raw items.
   */
  async fetch() {
    throw new Error('Method fetch() must be implemented by subclass.');
  }

  /**
   * Normalizes a raw item into the standard ChemPulse Ingestion Payload shape.
   * @param {Object} rawItem 
   * @returns {Object} Normalized Ingestion Payload
   */
  normalize(rawItem) {
    throw new Error('Method normalize() must be implemented by subclass.');
  }
}

module.exports = BaseAdapter;