import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";

const BIDDER_CODE = "oshkukov";
const DEFAULT_ENDPOINT = "https://prebid.oshkukov.ua/auction";

// ---- utils ----
function pickFirstSize(bid) {
  const sizes = bid?.mediaTypes?.banner?.sizes;
  if (Array.isArray(sizes) && sizes.length && Array.isArray(sizes[0])) {
    const [w, h] = sizes[0];
    return { w: Number(w), h: Number(h) };
  }
  return null;
}

function getPageUrl(bidderRequest) {
  return (
    bidderRequest?.refererInfo?.page ||
    (typeof window !== "undefined" ? window.location.href : "")
  );
}

function getEndpointFrom(bid) {
  const u = bid?.params?.endpoint;
  return typeof u === "string" && /^https?:\/\//i.test(u) ? u : DEFAULT_ENDPOINT;
}

function isBidRequestValid(bid) {
  const p = bid?.params || {};
  const size = pickFirstSize(bid);
  return !!(p.publisherId && p.placementId && size?.w > 0 && size?.h > 0);
}

// ---- buildRequests (batch) ----
function buildRequests(validBidRequests, bidderRequest) {
  if (!validBidRequests?.length) {
    return null;
  }

  // endpoint take from the first bid (for the whole batch)
  const url = getEndpointFrom(validBidRequests[0]);

  const payload = {
    bidderCode: BIDDER_CODE,
    pageUrl: getPageUrl(bidderRequest),
    currency: validBidRequests[0]?.params?.currency || "USD",
    bids: validBidRequests.map((bid) => {
      const { w, h } = pickFirstSize(bid) || { w: 0, h: 0 };
      return {
        requestId: bid.bidId,
        placementId: bid.params.placementId,
        publisherId: bid.params.publisherId,
        size: { w, h },
        bidfloor: Number(bid.params.bidfloor || 0),
      };
    }),
  };

  return {
    method: "POST",
    url,
    data: payload,
    options: { withCredentials: false, contentType: "application/json" },
  };
}

// ---- interpretResponse ----
function interpretResponse(serverResponse /*, bidRequest */) {
  const body = serverResponse?.body;
  if (!body || !Array.isArray(body.bids)) return [];

  const currency = body.currency || "USD";
  return body.bids.map((b) => ({
    requestId: b.requestId,
    cpm: Number(b.cpm) || 0,
    width: Number(b.width),
    height: Number(b.height),
    ad: b.ad, // the backend should return the finished HTML
    currency,
    ttl: Number(b.ttl) || 30,
    creativeId: b.creativeId || "creative",
    netRevenue: true,
    mediaType: BANNER,
    meta: b.adomain ? { advertiserDomains: b.adomain } : undefined,
  }));
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
