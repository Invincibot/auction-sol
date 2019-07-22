const BN = require('bn.js');
const Auction = artifacts.require('Auction');
const helper = require('./helpers/TimeHelper.js');

contract ('Auction', function(accounts) {
  const admin = accounts[0];
  const seller = accounts[1];
  const bidder = accounts[2];
  const reservePrice = new BN('1000000000000000000', 10);
  const startingBid = '1000000000000000';
  const buyout = new BN('10000000000000000000', 10);
  const duration = 100;

  var auctionInstance;

  it ('initializes contract with correct values', async function () {
    auctionInstance = await Auction.deployed({from: admin});
    assert.notEqual(auctionInstance.address, '0x0', 'has contract address');
  });

  it ('initializes items with correct values', async function () {
    var itemNo = 0;

    try {
      await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, false);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents open second-price auctions');
    }

    let _success = await auctionInstance.initItem.call(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
      assert.equal(_success, true, 'successfully added item');

    let _log = await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'NewItem', 'emits the "NewItem" event');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.startingBid, startingBid, 'logs correct starting bid');
    assert(_log.logs[0].args.buyout.eq(buyout), 'logs correct buyout price');
    assert.equal(_log.logs[0].args.duration, duration, 'logs correct duration');
    assert.equal(_log.logs[0].args.open, true, 'logs open auction');
    assert.equal(_log.logs[0].args.firstPrice, true, 'logs first-price auction');
    assert.equal(_log.logs[0].args.seller, seller, 'logs correct seller');

    let _itemNo = await auctionInstance.getItemNumber(0);
    assert.equal(_itemNo, itemNo, 'returns correct item number');

    let _initialized = await auctionInstance.initialized(itemNo);
    assert.equal(_initialized, true, 'successfully initialized item');

    try {
      await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents initalization of item number with existing item');
    }
  });

  it ('allows users to view items', async function() {
    itemNo = 1;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.getItemData(999);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents accessing uninitialized items');
    }

    let _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[0], startingBid, 'has correct starting bid');
    assert(_data[1].eq(buyout), 'has correct buyout amount');
    assert.equal(_data[2], duration, 'has correct duration');
    // Can't test for endTime as getting epoch from ganache is unknown to me...
    assert.equal(_data[4], 0, 'has no bids');
    assert.equal(_data[5], 0, 'has no highest bid');
    assert.equal(_data[6], 0x0000000000000000000000000000000000000000, 'has no highest bidder');
    assert.equal(_data[7], seller, 'has correct seller');
    assert.equal(_data[8], true, 'is an open auction');
    assert.equal(_data[9], true, 'is a first-price auction');

    itemNo = 2;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, false, true, {from: seller});
    await auctionInstance.bid(itemNo, startingBid);

    _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[5], 0, 'should not display highest bid');
  });

  it ('allows users to bid', async function () {
    itemNo = 3;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.bid(999, 0);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid on uninitialized item');
    }

    try {
      await auctionInstance.bid(itemNo, 0);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid with lower value than starting bid');
    }

    let _success = await auctionInstance.bid.call(itemNo, startingBid, {from: bidder});
    assert.equal(_success, true, 'successfully entered bid on open auction');

    let _log = await auctionInstance.bid(itemNo, startingBid, {from: bidder});
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'Bid', 'emits the "Bid" event');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.amount, startingBid, 'logs correct bid amount');
    assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct bidder address');

    let _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[4], 1, 'increments item bids by 1');
    assert.equal(_data[5], startingBid, 'has correct current bid');
    assert.equal(_data[6], bidder, 'has correct bidder address');

    try {
      await auctionInstance.bid(itemNo, startingBid, {from: bidder});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid with same value as previous bid in open auction');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.bid(itemNo, reservePrice, {from: bidder});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid after auction time has elapsed');
    }

    itemNo = 4;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, false, true, {from: seller});

    _success = await auctionInstance.bid(itemNo, reservePrice, {from: bidder});
    assert(_success, true, 'successfully entered bid on closed auction');

    _success = await auctionInstance.bid(itemNo, startingBid, {from: bidder});
    assert(_success, true, 'successfully entered lower bid on closed auction');

    _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[4], 2, 'increments item bids by 2');
  });

  it ('allows sellers to extend the auction time', async function () {
    itemNo = 5;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.extendTime(0, duration);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents extension of time on uninitialized item');
    }

    try {
      await auctionInstance.extendTime(itemNo, duration, {from: admin});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized extension of time');
    }

    try {
      await auctionInstance.extendTime(itemNo, duration * 2, {from: seller});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents extension of time greater than original duration');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.extendTime(itemNo, duration);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents extension of time once auction has finished');
    }

    itemNo = 6;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    let _success = await auctionInstance.extendTime.call(itemNo, duration, {from: seller});
    assert(_success, true, 'allows auction duration to be extended.');

    await helper.advanceTimeAndBlock(duration * 0.5);

    try {
      await auctionInstance.extendTime(itemNo, duration, {from: seller});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents two extensions of time');
    }
  });

  it ('allows the buyout of items', async function () {
    itemNo = 7;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.buyout(0);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents buyout of uninitialized item');
    }

    try {
      await auctionInstance.buyout(itemNo, {from: bidder, value: 0});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents buyout with insufficient fee');
    }

    let _success = await auctionInstance.buyout.call(itemNo, {from: bidder, value: buyout.div(new BN(5)).mul(new BN(6))});
    assert.equal(_success, true, 'successfully bought out item');

    let _log = await auctionInstance.buyout(itemNo, {from: bidder, value: buyout.div(new BN(5)).mul(new BN(6))});
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'Sell', 'emits the "Sell event"');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct account');
    assert.equal(_log.logs[0].args.buyout, true, 'item has been bought out');
    assert.equal(_log.logs[0].args.fee, buyout * 0.2, 'logs correct fee');

    itemNo = 8;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    await auctionInstance.bid(itemNo, reservePrice, {from: bidder});

    try {
      await auctionInstance.buyout(itemNo, {from: bidder, value: buyout.div(new BN(5)).mul(new BN(6))});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents buyout on item with bids');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);
    try {
      await auctionInstance.buyout(itemNo, {from: bidder, value: buyout.div(new BN(5)).mul(new BN(6))});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents buyout on item with ended auction');
    }
  });

  it ('allows the claiming/selling of items', async function () {
    itemNo = 9;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    await auctionInstance.bid(itemNo, reservePrice, {from: bidder});

    try {
      await auctionInstance.claimItem(0);
      assert.fail;
    }
    catch (error) {
       assert(error.message.indexOf('revert') >= 0, 'prevents claiming uninitialized item');
    }

    try {
      await auctionInstance.claimItem(itemNo);
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming item still on auction');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.claimItem(itemNo, {from: seller});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized claiming of item');
    }

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder, value: 0});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of item with insufficient funds');
    }

    let _success = await auctionInstance.claimItem.call(itemNo, {from: bidder, value: (reservePrice * 1.2).toString()});
    assert.equal(_success, true, 'successfully claimed item');

    let _log = await auctionInstance.claimItem(itemNo, {from: bidder, value: (reservePrice * 1.2).toString()});
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'Sell', 'emits the "Sell" event');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct fee');
    assert.equal(_log.logs[0].args.buyout, false, 'item has not been bought out');
    assert.equal(_log.logs[0].args.fee, reservePrice * 0.2, 'logs correct fee');

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder, value: (reservePrice * 1.2).toString()})
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of item already claimed');
    }

    itemNo = 10;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, false, false, {from: seller});
    await auctionInstance.bid(itemNo, (reservePrice * 1.5).toString(), {from: bidder});
    await auctionInstance.bid(itemNo, (reservePrice * 2).toString(), {from: bidder});
    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder, value: (reservePrice * 2.4).toString()});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of second-highest-bid item with highest bid');
    }

    _success = await auctionInstance.claimItem.call(itemNo, {from: bidder, value: (reservePrice * 1.8).toString()});
    assert.equal(_success, true, 'successfully claimed item');

    itemNo = 11;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, false, false, {from: seller});
    await auctionInstance.bid(itemNo, (reservePrice * 0.75).toString(), {from: bidder});
    await auctionInstance.bid(itemNo, (reservePrice * 1.25).toString(), {from: bidder});
    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder, value: (reservePrice * 0.9).toString()});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of second-highest-bid item with with second highest bid when it does not meet the reserve price');
    }

    _success = await auctionInstance.claimItem.call(itemNo, {from: bidder, value: (reservePrice * 1.2).toString()});
    assert.equal(_success, true, 'successfully claimed item');

    itemNo = 12;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    await helper.advanceTimeAndBlock(duration * 1.5);

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized claiming of items');
    }

    try {
      await auctionInstance.claimItem(itemNo, {from: seller, value: 0});
      assert.fail;
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of items with insufficient fee');
    }

    _success = await auctionInstance.claimItem.call(itemNo, {from: seller, value: (reservePrice * 0.2).toString()});
    assert.equal(_success, true, 'successfully claimed item');

    _log = await auctionInstance.claimItem(itemNo, {from: seller, value: (reservePrice * 0.2).toString()});
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'Claim', 'emits the "Claim" event');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.seller, seller, 'logs correct account');
    assert.equal(_log.logs[0].args.fee, (reservePrice * 0.2).toString(), 'logs correct fee');
  });
});
