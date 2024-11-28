import { bundlrStorage, Metaplex, toMetaplexFileFromBrowser, walletAdapterIdentity } from "@metaplex-foundation/js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

export async function mintWithMetaplexJs(
    connection: Connection,
    networkConfiguration: string, 
    wallet: WalletContextState,
    name: string,
    symbol: string,
    description: string,
    collection: PublicKey,
    image: File,
    paymentMint?: PublicKey, // Optional SPL token mint address
): Promise<[string, string]> {

    // Use Bundlr for storage with minimum possible fees
    const bundlrAddress = networkConfiguration === "mainnet-beta" 
        ? "https://node1.bundlr.network"
        : "https://devnet.bundlr.network";

    const metaplex = Metaplex.make(connection)
        .use(walletAdapterIdentity(wallet))
        .use(bundlrStorage({
            address: bundlrAddress,
            providerUrl: networkConfiguration === "mainnet-beta" 
                ? "https://mainnet.helius-rpc.com/?api-key=035bebc1-3e21-4b5a-8031-a5634236df89"
                : "https://devnet.helius-rpc.com/?api-key=035bebc1-3e21-4b5a-8031-a5634236df89",
            timeout: 60000,
            priceMultiplier: 1, // Minimum price multiplier
        }));

    // Upload metadata with minimum storage cost
    const { uri } = await metaplex.nfts().uploadMetadata({
        name,
        symbol,
        description,
        image: await toMetaplexFileFromBrowser(image),
    }, { commitment: 'finalized' }); // Use finalized commitment for minimum fees

    // Create NFT with minimum fees
    const { nft, response } = await metaplex.nfts().create({
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: 0, // No royalties to minimize fees
        tokenOwner: wallet.publicKey,
        mintTokens: true,
        collection,
        creators: [{
            address: wallet.publicKey,
            share: 100
        }]
    });

    return [nft.address.toBase58(), response.signature];
}
