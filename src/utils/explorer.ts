import { PublicKey, Transaction } from '@solana/web3.js'
import base58 from 'bs58'

export function getExplorerUrl(
    endpoint: string,
    viewTypeOrItemAddress: 'inspector' | PublicKey | string,
    itemType = 'address' // | 'tx' | 'block'
  ) {
    const getClusterUrlParam = () => {
      let cluster = ''
      if (endpoint === 'localnet') {
        cluster = `custom&customUrl=${encodeURIComponent(
          'http://localhost:3004/'
        )}`
      } else if (endpoint === 'https://mainnet.helius-rpc.com/?api-key=035bebc1-3e21-4b5a-8031-a5634236df89') {
        cluster = 'mainnet'
      }
  
      return cluster ? `?cluster=${cluster}` : ''
    }
  
    return `https://explorer.solana.com/${itemType}/${viewTypeOrItemAddress}${getClusterUrlParam()}`
  }