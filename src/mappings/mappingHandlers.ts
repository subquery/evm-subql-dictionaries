import {
   AvalancheBlock,
   AvalancheLog,
   AvalancheTransaction
} from '@subql/types-avalanche';
import { EvmLog, EvmTransaction } from "../types/models";
import { inputToFunctionSighash, isZero } from './utils';

export interface AvalancheResult extends ReadonlyArray<any> {
    readonly [key: string]: any;
}

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
