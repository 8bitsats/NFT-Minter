import { PublicKey } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import Image from "next/image";
import { FC, useCallback, useState } from "react";
import { mintWithMetaplexJs } from "utils/metaplex";
import { notify } from "utils/notifications";

const TOKEN_NAME = "Solana Workshop NFT";
const TOKEN_SYMBOL = "SHOP";
const TOKEN_DESCRIPTION = "NFT minted in the NFT Minter workshop!";
const WORKSHOP_COLLECTION = new PublicKey("CPpyd2Uq1XkCkd9KHswjttdQXTvZ4mmrnif3tXg9i8sk");

const SUPPORTED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff'
];

export const NftMinter: FC = () => {
    const { connection } = useConnection();
    const { networkConfiguration } = useNetworkConfiguration();
    const wallet = useWallet();

    const [image, setImage] = useState<File | null>(null);
    const [createObjectURL, setCreateObjectURL] = useState<string | null>(null);
    const [paymentMint, setPaymentMint] = useState<string>("");
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);

    const [mintAddress, setMintAddress] = useState<string | null>(null);
    const [mintSignature, setMintSignature] = useState<string | null>(null);

    const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                notify({ type: 'error', message: 'File too large', description: 'Maximum file size is 5MB' });
                return;
            }

            // Accept any image type
            if (!file.type.startsWith('image/')) {
                notify({ 
                    type: 'error', 
                    message: 'Invalid file type', 
                    description: 'Please upload an image file' 
                });
                return;
            }

            setImage(file);
            setCreateObjectURL(URL.createObjectURL(file));
            setIsUploading(true);
            setUploadedImagePath(null); // Reset uploaded path

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
                }

                const data = await response.json();
                if (data.success) {
                    setUploadedImagePath(data.path);
                    notify({ type: 'success', message: 'Image uploaded successfully!' });
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                notify({ type: 'error', message: 'Upload failed', description: error.message });
                setImage(null);
                setCreateObjectURL(null);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const onClickMintNft = useCallback(async () => {
        if (!wallet.publicKey) {
            notify({ type: 'error', message: 'error', description: 'Wallet not connected!' });
            return;
        }
        
        if (!image || !uploadedImagePath) {
            notify({ type: 'error', message: 'error', description: 'Please upload an image first!' });
            return;
        }

        if (isUploading) {
            notify({ type: 'error', message: 'error', description: 'Please wait for the image to finish uploading!' });
            return;
        }

        let paymentMintPubkey: PublicKey | undefined;
        if (paymentMint.trim()) {
            try {
                paymentMintPubkey = new PublicKey(paymentMint);
            } catch (error) {
                notify({ type: 'error', message: 'Invalid SPL token address', description: error.message });
                return;
            }
        }

        try {
            const [mintAddr, signature] = await mintWithMetaplexJs(
                connection,
                networkConfiguration,
                wallet,
                TOKEN_NAME,
                TOKEN_SYMBOL,
                TOKEN_DESCRIPTION,
                WORKSHOP_COLLECTION,
                image,
                paymentMintPubkey,
            );
            setMintAddress(mintAddr);
            setMintSignature(signature);
            notify({ type: 'success', message: 'NFT minted successfully!' });
        } catch (error) {
            notify({ type: 'error', message: 'Minting failed', description: error.message });
            console.error('Minting error:', error);
        }
    }, [wallet, connection, networkConfiguration, image, paymentMint, isUploading, uploadedImagePath]);

    return (
        <div>
            <div className="mx-auto flex flex-col">
                {createObjectURL && (
                    <Image 
                        className="mx-auto mb-4" 
                        alt="uploadedImage" 
                        width={300} 
                        height={300} 
                        src={createObjectURL}
                    />
                )}
                {!mintAddress && !mintSignature && (
                    <div className="mx-auto text-center mb-2">
                        <input 
                            className="mx-auto mb-4" 
                            type="file" 
                            accept="image/*"
                            onChange={uploadImage}
                            disabled={isUploading} 
                        />
                        {isUploading && (
                            <p className="text-orange-500 mb-2">Uploading image...</p>
                        )}
                        <input
                            type="text"
                            placeholder="SPL Token Mint Address (optional)"
                            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black"
                            value={paymentMint}
                            onChange={(e) => setPaymentMint(e.target.value)}
                            disabled={isUploading}
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    {createObjectURL && !mintAddress && !mintSignature && !isUploading && uploadedImagePath && (
                        <div>
                            <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-orange-300 to-orange-500 
                                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 
                                group-hover:duration-200 animate-tilt">
                            </div>
                            <button
                                className="px-8 m-2 mt-4 w-40 h-14 btn animate-pulse bg-gradient-to-br 
                                    from-orange-300 to-orange-500 hover:from-white hover:to-orange-300 
                                    text-black text-lg rounded-lg"
                                onClick={onClickMintNft}
                            >
                                <span>Mint!</span>
                            </button>
                        </div>
                    )}

                    {mintAddress && mintSignature && (
                        <div>
                            <h4 className="md:w-full text-2x1 md:text-4xl text-center text-slate-300 my-2">
                                <p>Mint successful!</p>
                                <p className="text-xl mt-4 mb-2">
                                    Mint address: <span className="font-bold text-lime-500">
                                        <a 
                                            className="border-b-2 border-transparent hover:border-lime-500"
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            href={`https://explorer.solana.com/address/${mintAddress}?cluster=${networkConfiguration}`}
                                        >
                                            {mintAddress}
                                        </a>
                                    </span>
                                </p>
                                <p className="text-xl">
                                    Tx signature: <span className="font-bold text-amber-600">
                                        <a 
                                            className="border-b-2 border-transparent hover:border-amber-600"
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            href={`https://explorer.solana.com/tx/${mintSignature}?cluster=${networkConfiguration}`}
                                        >
                                            {mintSignature}
                                        </a>
                                    </span>
                                </p>
                            </h4>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
