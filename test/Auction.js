const BN = require('bn.js');
const Auction = artifacts.require('Auction');
const helper = require('./helpers/TimeHelper.js');

contract ('Auction', function(accounts) {
  const admin = accounts[0];
  const seller = accounts[1];
  const bidder = accounts[2];
  const reservePrice = '1000000000000000000';
  const startingBid = '1000000000000000';
  const buyout = '1000000000000000000000';
  const duration = 100;

  var auctionInstance;

  it ('initializes contract with correct values', async function () {
    auctionInstance = await Auction.deployed({from: admin});
    assert.notEqual(auctionInstance.address, '0x0', 'has contract address');
  });

  it ('initializes items with correct values', async function () {
    let itemNo = 0;

    try {
      await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, false);
      throw 'prevents open second-price auctions'
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
    assert.equal(_log.logs[0].args.buyout, buyout, 'logs correct buyout price');
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
      throw 'prevents initalization of item number with existing item';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents initalization of item number with existing item');
    }
  });

  it ('allows users to view items', async function() {
    var itemNo = 1;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.getItemData(999);
      throw 'prevents accessing uninitialized items';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents accessing uninitialized items');
    }

    let _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[0], startingBid, 'has correct starting bid');
    assert.equal(_data[1], buyout, 'has correct buyout amount');
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
    var itemNo = 3;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});

    try {
      await auctionInstance.bid(999, 0);
      throw 'prevents bid on uninitialized item';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid on uninitialized item');
    }

    try {
      await auctionInstance.bid(itemNo, 0);
      throw 'prevents bid with lower value than starting bid';
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
      throw 'prevents bid with same value as previous bid in open auction';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid with same value as previous bid in open auction');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);
    auctionInstance = await Auction.deployed();
    try {
      await auctionInstance.bid(itemNo, reservePrice, {from: bidder});
      throw 'prevents bid after auction time has elapsed';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid after auction time has elapsed');
    }

    itemNo = 4;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, 10000000, false, true, {from: seller});

    _success = await auctionInstance.bid(itemNo, reservePrice, {from: bidder});
    assert(_success, true, 'successfully entered bid on closed auction');

    _success = await auctionInstance.bid(itemNo, startingBid, {from: bidder});
    assert(_success, true, 'successfully entered lower bid on closed auction');

    _data = await auctionInstance.getItemData(itemNo);
    assert.equal(_data[4], 2, 'increments item bids by 2');
  });

  it ('allows the claiming/selling of items', async function () {
    var itemNo = 5;
    await auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    await auctionInstance.bid(itemNo, reservePrice, {from: bidder});

    try {
      await auctionInstance.claimItem(0);
      throw 'prevents claiming uninitialized item';
    }
    catch (error) {
       assert(error.message.indexOf('revert') >= 0, 'prevents claiming uninitialized item');
    }

    try {
      await auctionInstance.claimItem(itemNo);
      throw 'prevents claiming item still on auction'
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming item still on auction');
    }

    await helper.advanceTimeAndBlock(duration * 1.5);
    try {
      await auctionInstance.claimItem(itemNo, {from: seller});
      throw'prevents unauthorized claiming of item';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized claiming of item');
    }

    try {
      await auctionInstance.claimItem(itemNo, {from: bidder, value: 0});
      throw'prevents claiming of item with insufficient funds';
    }
    catch (error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming of item with insufficient funds');
    }

    let _success = await auctionInstance.claimItem.call(itemNo, {from: bidder, value: reservePrice * 6 / 5});
    assert.equal(_success, true, 'successfully claimed item');

    let _log = await auctionInstance.claimItem(itemNo, {from: bidder, value: reservePrice * 6 / 5})
    assert.equal(_log.logs.length, 1, 'emits 1 event');
    assert.equal(_log.logs[0].event, 'Sell', 'emits the "Sell" event');
    assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
    assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct account');
  });
  /*

  it ('allows sellers to extend the auction time', function () {
    var auctionInstance;
    return Auction.new({from: admin}).then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    }).then(function() {
      return auctionInstance.extendTime(0, duration);
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents extension of time on uninitialized item');
      return auctionInstance.extendTime(itemNo, duration, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized extension of time');
      return auctionInstance.extendTime(itemNo, duration * 2, {from: seller});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents extension of time greater than original duration');
    }).then(setTimeout(function() {
      return Auction.deployed().then(function(instance) {
        instance.extendTime(itemNo);
      }).then(assert.fail).catch(function(error) {
        assert(error.message.indexOf('revert') >= 0, 'prevents extension of time once auction has finished');
      });
      return Auction.new({from: admin});
    }), duration).then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.initItem(itemNo, reservePrice, startingBid, buyout, duration, true, true, {from: seller});
    }).then(function() {
      return auctionInstance.extendTime(0);
    }).then
  });

  it ('ends the auction', function () {
    var auctionInstance;
    return Auction.deployed().then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.endAuction(itemNo, {from: bidder});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bidder from ending auction');
      return auctionInstance.endAuction(0, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents ending auction on uninitialized item');
      return auctionInstance.endAuction.call(itemNo, {from: admin});
    }).then(function(_success) {
      assert.equal(_success, true, 'successfully ends auction');
      return auctionInstance.endAuction(itemNo, {from: admin});
    }).then(function(_log) {
      assert.equal(_log.logs.length, 1, 'emits 1 event');
      assert.equal(_log.logs[0].event, 'Sell', 'emits the "Sell" event');
      assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
      assert.equal(_log.logs[0].args.bids, 1, 'logs correct amount of bids');
      assert.equal(_log.logs[0].args.highBid, bidAmount, 'logs correct final bid');
      assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct final bidder');
      assert.equal(_log.logs[0].args.claimable, true, 'allows item to be claimed');
      return auctionInstance.getItemData(itemNo);
    }).then(function(_data) {
      assert.equal(_data[4], false, 'turns off biddable aspect of item');
      assert.equal(_data[5], true, 'allows item to be claimed');
      return auctionInstance.endAuction(0, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents ending auction that has already been ended' + error);
      return auctionInstance.bid(itemNo, {from: bidder, value: bidAmount + 1});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bidding on sold items' + error);
    });
  });

  it ('allows users to claim items', function() {
    var auctionInstance;
    return Auction.deployed().then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.claimItem(0);
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming uninitialized item');
      return auctionInstance.claimItem(itemNo, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents unauthorized account claiming item');
      return auctionInstance.claimItem(itemNo, {from: bidder, value: 0});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming item with wrong fee');
      return auctionInstance.claimItem.call(itemNo, {from: bidder, value: bidAmount / 5});
    }).then(function(_success) {
      assert.equal(_success, true, 'successfully claims item');
      return auctionInstance.claimItem(itemNo, {from: bidder, value: bidAmount / 5});
    }).then(function(_log) {
      assert.equal(_log.logs.length, 1, 'emits 1 event');
      assert.equal(_log.logs[0].event, 'Claim', 'emits the "Claim event"');
      assert.equal(_log.logs[0].args.itemNo, itemNo, 'logs correct item number');
      assert.equal(_log.logs[0].args.bidder, bidder, 'logs correct bidder');
      assert.equal(_log.logs[0].args.fee, bidAmount / 5, 'logs correct fee');
      return auctionInstance.claimItem(itemNo, {from: bidder, value: bidAmount / 5});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming item that has been previously claimed.');
    });
  });

  */
});
