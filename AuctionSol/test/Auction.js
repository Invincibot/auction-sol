var Auction = artifacts.require("Auction");

contract ('Auction', function(accounts) {
  const admin = accounts[0];
  const bidder = accounts[1];
  const itemNo = 69420;
  const reservePrice = 1000000000000000;
  const bidAmount = 1000000000000000;

  it ('initializes contract with correct values', function () {
    var auctionInstance;
    return Auction.new({from: admin}).then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.address;
    }).then(function(address) {
      assert.notEqual(address, '0x0', 'has contract address');
    });
  });

  it ('initializes items with correct values', function () {
    var auctionInstance;
    var itemID;
    return Auction.deployed().then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.initItem(itemNo, reservePrice, {from: bidder});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents addition of items from other accounts');
      return auctionInstance.initItem.call(itemNo, reservePrice, {from: admin});
    }).then(function(success) {
      assert.equal(success, true, 'successfully added item');
      return auctionInstance.initItem(itemNo, reservePrice, {from: admin});
    }).then(function() {
      return auctionInstance.itemIndex(itemNo);
    }).then(function(_itemID) {
      itemID = _itemID;
      assert.equal(itemID, 0, 'returns correct item ID');
      return auctionInstance.initialized(itemNo);
    }).then(function(initialized) {
      assert.equal(initialized, true, 'successfully initialized item');
      return auctionInstance.getItemData(itemNo);
    }).then(function(data) {
      assert.equal(data[0], reservePrice, 'has correct reserve price');
      assert.equal(data[1], 0, 'has no bids');
      assert.equal(data[2], 0, 'has no highest bid');
      assert.equal(data[3], 0x0000000000000000000000000000000000000000, 'has no highest bidder');
      return auctionInstance.initItem(itemNo, reservePrice, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents initalization of item number with existing item' + error);
    });
  });

  it ('allows users to bid on items', function () {
    var auctionInstance;
    return Auction.deployed().then(function(instance) {
      auctionInstance = instance;
      return auctionInstance.bid(0);
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid on uninitialized item');
      return auctionInstance.bid(itemNo, {value: 0});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bid with equal value to previous bid');
      return auctionInstance.bid.call(itemNo, {from: bidder, value: bidAmount});
    }).then(function(success) {
      assert.equal(success, true, 'successfully entered bid');
      return auctionInstance.bid(itemNo, {from: bidder, value: bidAmount});
    }).then(function(receipt) {
      assert.equal(receipt.logs.length, 1, 'emits 1 event');
      assert.equal(receipt.logs[0].event, 'Bid', 'emits the "Bid" event');
      assert.equal(receipt.logs[0].args.itemNo, itemNo, 'logs correct item number');
      assert.equal(receipt.logs[0].args.amount, bidAmount, 'logs correct bid amount');
      assert.equal(receipt.logs[0].args.bidder, bidder, 'logs correct bidder address');
      return auctionInstance.getItemData(itemNo);
    }).then(function(data) {
      assert.equal(data[1], 1, 'increments item bids by 1');
      assert.equal(data[2], bidAmount, 'has correct current bid');
      assert.equal(data[3], bidder, 'has correct bidder address');
    });
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
    }).then(function(success) {
      assert.equal(success, true, 'successfully ends auction');
      return auctionInstance.endAuction(itemNo, {from: admin});
    }).then(function(receipt) {
      assert.equal(receipt.logs.length, 1, 'emits 1 event');
      assert.equal(receipt.logs[0].event, 'Sell', 'emits the "Sell" event');
      assert.equal(receipt.logs[0].args.itemNo, itemNo, 'logs correct item number');
      assert.equal(receipt.logs[0].args.bids, 1, 'logs correct amount of bids');
      assert.equal(receipt.logs[0].args.highBid, bidAmount, 'logs correct final bid');
      assert.equal(receipt.logs[0].args.bidder, bidder, 'logs correct final bidder');
      return auctionInstance.getItemData(itemNo);
    }).then(function(data) {
      assert.equal(data[4], false, 'turns off biddable aspect of item');
      return auctionInstance.endAuction(0, {from: admin});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents ending auction that has already been ended');
      return auctionInstance.bid(itemNo, {from: bidder, value: bidAmount + 1});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents bidding on sold items');
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
    }).then(function(success) {
      assert.equal(success, true, 'successfully claims item');
      return auctionInstance.claimItem(itemNo, {from: bidder, value: bidAmount / 5});
    }).then(function(receipt) {
      assert.equal(receipt.logs.length, 1, 'emits 1 event');
      assert.equal(receipt.logs[0].event, 'Claim', 'emits the "Claim event"');
      assert.equal(receipt.logs[0].args.itemNo, itemNo, 'logs correct item number');
      assert.equal(receipt.logs[0].args.bidder, bidder, 'logs correct bidder');
      assert.equal(receipt.logs[0].args.fee, bidAmount / 5, 'logs correct fee');
      return auctionInstance.claimItem(itemNo, {from: bidder, value: bidAmount / 5});
    }).then(assert.fail).catch(function(error) {
      assert(error.message.indexOf('revert') >= 0, 'prevents claiming item that has been previously claimed.');
    });
  });
});
