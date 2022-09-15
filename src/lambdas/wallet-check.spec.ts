import nock from 'nock';
import { handler } from './wallet-check';
import { TRMAccountDetails } from '../types';

nock.disableNetConnect();

let trmResponse: TRMAccountDetails[] = [];



const request = {
  body: {
    address: "0x0000000000000000000000000000000000000000"
  }
}

describe('Wallet Check Lambda', () => {
  it('Should return false for an address with no issues', async () => {
    trmResponse = [{
      "accountExternalId": null,
      "address": "0x0000000000000000000000000000000000000000",
      "addressRiskIndicators": [],
      "addressSubmitted": "0x0000000000000000000000000000000000000000",
      "chain": "ethereum",
      "entities": [],
      "trmAppUrl": "https://my.trmlabs.com/address/0x0000000000000000000000000000000000000000/eth"
    }];
    nock('https://api.trmlabs.com')
      .post('/public/v2/screening/addresses')
      .reply(200, trmResponse);
    const response = await handler(request);
    const body = JSON.parse(response.body);
    expect(body.is_blocked).toBe(false);
  });

  it('Should return blocked for an address that has a Severe risk', async () => {
    trmResponse = [{
        "accountExternalId": null,
        "address": "0x0000000000000000000000000000000000000000",
        "addressRiskIndicators": [
          {
            "category": "Sanctions",
            "categoryId": "69",
            "categoryRiskScoreLevel": 15,
            "categoryRiskScoreLevelLabel": "Severe",
            "incomingVolumeUsd": "570037717.3324722239717737602882028941260267337",
            "outgoingVolumeUsd": "573357789.82550046115536928143858188991303929335",
            "riskType": "OWNERSHIP",
            "totalVolumeUsd": "1143395507.15797268512714304172678478403906602705"
          },
          {
            "category": "Sanctions",
            "categoryId": "69",
            "categoryRiskScoreLevel": 15,
            "categoryRiskScoreLevelLabel": "Severe",
            "incomingVolumeUsd": "0",
            "outgoingVolumeUsd": "428172699.46703217102356766551565669942647220227",
            "riskType": "COUNTERPARTY",
            "totalVolumeUsd": "428172699.46703217102356766551565669942647220227"
          }
        ],
        "addressSubmitted": "0x0000000000000000000000000000000000000000",
        "chain": "ethereum",
        "entities": [
          {
            "category": "Sanctions",
            "categoryId": "69",
            "entity": "Lazarus Group",
            "riskScoreLevel": 15,
            "riskScoreLevelLabel": "Severe",
            "trmAppUrl": "https://my.trmlabs.com/entities/trm/75624c42-157e-4a63-8f32-070b1d1fa4d4",
            "trmUrn": "/entity/manual/75624c42-157e-4a63-8f32-070b1d1fa4d4"
          },
          {
            "category": "Hacked or Stolen Funds",
            "categoryId": "34",
            "entity": "Ronin Bridge Hack - March 2022",
            "riskScoreLevel": 15,
            "riskScoreLevelLabel": "Severe",
            "trmAppUrl": "https://my.trmlabs.com/entities/trm/9145c0ff-1544-475f-8403-40840cb051e0",
            "trmUrn": "/entity/manual/9145c0ff-1544-475f-8403-40840cb051e0"
          }
        ],
        "trmAppUrl": "https://my.trmlabs.com/address/0x0000000000000000000000000000000000000000/eth"
      }];
      nock('https://api.trmlabs.com')
        .post('/public/v2/screening/addresses')
        .reply(200, trmResponse);
      const response = await handler(request);
      const body = JSON.parse(response.body);
      expect(body.is_blocked).toBe(true);
  })

})
