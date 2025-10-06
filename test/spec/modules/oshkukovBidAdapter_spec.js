import { expect } from 'chai';
import { spec } from 'modules/oshkukovBidAdapterOld.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const DEFAULT_BIDDER_REQ = {
  bidderCode: 'oshkukov',
  refererInfo: { page: 'https://example.com/page' }
};

const DISPLAY_REQUEST = {
  bidder: 'oshkukov',
  params: {
    publisherId: 'pub-12345',
    placementId: 'plc-67890',
    bidfloor: 0.5,
    currency: 'USD'
  },
  mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
  adUnitCode: 'banner-div',
  bidId: 'abc123',
  bidderRequestId: 'req-1',
  auctionId: 'auc-1'
};

const DISPLAY_REQUEST_NO_PARAMS = {
  ...DISPLAY_REQUEST,
  params: undefined
};

const DISPLAY_REQUEST_NO_SIZES = {
  ...DISPLAY_REQUEST,
  mediaTypes: { banner: { sizes: [] } }
};

const SERVER_DISPLAY_RESPONSE = {
  currency: 'USD',
  bids: [{
    requestId: 'abc123',
    cpm: 0.91,
    width: 300,
    height: 250,
    ad: '<div><!-- creative --></div>',
    creativeId: 'cr_001',
    adomain: ['advertiser.com'],
    ttl: 45
  }]
};

describe('oshkukovBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true when required params and size exist', () => {
      expect(spec.isBidRequestValid(DISPLAY_REQUEST)).to.equal(true);
    });

    it('returns false when params are missing', () => {
      expect(spec.isBidRequestValid(DISPLAY_REQUEST_NO_PARAMS)).to.equal(false);
    });

    it('returns false when sizes are empty', () => {
      expect(spec.isBidRequestValid(DISPLAY_REQUEST_NO_SIZES)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const req = spec.buildRequests([DISPLAY_REQUEST], DEFAULT_BIDDER_REQ);

    it('returns a POST request', () => {
      expect(req.method).to.equal('POST');
    });

    it('targets AUCTION_PATH and sets proper options', () => {
      expect(req.url).to.equal('https://prebid.oshkukov.ua/auction');
      expect(req.options).to.be.an('object');
      expect(req.options.withCredentials).to.equal(false);
      expect(req.options.contentType).to.equal('application/json');
    });

    it('builds payload with bidderCode, pageUrl, currency and bids', () => {
      expect(req.data).to.be.an('object');
      expect(req.data.bidderCode).to.equal('oshkukov');
      expect(req.data.pageUrl).to.equal('https://example.com/page');
      expect(req.data.currency).to.equal('USD');
      expect(req.data.bids).to.be.an('array').with.length(1);
    });

    it('maps bid fields correctly', () => {
      const b = req.data.bids[0];
      expect(b.requestId).to.equal('abc123');
      expect(b.publisherId).to.equal('pub-12345');
      expect(b.placementId).to.equal('plc-67890');
      expect(b.bidfloor).to.equal(0.5);
      expect(b.size).to.deep.equal({ w: 300, h: 250 }); // first size picked
    });
  });

  describe('interpretResponse', () => {
    it('maps server response to Prebid banner bid', () => {
      const result = spec.interpretResponse(
        { body: SERVER_DISPLAY_RESPONSE },
        { adapterRequest: { bids: [DISPLAY_REQUEST] } }
      );

      expect(result).to.be.an('array').with.length(1);

      const bid = result[0];
      expect(bid).to.include({
        requestId: 'abc123',
        cpm: 0.91,
        width: 300,
        height: 250,
        currency: 'USD',
        creativeId: 'cr_001',
        ttl: 45,
        netRevenue: true,
        mediaType: 'banner'
      });

      expect(bid.ad).to.be.a('string').and.to.include('creative');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });
    it('returns empty array on no body', () => {
      const result = spec.interpretResponse({}, {});
      expect(result).to.deep.equal([]);
    });

    it('returns empty array when bids are missing', () => {
      const result = spec.interpretResponse({ body: { currency: 'USD', bids: [] } }, {});
      expect(result).to.deep.equal([]);
    });

    it('defaults currency to USD when not provided', () => {
      const resp = { body: { bids: [{ requestId: 'abc123', cpm: 1, width: 300, height: 250, ad: '<div/>', creativeId: 'cr' }] } };
      const [bid] = spec.interpretResponse(resp, {});
      expect(bid.currency).to.equal('USD');
    });
  });
});
