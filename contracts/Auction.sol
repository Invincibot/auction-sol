pragma solidity ^0.5.0;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Auction {
  using SafeMath for uint;

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

  event Claim (
    uint itemNo,
    address indexed bidder,
    uint fee
  );

  Item[] public items;

  mapping (uint => uint) public itemIndex;
  mapping (uint => bool) public initialized;

  address payable public admin;

  constructor () public {
    admin = msg.sender;
  }

  function initItem (uint _itemNo, uint _reservePrice) public returns (bool) {
    require(msg.sender == admin, "Unauthorized account");
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
    require(msg.sender == admin, "Unauthorized account.");
    uint _itemID = itemIndex[_itemNo];
    require(initialized[_itemNo], "Invalid item number.");
    Item memory _item = items[_itemID];
    require(_item.biddable, "Item already auctioned.");
    items[_itemID].biddable = false;
    emit Sell(_itemNo, _item.bids, _item.highBid, _item.bidder);
    return true;
  }

  function claimItem(uint _itemNo) public payable returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    uint _itemID = itemIndex[_itemNo];
    Item memory _item = items[_itemID];
    require(msg.sender == _item.bidder, "Invalid account.");
    require(msg.value == SafeMath.div(_item.highBid, 5), "Invalid fee.");
    require(!_item.claimed, "Item already claimed.");
    items[_itemID].claimed = true;
    emit Claim(_itemNo, msg.sender, msg.value);
    return true;
  }
}
