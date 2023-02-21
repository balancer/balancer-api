
import axios from 'axios';

export interface TenderlySettings {
    user: string;
    project: string;
    accessKey: string;
    networkId?: number;
}

export interface TenderlyForkResponse {
  forkId: string;
  forkRPC: string;
}

export class Tenderly {
  simulateUrl: string;
  forkUrl: string;
  networkId: number;

  constructor(private settings: TenderlySettings) {
    this.simulateUrl = `https://api.tenderly.co/api/v1/account/${settings.user}/project/${settings.project}/simulate`;
    this.forkUrl = `https://api.tenderly.co/api/v1/account/${settings.user}/project/${settings.project}/fork`;
    this.networkId = settings.networkId || 1;
  }

  async createFork(): Promise<TenderlyForkResponse> {
    const opts = {
      headers: {
        'X-Access-Key': this.settings.accessKey,
      },
    };

    const forkBody = {
        network_id: '1',
    };

    console.log('Creating fork simulation');

    const resp = await axios.post(this.forkUrl, forkBody, opts);

    console.log('Response: ', resp);

    const forkId = resp.data.simulation_fork.id;
    const forkRPC = `https://rpc.tenderly.co/fork/${forkId}`;

    console.log('Created fork: ', forkId, ' rpc: ', forkRPC);

    return {
        forkId,
        forkRPC,
    };
  }
}
