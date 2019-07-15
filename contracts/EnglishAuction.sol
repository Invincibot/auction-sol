pragma solidity ^0.5.0;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "contracts/Auction.sol";

contract EnglishAuction is Auction {
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
}
