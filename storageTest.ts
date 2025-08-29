import { ZgFile, Indexer, Batcher, KvClient } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const RPC_URL = 'https://evmrpc-testnet.0g.ai/';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';
const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(privateKey!, provider);

const indexer = new Indexer(INDEXER_RPC);

async function uploadFile(filePath) {
  try {
    console.log("Starting file upload process...");
    
    const file = await ZgFile.fromFilePath(filePath);

    const [tree, treeErr] = await file.merkleTree();
    if (treeErr !== null) {
      throw new Error(`Error generating Merkle tree: ${treeErr}`);
    }

    console.log("File Root Hash:", tree?.rootHash());

    // Set a very high gas price to ensure transaction goes through
    const veryHighGasPrice = ethers.parseUnits("10000000", "wei"); // 10 gwei equivalent
    console.log("Using very high gas price:", veryHighGasPrice.toString());

    // Set up timeout for the upload
    const uploadPromise = indexer.upload(file, RPC_URL, signer as any);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Upload timeout after 90 seconds")), 90000)
    );

    console.log("Starting upload with 90-second timeout...");
    const [tx, uploadErr] = await Promise.race([uploadPromise, timeoutPromise]) as any;
    
    if (uploadErr !== null) {
      throw new Error(`Upload error: ${uploadErr}`);
    }
    
    console.log("Upload successful! Transaction:", tx);
    
    await file.close();
    
    return { rootHash: tree?.rootHash(), txHash: tx };
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

// Add error handling for the main execution
(async () => {
  try {
    await uploadFile('./testvvt.txt');
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
})();