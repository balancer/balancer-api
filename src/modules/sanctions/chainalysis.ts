
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import abi from './abi.json';
import { getRpcUrl } from '@/modules/network';

const sanctionsContractAddress = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb'

export async function isSanctioned(address: string): Promise<boolean> {
    if (!this.sanctionsContractAddress) return false;

    const rpcUrl = getRpcUrl(1);
    this.provider = new JsonRpcProvider(rpcUrl);
    const sanctionsContract = new Contract(sanctionsContractAddress, abi, this.provider);
    return await sanctionsContract.isSanctioned(address);
}