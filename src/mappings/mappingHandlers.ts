import {
//    AvalancheBlock,
//    AvalancheLog,
//    AvalancheTransaction
} from '@subql/types-avalanche';
import { EvmLog, EvmTransaction } from "../types/models";
import { inputToFunctionSighash, isZero } from './utils';

export interface AvalancheResult extends ReadonlyArray<any> {
    readonly [key: string]: any;
}

export type AvalancheBlock = {
  blockExtraData: string;
  difficulty: bigint;
  extDataGasUsed: string;
  extDataHash: string;
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
  logs: AvalancheLog[];
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: number;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: bigint;
  stateRoot: string;
  timestamp: bigint;
  totalDifficulty: bigint;
  transactions: AvalancheTransaction[];
  transactionsRoot: string;
  uncles: string[];
  baseFeePerGas?: bigint;
  blockGasCost?: bigint;
};
  
export type AvalancheTransaction<T extends AvalancheResult = AvalancheResult> = {
  blockHash: string;
  blockNumber: number;
  from: string;
  gas: bigint;
  gasPrice: bigint;
  hash: string;
  input: string;
  nonce: bigint;
  to: string;
  transactionIndex: bigint;
  value: bigint;
  type: string;
  v: bigint;
  r: string;
  s: string;
  receipt: AvalancheReceipt;
  accessList?: string[];
  chainId?: string;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  args?: T;
};
  
export type AvalancheLog<T extends AvalancheResult = AvalancheResult> = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  args?: T;
};

export type AvalancheReceipt = {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  from: string;
  gasUsed: bigint;
  logs: AvalancheLog[];
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
};

export async function handleBlock(block: AvalancheBlock): Promise<void> {
  const logsData = block.logs.map((log, idx) => handleLog(block.number, idx, log));
  const transactionsData = block.transactions.filter(tx => tx.to && tx.from).map((tx, idx) => handleTransaction(block.number, idx, tx));
  const logs = logsData.map(([log]) => log);
  const transactions = transactionsData.map(([tx]) => tx);
  await Promise.all([
    store.bulkCreate('EvmLog', logs),
    store.bulkCreate('EvmTransaction', transactions)
  ]);
}

export function handleLog(blockNumber: number, logIndex: number, log: AvalancheLog): [EvmLog, AvalancheLog] {
  const newLog = EvmLog.create({
    id: `${blockNumber}-${logIndex}`,
    address: log.address,
    blockHeight: blockNumber,
    topics0: log.topics[0],
    topics1: log.topics[1],
    topics2: log.topics[2],
    topics3: log.topics[3]
  });
  return [newLog, log];
}

export function handleTransaction(blockNumber: number, txIndex: number, transaction: AvalancheTransaction): [EvmTransaction, AvalancheTransaction] {
  const func = isZero(transaction.input) ? undefined : inputToFunctionSighash(transaction.input);
  const newTransaction = EvmTransaction.create({
    id: `${blockNumber}-${txIndex}`,
    blockHeight: blockNumber,
    from: transaction.from,
    to: transaction.to,
    txHash: transaction.hash,
    success: transaction.receipt.status,
    func
  });
  return [newTransaction, transaction];
}