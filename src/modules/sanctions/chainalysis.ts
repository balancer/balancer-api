
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import abi from './abi.json';
import config from '@/config';
import { getRpcUrl } from '@/modules/network';


export class Chainalysis {
  private sanctionsContractAddress: string | undefined;
  private provider: any;

  constructor(chainId: number) {
    this.sanctionsContractAddress = config[chainId]?.addresses.sanctionsContract;
    const rpcUrl = getRpcUrl(chainId);
    this.provider = new JsonRpcProvider(rpcUrl);
  }


  async isSanctioned(address: string): Promise<boolean> {
    if (!this.sanctionsContractAddress) return false;

    const sanctionsContract = new Contract(this.sanctionsContractAddress, abi, this.provider);
    return await sanctionsContract.isSanctioned(address);
  }

}