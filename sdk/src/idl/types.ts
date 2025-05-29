import { Idl } from '@coral-xyz/anchor';

export type IpredictXyz = {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
  };
  accounts: [
    {
      name: 'platform';
      discriminator: [];
    },
    {
      name: 'wager';
      discriminator: [];
    },
    {
      name: 'orderBook';
      discriminator: [];
    },
    {
      name: 'userPosition';
      discriminator: [];
    }
  ];
};