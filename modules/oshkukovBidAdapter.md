

# Overview

**Module Name**: Oshkukov Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: your-email@example.com

# Description

The **Oshkukov Bidder Adapter** is a minimal banner adapter for Prebid.js.  
It sends requests to your auction backend (`AUCTION_PATH`) with the required parameters `publisherId` and `placementId`, and returns standard banner bid responses including CPM, size, creative, and creativeId.

This adapter supports **Banner only**.

# Test Parameters

```
var adUnits = [

  // Simple banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'oshkukov',
      params: {
        publisherId: 'pub-12345',
        placementId: 'plc-67890',
        bidfloor: 0.5,
        currency: 'USD'
      }
    }]
  }
];

# Notes

### Required params
 `publisherId` (string) — unique publisher identifier  
 `placementId` (string) — placement identifier  


### Validation parameters
 params.publisherId: string (site owner)
 params.placementId: string (ad placement)
 optional: params.bidfloor: number, params.currency: 'USD' | other




### Optional params
 `bidfloor` (number) — minimum CPM bid  
 `currency` (string, default `USD`)  

### Server Response fields
 `requestId` — matches Prebid’s bidId  
 `cpm` — bid price  
 `width` / `height` — creative dimensions  
 `ad` — HTML/JS creative  
 `creativeId` — creative identifier  
 `ttl` (optional) — time-to-live, default 30s  
 `adomain` (optional) — array of advertiser domains  

{
  "currency": "USD",
  "bids": [
    {
      "requestId": "XYZ123",       
      "cpm": 0.42,
      "width": 300,
      "height": 250,
      "ad": "<div>Banner creative HTML here</div>",
      "creativeId": "cr_123",
      "adomain": ["advertiser.com"],
      "ttl": 30
    }
  ]
}
