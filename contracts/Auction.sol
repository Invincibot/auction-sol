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
    bool claimable;
  }

  event NewItem (
    uint itemNo
  );

  event Bid (
    uint itemNo,
    uint amount,
    address indexed bidder
  );

  event Sell (
    uint itemNo,
    uint bids,
    uint highBid,
    address indexed bidder,
    bool claimable
  );

  event Claim (
    uint itemNo,
    address indexed bidder,
    uint fee
  );

  uint[] public itemIndex;

  mapping (uint => Item) public items;
  mapping (uint => bool) public initialized;

  address payable public admin;

  constructor () public {
    admin = msg.sender;
  }

  function initItem (uint _itemNo, uint _reservePrice) public returns (bool) {
    require(msg.sender == admin, "Unauthorized account");
    require(!initialized[_itemNo], "Item under item number already exists.");
    Item memory _item = Item(_reservePrice, 0, 0, address(0), true, false);
    items[_itemNo] = _item;
    initialized[_itemNo] = true;
    itemIndex.push(_itemNo);
    emit NewItem(_itemNo);
    return true;
  }

  function getItemData (uint _itemNo) public view returns (uint, uint, address, bool, bool) {
    require(initialized[_itemNo], "Item not initialized");
    Item memory _item = items[_itemNo];
    return (_item.bids, _item.highBid, _item.bidder, _item.biddable, _item.claimable);
  }

  function getItemIDData (uint _itemID) public view returns (uint, uint, uint, address, bool, bool) {
    require(_itemID < itemIndex.length, "Item not found");
    uint _itemNo = itemIndex[_itemID];
    Item memory _item = items[_itemNo];
    return (_itemNo, _item.bids, _item.highBid, _item.bidder, _item.biddable, _item.claimable);
  }

  function getItemCount () public view returns (int) {
    return int(itemIndex.length);
  }

  function bid (uint _itemNo) public payable returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(items[_itemNo].biddable, "Item already auctioned.");
    require(msg.value > items[_itemNo].highBid, "Insufficient bid.");
    Item memory _item = items[_itemNo];
    if (_item.bidder != address(0)) {
      _item.bidder.transfer(_item.highBid);
    }
    items[_itemNo].bids++;
    items[_itemNo].highBid = msg.value;
    items[_itemNo].bidder = msg.sender;
    emit Bid(_itemNo, msg.value, msg.sender);
    return true;
  }

  function endAuction(uint _itemNo) public returns (bool) {
    require(msg.sender == admin, "Unauthorized account.");
    require(initialized[_itemNo], "Invalid item number.");
    Item memory _item = Auction.items[_itemNo];
    require(_item.biddable, "Item already auctioned.");
    Auction.items[_itemNo].biddable = false;
    if (_item.highBid >= _item.reservePrice) {
      Auction.items[_itemNo].claimable = true;
      emit Sell(_itemNo, _item.bids, _item.highBid, _item.bidder, true);
    }
    else {
      _item.bidder.transfer(_item.highBid);
      emit Sell(_itemNo, _item.bids, _item.highBid, _item.bidder, false);
      deleteItem(_itemNo);
    }
    return true;
  }

  function claimItem(uint _itemNo) public payable returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    Item memory _item = items[_itemNo];
    require(_item.claimable, "Item not claimable.");
    require(msg.sender == _item.bidder, "Invalid account.");
    emit Claim(_itemNo, msg.sender, msg.value);
    deleteItem(_itemNo);
    return true;
  }

  function deleteItem(uint _itemNo) internal returns (bool) {
    initialized[_itemNo] = false;
    for (uint i = 0; i < itemIndex.length; i++) {
      if (itemIndex[0] == _itemNo) {
        itemIndex[0] = itemIndex[itemIndex.length - 1];
        itemIndex.length--;
        return true;
      }
    }

    return false;
  }
}
