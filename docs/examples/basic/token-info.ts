import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchMetadata } from '@metaplex-foundation/mpl-token-metadata';
import chalk from 'chalk';
import { CONFIG } from '../../../config/config';

const DEFAULT_TOKEN = CONFIG.TOKEN_ADDRESS;
const tokenAddress = process.argv[2] || DEFAULT_TOKEN;

try {
  new PublicKey(tokenAddress);
} catch (error) {
  console.log(chalk.red('Invalid token address format'));
  console.log(chalk.yellow('Usage: ts-node token-info.ts [TOKEN_ADDRESS]'));
  console.log(chalk.yellow(`Example: ts-node token-info.ts ${DEFAULT_TOKEN}`));
  process.exit(1);
}

const connection = new Connection(CONFIG.RPC_URL, 'confirmed');
const umi = createUmi(CONFIG.RPC_URL);

interface Creator {
  address: string;
  verified: boolean;
  share: number;
}

async function getTokenInfo() {
  try {
    console.log(chalk.cyan(`Checking token: ${tokenAddress}`));
    console.log(chalk.cyan('Network: Devnet'));

    const mintPublicKey = new PublicKey(tokenAddress);
    
    // Fetch basic token information
    const mintInfo = await getMint(connection, mintPublicKey);
    const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
    const formattedSupply = supply.toLocaleString('en-US', {
      maximumFractionDigits: Math.min(mintInfo.decimals, 6)
    });

    console.log(chalk.green('\n=== Token Information ==='));
    
    // Attempt to fetch metadata
    let metadata = null;
    let tokenName = tokenAddress;
    let tokenSymbol = '';
    
    try {
      metadata = await fetchMetadata(umi, publicKey(tokenAddress));
      tokenName = metadata.name;
      tokenSymbol = metadata.symbol;
      console.log(`Token: ${chalk.bold(`${tokenName} (${tokenSymbol})`)}`);
    } catch (error) {
      console.log(`Token: ${chalk.yellow(tokenAddress)} ${chalk.gray('(No metadata)')}`);
    }
    
    console.log(`Mint Address: ${chalk.yellow(tokenAddress)}`);
    console.log(`Decimals: ${chalk.yellow(mintInfo.decimals.toString())}`);
    console.log(`Supply: ${chalk.yellow(formattedSupply)}`);

    if (mintInfo.mintAuthority) {
      console.log(`Mint Authority: ${chalk.yellow(mintInfo.mintAuthority.toBase58())}`);
    } else {
      console.log(`Mint Authority: ${chalk.green('None (fixed supply)')}`);
    }

    if (mintInfo.freezeAuthority) {
      console.log(`Freeze Authority: ${chalk.yellow(mintInfo.freezeAuthority.toBase58())}`);
    } else {
      console.log(`Freeze Authority: ${chalk.green('None')}`);
    }

    // Display metadata information only if metadata exists
    if (metadata) {
      console.log(chalk.green('\n=== Token Metadata ==='));
      console.log(`Name: ${chalk.bold(metadata.name)}`);
      console.log(`Symbol: ${chalk.bold(metadata.symbol)}`);
      
      if (metadata.uri) {
        console.log(`Metadata URI: ${chalk.blue(metadata.uri)}`);
      }

      let creators: Creator[] = [];
      if (metadata.creators && typeof metadata.creators === 'object' && 'value' in metadata.creators) {
        creators = metadata.creators.value as Creator[];
      }

      if (Array.isArray(creators) && creators.length > 0) {
        console.log(chalk.green('\n=== Creators ==='));
        creators.forEach((creator: Creator, index: number) => {
          console.log(`Creator ${index + 1}: ${chalk.yellow(creator.address)} (Share: ${creator.share}%)`);
        });
      }
    } else {
      console.log(chalk.yellow('\n=== Token Metadata ==='));
      console.log(chalk.gray('No metadata found for this token.'));
      console.log(chalk.gray('To add metadata, you need to create a token with Metaplex metadata support.'));
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(chalk.red('Error getting token information:'), error.message);
      console.log(chalk.yellow('\nTips:'));
      console.log('- Check if the token address is correct');
      console.log('- Make sure you are connected to the internet');
      console.log('- The token might not exist on Devnet');
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }
    process.exit(1);
  }
}

getTokenInfo();
