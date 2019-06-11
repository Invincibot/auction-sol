// Auction Pre-release Solution
// Code is split up into 3 tasks with utility methods at bottom.
// Possible (?) improvements (not required):
// 1. Ensure no items have the same item numbers.
// 2. Add a GUI.
// 3. Display more information about items during and after auction.
// 4. Run the data storage system on a dictionary (good), SQL (better), or blockchain via ethereum (best) using a js front-end.

// Task 1
// Collecting number of items.
var numberOfItems = collectNumberAtLeastThreshold(3, "Number of items:");

// Creating arrays for data storage with length as number of items.
var itemNo = new Array(numberOfItems);
var itemDesc = new Array(numberOfItems);
var itemReservePrice = new Array(numberOfItems);
var itemBids = new Array(numberOfItems);

// Arrays needed later.
var itemHighBid = new Array(numberOfItems);
var itemBuyer = new Array(numberOfItems);

// Repeating for every item.
for (var i = 0; i < numberOfItems; i++)
{
  // Collecting item number.
  itemNo[i] = collectNumberAtLeastThreshold(0, "Item " + (i + 1) + " number:");

  // Collecting item description.
  itemDesc[i] = prompt("Item " + (i + 1) + " description:");

  // Collecting item reserve price.
  itemReservePrice[i] = collectNumberAtLeastThreshold(0, "Item " + (i + 1) + " reserve price:");

  // Setting initial number of bids to 0.
  itemBids[i] = 0;

  // Setting initial bid amount to 0.
  itemHighBid[i] = 0;

  // Setting inital buyer to none.

  itemBuyer[i] = "None";
}

// Task 2
// Assuming items will be searched for at least once.
do {
  // Collecting item number to search for.
  var item = collectNumberAtLeastThreshold(0, "Requested item number:");

  // Defaulting item ID to -1 to fail if not found.
  var itemID = -1;

  // Looping through item number array to find item.
  for (var i = 0; i < numberOfItems; i++) {
    // Setting the item ID if the item number is found.
    if (itemNo[i] == item)
      itemID = i;
  }

  // Displaying information if the item is found.
  if (itemID >= 0) {
    console.log("Item number: " + itemNo[itemID]);
    console.log("Item description: " + itemDesc[itemID]);
    console.log("Current highest bid: " + itemHighBid[itemID]);
    console.log("Current highest bidder: " + itemBuyer[itemID]);

    // Asking if the bidder would like to bid.
    var bidQ = collectBinaryAnswer("Bid on item?");

    if (bidQ) {
      // Collecting buyer number.
      itemBuyer[itemID] = collectNumberAtLeastThreshold(0, "Buyer number:");

      // Collecting bid amount.
      itemHighBid[itemID] = collectNumberAtLeastThreshold(parseFloat(itemHighBid[itemID] + 0.01), "Bid amount:");

      // Increasing the amount of bids on the item by 1.
      itemBids[itemID]++;
    }
  }

  // Informing user that item was not found.
  else
    console.log("Item not found.");

  // Asking user if they wish to search again.
  var searchQ = collectBinaryAnswer("Search again?");

  // Repeating until user doesn't wish to search for another item.
} while (searchQ);

// Task 3
// Instantiating variables to count starting from 0.
var fees = 0;
var sold = 0;
var tooLow = 0;
var noBid = 0;

// Looping through each item to display final information.
for (var i = 0; i < numberOfItems; i++) {

  // Checking if item's final bid exceeds reserve price, marking it as sold and adding the individual fee to total fee.
  if (itemHighBid[i] > itemReservePrice[i]) {
    console.log("Item number " + itemNo[i] + " has been sold.");
    fees += itemHighBid[i] * 0.1;
    sold++;
  }

  // Checking if item had bids and adding to the counter.
  else if (itemBids[i] > 0) {
    console.log("Item number " + itemNo[i] + " has not been sold. Final bid: " + itemHighBid[i]);
    tooLow++;
  }

  // Checking if item had no bids and adding to the counter.
  else {
    console.log("Item number " + itemNo[i] + " has no bids.");
    noBid++;
  }
}

// Displaying requested final information.
console.log("Total fees: " + fees);
console.log("Items sold: " + sold);
console.log("Items which didn't meet reserve price: " + tooLow);
console.log("Items with no bids: "+ noBid)

// Utility methods
// Method prompts user and checking if numerical answer exceeds defined threshold.
function collectNumberAtLeastThreshold(threshold, message) {
  console.log(threshold);

  // Setting the initial value of the number to the threshold to not trigger error on first attempt.
  var number = threshold;

  do {
    // Informing user input must be at least the threshold.
    if (isNaN(number) || number < threshold)
      console.log("Input must be numerical and at least " + threshold + ".");

    // Collecting input number.
    number = prompt(message);

    // Looping until number is at least the threshold.
  } while (isNaN(number) || number < threshold);

  return number;
}

// Method prompts user and returns a boolean from a binary question.
function collectBinaryAnswer(message) {
  // Setting inital answer to "N" to not trigger error message on first attempt.
  var answerS = "N";
  do {
    // Informing user input must either be "Y" or "N".
    if (answerS != "Y" && answerS != "N")
      console.log("Invalid input.");

    // Asking user whether they wish to search for another item.
    answerS = prompt(message + " (Y/N)");

  // Repeating until valid input is given.
  } while (answerS != "Y" && answerS != "N");

  // Setting boolean value to true if the input is "Y" to search for another item.
  if (answerS == "Y")
    return true;

  // Else setting boolean to false.
  return false;
}
