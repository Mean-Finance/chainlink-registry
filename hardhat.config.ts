import 'dotenv/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import '@typechain/hardhat/dist/type-extensions';
import { removeConsoleLog } from 'hardhat-preprocessor';
import 'hardhat-gas-reporter';
import '@0xged/hardhat-deploy';
import 'solidity-coverage';
import './tasks/npm-publish-clean-typechain';
import { HardhatUserConfig, MultiSolcUserConfig, NetworksUserConfig } from 'hardhat/types';
import { getNodeUrl, accounts } from './utils/network';
import 'tsconfig-paths/register';

const networks: NetworksUserConfig = process.env.TEST
  ? {
      hardhat: {
        allowUnlimitedContractSize: true,
      },
    }
  : {
      hardhat: {
        forking: {
          enabled: process.env.FORK ? true : false,
          url: getNodeUrl('mainnet'),
        },
      },
      localhost: {
        url: getNodeUrl('localhost'),
        accounts: accounts('localhost'),
      },
      rinkeby: {
        url: getNodeUrl('rinkeby'),
        accounts: accounts('rinkeby'),
      },
      ropsten: {
        url: getNodeUrl('ropsten'),
        accounts: accounts('ropsten'),
      },
      kovan: {
        url: getNodeUrl('kovan'),
        accounts: accounts('kovan'),
      },
      goerli: {
        url: getNodeUrl('goerli'),
        accounts: accounts('goerli'),
      },
      mainnet: {
        url: getNodeUrl('mainnet'),
        accounts: accounts('mainnet'),
      },
      arbitrum: {
        url: getNodeUrl('arbitrum'),
        accounts: accounts('arbitrum'),
      },
      optimism: {
        url: 'https://mainnet.optimism.io',
        accounts: accounts('optimism'),
      },
      'optimism-kovan': {
        url: 'https://kovan.optimism.io',
        accounts: accounts('optimism-kovan'),
      },
      mumbai: {
        url: 'https://rpc-mumbai.matic.today',
        accounts: accounts('mumbai'),
      },
      polygon: {
        url: 'https://polygon-rpc.com',
        accounts: accounts('polygon'),
      },
    };

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  mocha: {
    timeout: process.env.MOCHA_TIMEOUT || 300000,
  },
  namedAccounts: {
    deployer: 0,
    eoaAdmin: '0x1a00e1E311009E56e3b0B9Ed6F86f5Ce128a1C01',
    msig: {
      ethereum: '0xEC864BE26084ba3bbF3cAAcF8F6961A9263319C4',
      optimism: '0x308810881807189cAe91950888b2cB73A1CC5920',
      polygon: '0xCe9F6991b48970d6c9Ef99Fffb112359584488e3',
      arbitrum: '0x84F4836e8022765Af9FBCE3Bb2887fD826c668f1',
    },
  },
  networks,
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 9999,
          },
        },
      },
    ],
  },
  gasReporter: {
    currency: process.env.COINMARKETCAP_DEFAULT_CURRENCY || 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    enabled: true,
    outputFile: 'gasReporterOutput.json',
    noColors: true,
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat'),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: 'typechained',
    target: 'ethers-v5',
  },
};

if (process.env.TEST) {
  const solidity = config.solidity as MultiSolcUserConfig;
  solidity.compilers.forEach((_, i) => {
    solidity.compilers[i].settings! = {
      ...solidity.compilers[i].settings!,
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    };
  });
  config.solidity = solidity;
}

export default config;
