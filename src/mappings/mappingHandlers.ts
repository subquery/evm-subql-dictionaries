import {hexDataSlice, stripZeros} from '@ethersproject/bytes';
import { AvalancheBlockWrapper, AvalancheEvent, AvalancheTransaction } from '@subql/types-avalanche';
import { EvmLog, EvmTransaction } from "../types/models";

export async function handleBlock(block: AvalancheBlockWrapper): Promise<void> {
    const eventData = block.events().map((evt, idx)=>handleEvent(block.blockHeight.toString(), idx, evt));
    const transactionsData = block.calls().filter(call => call.to && call.from).map((call, idx)=>handleTransaction(block.blockHeight.toString(), idx, call));
    const events = eventData.map(([evt])=>evt);
    const transactions = transactionsData.map(([trsc])=>trsc);
    await Promise.all([
        store.bulkCreate('EvmLog', events),
        store.bulkCreate('EvmTransaction', transactions)
    ]);
}

export function handleEvent(blockNumber: string, eventIdx: number, event: AvalancheEvent): [EvmLog, AvalancheEvent] {
    const newEvent = EvmLog.create({
        id: `${blockNumber}-${eventIdx}`,
        address: event.address,
        blockHeight: BigInt(blockNumber),
        topics0: event.topics[0],
        topics1: event.topics[1],
        topics2: event.topics[2],
        topics3: event.topics[3]
    });
    return [newEvent, event];
}

export function inputToFunctionSighash(input: string): string {
    return hexDataSlice(input, 0, 4);
}

export function isZero(input: string): boolean {
    return stripZeros(input).length === 0;
}

export function handleTransaction(blockNumber: string, eventIdx: number, transaction: AvalancheTransaction): [EvmTransaction, AvalancheTransaction] {
    const func = isZero(transaction.input) ? undefined : inputToFunctionSighash(transaction.input);
    const newTransaction = EvmTransaction.create({
        id: `${blockNumber}-${eventIdx}`,
        blockHeight: BigInt(blockNumber),
        from: transaction.from,
        to: transaction.to,
        txHash: transaction.hash,
        success: true, // TODO
        func
    });
    return [newTransaction, transaction];
}