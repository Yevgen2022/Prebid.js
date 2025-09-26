// endpoint of auction
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";

const AUCTION_PATH = "https://prebid.oshkukov.ua/auction";
const BIDDER_CODE = "oshkukov";

// Utils
function pickFirstSize(bid) {
  // wait mediaTypes.banner.sizes as [[w,h], ...]
  const sizes = bid.mediaTypes?.banner?.sizes;
  if (Array.isArray(sizes) && sizes.length && Array.isArray(sizes[0])) {
    const [w, h] = sizes[0];
    return {w: Number(w), h: Number(h)};
  }
  return null;
}

function getPageUrl(bidderRequest) {
  return bidderRequest?.refererInfo?.page || (typeof window !== 'undefined' ? window.location.href : '');
}

function isBidRequestValid(bid) {
  const p = bid?.params || {};
  const size = pickFirstSize(bid);
  return Boolean(
    typeof p.publisherId === 'string' && p.publisherId.trim() &&
    typeof p.placementId === 'string' && p.placementId.trim() &&
    size && size.w > 0 && size.h > 0
  );
}

// We build a simple payload on the backend (one request for all bids)
function buildRequests(validBidRequests, bidderRequest) {
  const payload = {
    bidderCode: BIDDER_CODE,
    pageUrl: getPageUrl(bidderRequest),
    currency: validBidRequests[0]?.params?.currency || "USD",

    bids: validBidRequests.map(bid => {
      const {w, h} = pickFirstSize(bid);
      return {
        requestId: bid.bidId,                                      // bid's ID
        placementId: bid.params.placementId,                      // where we give the show
        publisherId: bid.params.publisherId,                     // who is the publisher
        size: {w, h},                                           // the first valid dimension is selected
        bidfloor: Number(bid.params.bidfloor || 0)       // minimum price (optional)
      };
    })
  };

  return {
    method: "POST",
    url: AUCTION_PATH,
    data: payload,
    options: {withCredentials: false, contentType: "application/json"}
  };
}

// We map to Prebid format (minimum for a banner)
function interpretResponse(serverResponse /*, bidRequest */) {
  const body = serverResponse?.body;
  if (!body || !Array.isArray(body.bids)) return [];

  const currency = body.currency || "USD";
  return body.bids.map(b => ({
    requestId: b.requestId,                 // must match bidId from buildRequests → ties response to original request
    cpm: Number(b.cpm) || 0,                // bid price (cost per mille, i.e. CPM in USD or specified currency)
    width: b.width,                         // width of the returned creative
    height: b.height,                       // height of the returned creative
    ad: b.ad,                               // HTML/JS creative code that will be rendered in the ad slot
    currency,                               // currency of the CPM (e.g., "USD")
    ttl: Number(b.ttl) || 30,               // time-to-live in seconds; how long this bid is valid
    creativeId: b.creativeId || "creative", // creative identifier (useful for reporting/debugging)
    netRevenue: true,                       // always true → indicates revenue is net (not gross)
    mediaType: BANNER,                      // declares the media type (here: Banner)
    meta: b.adomain
      ? { advertiserDomains: b.adomain }    // advertiser domains (used for brand safety/verification)
      : undefined
  }));
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse
};

registerBidder(spec);
