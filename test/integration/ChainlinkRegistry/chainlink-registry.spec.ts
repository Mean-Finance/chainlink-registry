import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { JsonRpcSigner } from '@ethersproject/providers';
import { wallet } from '@test-utils';
import evm, { snapshot } from '@test-utils/evm';
import { AggregatorV2V3Interface, ChainlinkRegistry } from '@typechained';
import FEED_ABI from '@chainlink/contracts/abi/v0.8/AggregatorV2V3Interface.json';
import { given, then, when } from '@test-utils/bdd';
import { expect } from 'chai';
import { DeterministicFactory, DeterministicFactory__factory } from '@mean-finance/deterministic-factory';
import { address as DETERMINISTIC_FACTORY_ADDRESS } from '@mean-finance/deterministic-factory/deployments/polygon/DeterministicFactory.json';

type Token = { address: string; name: string };

const LINK = { address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', name: 'LINK' };
const AAVE = { address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', name: 'AAVE' };
const BADGER = { address: '0x1fcbe5937b0cc2adf69772d228fa4205acf4d9b2', name: 'BADGER' };

const USD = { address: '0x0000000000000000000000000000000000000348', name: 'USD' };
const ETH = { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', name: 'ETH' };

const PAIRS = [
  { base: LINK, quote: USD, feed: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665' },
  { base: AAVE, quote: ETH, feed: '0xbE23a3AA13038CfC28aFd0ECe4FdE379fE7fBfc4' },
  { base: BADGER, quote: USD, feed: '0xF626964Ba5e81405f47e8004F0b276Bb974742B5' },
  { base: LINK, quote: ETH, feed: '0xb77fa460604b9C6435A235D057F7D319AC83cb53' },
];

// We are not testing every function, since we are already doing this in the unit tests
const REDIRECT_FUNCTIONS = ['decimals', 'description', 'version', 'latestRoundData', 'latestAnswer', 'latestRound'] as const;
type Functions = typeof REDIRECT_FUNCTIONS[number];

describe('ChainlinkRegistry', () => {
  let admin: JsonRpcSigner;
  let registry: ChainlinkRegistry;
  let snapshotId: string;

  before(async () => {
    await evm.reset({
      network: 'polygon',
      blockNumber: 33391150, // We set a block, so that future deployments don't break the deterministic deployment
    });
    const { deployer, msig: msigAddress } = await getNamedAccounts();
    admin = await wallet.impersonate(msigAddress);
    await ethers.provider.send('hardhat_setBalance', [msigAddress, '0xfffffffffffffffff']);

    // Give deployer role to our deployer address
    const deterministicFactory = await ethers.getContractAt<DeterministicFactory>(
      DeterministicFactory__factory.abi,
      DETERMINISTIC_FACTORY_ADDRESS
    );
    await deterministicFactory.connect(admin).grantRole(await deterministicFactory.DEPLOYER_ROLE(), deployer);
    await deployments.run('ChainlinkFeedRegistry', {
      resetMemory: true,
      deletePreviousDeployments: false,
      writeDeploymentsToFiles: false,
    });
    registry = await ethers.getContract('ChainlinkFeedRegistry');
    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    await snapshot.revert(snapshotId);
  });

  for (const { base, quote, feed: feedAddress } of PAIRS) {
    describe(`${base.name}/${quote.name}`, () => {
      let feed: AggregatorV2V3Interface;
      given(async () => {
        feed = await ethers.getContractAt(FEED_ABI, feedAddress);
        await registry.connect(admin).assignFeeds([{ base: base.address, quote: quote.address, feed: feedAddress }]);
      });
      for (const method of REDIRECT_FUNCTIONS) {
        whenFunctionIsCalledThenResultIsTheSameInTheFeedAndTheRegistry({
          method,
          base,
          quote,
          feed: () => feed,
        });
      }
    });
  }

  function whenFunctionIsCalledThenResultIsTheSameInTheFeedAndTheRegistry({
    method,
    base,
    quote,
    feed,
  }: {
    method: Functions;
    base: Token;
    quote: Token;
    feed: () => AggregatorV2V3Interface;
  }) {
    when(`'${method}' is called`, () => {
      then('result is the same in the feed, and in the registry', async () => {
        const feedResult = await feed()[method]();
        const registryResult = await registry[method](base.address, quote.address);
        expect(feedResult).to.eql(registryResult);
      });
    });
  }
});
