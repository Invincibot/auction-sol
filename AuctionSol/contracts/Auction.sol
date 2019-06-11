pragma solidity ^0.5.0;

contract Auction {
  struct Item {
    uint reservePrice;
    uint bids;
    uint highBid;
    address payable bidder;
    bool biddable;
    bool claimed;
  }

  event Bid (
    uint itemNo,
    uint amount,
    address indexed bidder
  );

  event Sell (
    uint itemNo,
    uint bids,
    uint highBid,
    address indexed bidder
  );

  Item[] public items;

  mapping (uint => uint) public itemIndex;
  mapping (uint => bool) public initialized;

  address payable public admin;

  constructor () public {
    admin = msg.sender;
  }

  function initItem (uint _itemNo, uint _reservePrice) public returns (bool) {
    require(msg.sender == admin, "Only the admin may initialize items.");
    require(!initialized[_itemNo], "Item under item number already exists.");
    Item memory _item = Item(_reservePrice, 0, 0, address(0), true, false);
    itemIndex[_itemNo] = items.push(_item) - 1;
    initialized[_itemNo] = true;
    return true;
  }

  function getItemData (uint _itemNo) public view returns (uint, uint, uint, address, bool) {
    require(initialized[_itemNo], "Item not initialized");
    uint _itemID = itemIndex[_itemNo];
    Item memory _item = items[_itemID];
    return (_item.reservePrice, _item.bids, _item.highBid, _item.bidder, _item.biddable);
  }

  function bid (uint _itemNo) public payable returns (bool) {
    uint _itemID = itemIndex[_itemNo];
    require(initialized[_itemNo], "Invalid item number.");
    require(items[_itemID].biddable, "Item already auctioned.");
    require(msg.value > items[_itemID].highBid, "Insufficient bid.");
    Item memory _item = items[_itemID];
    if (_item.bidder != address(0)) {
      _item.bidder.transfer(_item.highBid);
    }
    items[_itemID].bids++;
    items[_itemID].highBid = msg.value;
    items[_itemID].bidder = msg.sender;
    emit Bid(_itemNo, msg.value, msg.sender);
    return true;
  }

  function endAuction(uint _itemNo) public returns (bool) {
    require(msg.sender == admin);
    uint _itemID = itemIndex[_itemNo];
    require(initialized[_itemNo], "Invalid item number.");
    Item memory _item = items[_itemID];
    require(_item.biddable, "Item already auctioned.");
    items[_itemID].biddable = false;
    emit Sell(_itemNo, _item.bids, _item.highBid, _item.bidder);
    return true;
  }

  function claimItem(uint _itemNo) public payable returns bool {
    require(initialized[_itemNo], "Invalid item number");
    uint _itemID = itemIndex[_itemNo];
    Item memory _item = items[_itemID];
    require(msg.sender == _item.bidder);
    require(msg.value == _item.)
  }

  function multiply (uint x, uint y) internal pure returns (uint) {
    require(y == 0 || (z = x * y) / y == x);
  }
}
