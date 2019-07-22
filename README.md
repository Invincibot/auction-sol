# auction-sol
a solidity-based auction system
using eth
still in development

the auction style of items can be customized, using these input variables:
 - uint itemNumber - the itemNumber associated with the item
 - uint reservePrice - the minimum price for the item to be sold
 - uint startingBid - the minimum bid that can be made
 - uint buyout - a price that can be paid to immediately claim the item
 - uint duration - the time the auction will be held for
 - bool open - whether bids are public to all users
 - bool firstPrice - whether the winner pays his bid or the second-highest bid
