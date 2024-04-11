import {
  Hex,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { L1GatewayRouterAbi } from "./abis/L1GatewayRouter";

const privateKey = process.env.PRIVATE_KEY as Hex | undefined;
if (!privateKey) {
  console.log("Missing PRIVATE_KEY environment variable");
  process.exit(1);
}

async function main() {
  const l1 = createPublicClient({
    transport: http(sepolia.rpcUrls.default.http[0]),
  });
  const l2 = createPublicClient({
    transport: http("https://rpc.figarolabs.dev"),
  });

  const l1FeeData = await l1.estimateFeesPerGas();
  const l2FeeData = await l2.estimateFeesPerGas();

  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey!),
    chain: sepolia,
    transport: http(),
  });

  const l1GasLimit = 80_000n;
  const l2GasLimit = 300_000n;
  const l1GasCost = l1FeeData.maxFeePerGas ?? l1FeeData.gasPrice;
  const l2GasCost = l2FeeData.maxFeePerGas ?? l2FeeData.gasPrice;
  const maxSubmissionCost = l1GasCost * l1GasLimit;

  const value = l2GasCost * l2GasLimit + maxSubmissionCost;
  const extraData = encodeAbiParameters(
    [{ type: "uint256" }, { type: "bytes" }],
    [maxSubmissionCost, "0x"]
  );
  console.log(value, extraData, l1GasCost, l2GasCost)
  // with const l2FeeData = await l1.estimateFeesPerGas();
  // 757153821280000n 
  // 0x000000000000000000000000000000000000000000000000000090f96453f40000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000 
  // 1992510056n 1992510056n

  // with const l2FeeData = await l2.estimateFeesPerGas();
  // 195400804480000n 
  // 0x000000000000000000000000000000000000000000000000000090f96453f40000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000 
  // 1992510056n 120000000n

  await wallet.writeContract({
    abi: L1GatewayRouterAbi,
    functionName: "outboundTransferCustomRefund",
    args: [
      "0x5a5297A52b1faCa0958084D4D424E774b0EDE7d2", // _l1Token
      wallet.account.address, // _refundTo
      wallet.account.address, // _to
      1n, // _amount
      l2GasLimit, // _maxGas
      l2GasCost, // _gasPriceBid
      extraData, // _data
    ],
    address: "0x76B99e93314aC2bDA886a6c9103fe18380B496c7",
    value,
  });

  /* TX DATA:
  0x4fb1a07b
  0000000000000000000000005a5297a52b1faca0958084d4d424e774b0ede7d2
  000000000000000000000000727688202ccaa4fd55b8bb0fbb715f69361e1835
  000000000000000000000000727688202ccaa4fd55b8bb0fbb715f69361e1835
  0000000000000000000000000000000000000000000000000000000000000001
  00000000000000000000000000000000000000000000000000000000000493e0
  0000000000000000000000000000000000000000000000000000000007270e00
  00000000000000000000000000000000000000000000000000000000000000e0
  0000000000000000000000000000000000000000000000000000000000000060
  000000000000000000000000000000000000000000000000000090f96453f400
  0000000000000000000000000000000000000000000000000000000000000040
  0000000000000000000000000000000000000000000000000000000000000000
  */
}
main();
