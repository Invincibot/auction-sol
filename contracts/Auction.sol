pragma solidity ^0.5.0;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Auction {
  using SafeMath for uint;

  struct Item {
    uint reservePrice;
    uint startingBid;
    uint buyout;
    uint duration;
    uint endTime;
    uint bids;
    uint highBid;
    uint secondHighBid;
    address bidder;
    address payable seller;
    bool open;
    bool firstPrice;
  }

  event NewItem (
    uint indexed itemNo,
    uint startingBid,
    uint buyout,
    uint duration,
    bool open,
    bool firstPrice,
    address indexed seller
  );

  event Bid (
    uint indexed itemNo,
    uint amount,
    address indexed bidder
  );

  event ExtendTime (
    uint indexed itemNo,
    uint duration
  );

  event Sell (
    uint indexed itemNo,
    address indexed bidder,
    bool buyout,
    uint fee
  );

  event Claim (
    uint indexed itemNo,
    address indexed seller,
    uint fee
  );

  uint[] public itemIndex;

  mapping (uint => Item) private items;
  mapping (uint => bool) public initialized;

  address payable public admin;

  constructor () public {
    admin = msg.sender;
  }

  function initItem (uint _itemNo, uint _reservePrice, uint _startingBid, uint _buyout, uint _duration, bool _open, bool _firstPrice) public returns (bool) {
    require(!initialized[_itemNo], "Item under item number already exists.");
    require(!(_open && !_firstPrice), "Open second-price auctions not allowed.");
    Item memory _item = Item(_reservePrice, _startingBid, _buyout, _duration, block.timestamp + _duration, 0, 0, 0, address(0), msg.sender, _open, _firstPrice);
    items[_itemNo] = _item;
    initialized[_itemNo] = true;
    itemIndex.push(_itemNo);
    emit NewItem(_itemNo, _startingBid, _buyout, _duration, _open, _firstPrice, msg.sender);
    return true;
  }

  function getItemData (uint _itemNo) public view returns (uint, uint, uint, uint, uint, uint, address, address, bool, bool) {
    require(initialized[_itemNo], "Item not initialized");
    Item memory _item = items[_itemNo];
    if (_item.open) {
      return (_item.startingBid, _item.buyout, _item.duration, _item.endTime, _item.bids, _item.highBid, _item.bidder, _item.seller, _item.open, _item.firstPrice);
    }
    return (_item.startingBid, _item.buyout, _item.duration, _item.endTime, _item.bids, 0, address(0), _item.seller, _item.open, _item.firstPrice);
  }

  function getItemNumber (uint _itemID) public view returns (uint) {
    return itemIndex[_itemID];
  }

  function isOpen (uint _itemNo) public view returns (bool) {
    return items[_itemNo].endTime >= block.timestamp;
  }

  function getItemCount () public view returns (int) {
    return int(itemIndex.length);
  }

  function bid (uint _itemNo, uint _bid) public returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(isOpen(_itemNo), "Auction has closed already.");
    Item memory _item = items[_itemNo];
    require(_bid >= _item.startingBid, "Insufficient bid.");
    if (_item.open) {
      require(_bid > _item.highBid, "Insufficient bid.");
    }

    if (_item.open || _bid > _item.highBid) {
      items[_itemNo].highBid = _bid;
      items[_itemNo].bidder = msg.sender;
      if (!_item.firstPrice) {
        items[_itemNo].secondHighBid = _item.highBid;
      }
    }

    items[_itemNo].bids++;
    emit Bid(_itemNo, _bid, msg.sender);
    return true;
  }

  function extendTime (uint _itemNo, uint _extension) public returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(isOpen(_itemNo), "Auction has closed already.");
    Item memory _item = items[_itemNo];
    require(msg.sender == _item.seller, "Unauthorized account.");
    require(_extension <= _item.duration, "Extension amount too long.");

    items[_itemNo].endTime.add(_extension);
    items[_itemNo].duration = 0;
    emit ExtendTime(_itemNo, _extension);
    return true;
  }

  function buyout (uint _itemNo) public payable returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(isOpen(_itemNo), "Auction has closed already.");
    Item memory _item = items[_itemNo];
    require(_item.bids == 0, "Item already has bids.");
    require(msg.value == _item.buyout.mul(5).div(6), "Invalid amount.");

    _item.seller.transfer(msg.value.div(6).mul(5));
    admin.transfer(msg.value.div(6));
    deleteItem(_itemNo);
    emit Sell(_itemNo, _item.bidder, true, msg.value.div(6));
    return true;
  }

  function claimItem (uint _itemNo) public payable returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(!isOpen(_itemNo), "Item still on auction.");
    Item memory _item = items[_itemNo];
    if (_item.highBid >= _item.reservePrice) {
      require(msg.sender == _item.bidder, "Unauthorized account.");
      if (_item.firstPrice) {
        require(msg.value == _item.highBid.div(5).mul(6), "Invalid amount.");
      }
      else {
        if (_item.secondHighBid >= _item.reservePrice) {
          require(msg.value == _item.secondHighBid.div(5).mul(6), "Invalid amount.");
        }

        else {
          require(msg.value == _item.reservePrice.div(5).mul(6), "Invalid amount.");
        }
      }

      _item.seller.transfer(msg.value.div(6).mul(5));
      admin.transfer(msg.value.div(6));
      deleteItem(_itemNo);
      emit Sell(_itemNo, _item.bidder, false, msg.value.div(6));
    }

    else {
      require(msg.sender == _item.seller, "Unauthorized account.");
      require(msg.value == _item.reservePrice.div(5), "Invalid fee.");

      admin.transfer(msg.value);
      deleteItem(_itemNo);
      emit Claim(_itemNo, msg.sender, msg.value);
    }

    return true;
  }

  function deleteItem (uint _itemNo) private returns (bool) {
    require(initialized[_itemNo], "Invalid item number.");
    require(!isOpen(_itemNo), "Item still on auction.");

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
