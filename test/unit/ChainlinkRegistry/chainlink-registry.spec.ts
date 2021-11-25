import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { behaviours, constants } from '@test-utils';
import { contract, given, then, when } from '@test-utils/bdd';
import { snapshot } from '@test-utils/evm';
import { AggregatorV3Interface, ChainlinkRegistry, ChainlinkRegistry__factory } from '@typechained';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { TransactionResponse } from '@ethersproject/abstract-provider';

chai.use(smock.matchers);

contract('ChainlinkRegistry', () => {
  const LINK = '0xa36085F69e2889c224210F603D836748e7dC0088'
  const USD = '0x0000000000000000000000000000000000000348'

  let governor: SignerWithAddress;
  let feed: FakeContract<AggregatorV3Interface>
  let registry: ChainlinkRegistry;
  let snapshotId: string;

  before('Setup accounts and contracts', async () => {
    [, governor] = await ethers.getSigners();
    const factory: ChainlinkRegistry__factory = await ethers.getContractFactory('contracts/ChainlinkRegistry/ChainlinkRegistry.sol:ChainlinkRegistry');
    registry = await factory.deploy(governor.address);
    feed = await smock.fake('AggregatorV3Interface')
    snapshotId = await snapshot.take();
  });

  beforeEach('Deploy and configure', async () => {
    await snapshot.revert(snapshotId);    
  });

  describe('setFeed', () => {
    when('zero address is sent for quote address', () => {
      then('reverts with message', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: registry.connect(governor),
          func: 'setFeed',
          args: [constants.ZERO_ADDRESS, USD, feed.address],
          message: 'ZeroAddress',
        });
      });
    });
    when('zero address is sent for base address', () => {
      then('reverts with message', async () => {
        await behaviours.txShouldRevertWithMessage({
          contract: registry.connect(governor),
          func: 'setFeed',
          args: [LINK, constants.ZERO_ADDRESS, feed.address],
          message: 'ZeroAddress',
        });
      });
    });
    when('setting a feed', () => {
      let tx: TransactionResponse;
      given(async () => {
        tx = await registry.connect(governor).setFeed(LINK, USD, feed.address);
      });
      then('it is set correctly', async () => {
        expect(await registry.feed(LINK, USD)).to.equal(feed.address)
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(registry, 'FeedSet').withArgs(LINK, USD, feed.address);
      });
    });
    when('removing a feed', () => {
      let tx: TransactionResponse;
      given(async () => {
        await registry.connect(governor).setFeed(LINK, USD, feed.address)
        tx = await registry.connect(governor).setFeed(LINK, USD, constants.ZERO_ADDRESS)
      });
      then('it is set correctly', async () => {
        expect(await registry.feed(LINK, USD)).to.equal(constants.ZERO_ADDRESS);
      });
      then('event is emitted', async () => {
        await expect(tx).to.emit(registry, 'FeedSet').withArgs(LINK, USD, constants.ZERO_ADDRESS);
      });
    });
    behaviours.shouldBeExecutableOnlyByGovernor({
      contract: () => registry,
      funcAndSignature: 'setFeed',
      params: () => [constants.NOT_ZERO_ADDRESS, constants.NOT_ZERO_ADDRESS, constants.NOT_ZERO_ADDRESS],
      governor: () => governor,
    });
  });
});
