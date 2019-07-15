App = {
  web3Provider: null,
  auction: null,
  auctionInstance: null,
  account: '0x0',
  loading: false,
  loadingAdmin: false,

  init: function() {
    console.log("Main script initalized.")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    }

    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("EnglishAuction.json", function(auction) {
      App.auction = TruffleContract(auction);
      App.auction.setProvider(App.web3Provider);
      App.auction.deployed().then(function(auction) {
        console.log(auction.address);
      });

      return App.render();
    });
  },

  render: function() {
    if (App.loading) {
      return;
    }

    App.loading = true;

    $("#content").css("display", "none");
    $("#loader").css("display", "block");

    web3.eth.getCoinbase(function(err, account) {
      if (err == null) {
        if (account == null) {
          $('#account-address').html("no account has been detected");
          $('#account-address').css("color", "red");
          $('#account-balance').html("an unknown amount of");
          $('#account-balance').css("color", "red");
        }

        else {
          App.account = web3.toChecksumAddress(account);
          $('#account-address').html(App.account);
          $('#account-address').css("color", "black");
          console.log(account);

          return web3.eth.getBalance(account, function(err, balance) {
            if (err == null) {
              var balanceEth = web3.fromWei(balance);
              var balanceEthStr = balanceEth.c[0].toString() + "." + balanceEth.c[1].toString();
              $('#account-balance').html(balanceEthStr);
              console.log(balanceEthStr);
            }
          });
        }
      }

      else
        console.log(err);
    });

    $("#biddable-items").empty();
    $("#auctioned-items").empty();
    var counter = 0;

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.getItemCount();
    }).then(function(count) {
      for (var i = 0; i < count; i++) {
        App.auctionInstance.getItemIDData(i).then(function(data) {
          if (data[5]) {
            var $tr = $("<tr>", {id: data[0], class: "item"});
            var $td = $("<td>" + data[0] + "</td>");
            $($tr).append($td);
            $td = $("<td>" + data[2] + "</td>");
            $($tr).append($td);
            $td = $("<td>" + web3.fromWei(data[3], 'ether') + "</td>");
            $($tr).append($td);
            $("#biddable-items").append($tr);
          }

          else {
            var $tr = $("<tr>", {id: data[0], class: "item"});
            var $td = $("<td>" + data[0] + "</td>");
            $($tr).append($td);
            $td = $("<td>" + web3.fromWei(data[3], 'ether') + "</td>");
            $($tr).append($td);
            $td = $("<td>" + web3.toChecksumAddress(data[4]) + "</td>");
            $($tr).append($td);
            $("#auctioned-items").append($tr);
          }

          counter++;

          if (counter == count) {
            if (i == count) {
              if ($("#biddable-items tr").length == 0) {
                var $error = $("<tr><th>No items found.</th></tr>");
                $("#biddable-items").append($error);
              }

              else {
                var $header = $("<tr>");
                var $heading = $("<th>Item Number</th>");
                $header.append($heading);
                $heading = $("<th>Number of Bids</th>");
                $header.append($heading);
                $heading = $("<th>Highest Bid</th>");
                $header.append($heading);
                $("#biddable-items").prepend($header);
              }

              if ($("#auctioned-items tr").length == 0) {
                var $error = $("<tr><th>No items found.</th></tr>");
                $("#auctioned-items").append($error);
              }

              else {
                var $header = $("<tr>");
                var $heading = $("<th>Item Number</th>");
                $header.append($heading);
                $heading = $("<th>Highest Bid</th>");
                $header.append($heading);
                $heading = $("<th>Auctioned To</th>");
                $header.append($heading);
                $("#auctioned-items").prepend($header);
              }
            }
          }
        });
      }
    });

    $("#bid-item #item-number").val("");
    $("#bid-item #bid-amount").val("");
    $("#claim-item #item-number").val("");

    $("#content").css("display", "block");
    $("#loader").css("display", "none");

    App.loading = false;

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.admin();
    }).then(function(admin) {
      if (admin == web3.toChecksumAddress(App.account))
        return App.renderAdmin();
    });
  },

  renderAdmin: function () {
    if (App.loadingAdmin) {
      return;
    }

    App.loadingAdmin = true;

    $("#add-item #item-number").val("");
    $("#add-item #reserve-price").val("");
    $("#end-auction #item-number").val("");

    $("#admin").css("display", "block");

    App.loadingAdmin = false;
  },

  initItem: function() {
    var _itemNo = $("#add-item #item-number").val();
    if (_itemNo == "") {
      return;
    }

    var _reservePrice = $("#add-item #reserve-price").val();
    if (_reservePrice == "") {
      return;
    }

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.admin();
    }).then(function(admin) {
      if (admin == App.account) {
        App.auctionInstance.initItem(Number(_itemNo), web3.toWei(Number(_reservePrice)), {from: App.account}).then(function(receipt) {
          App.render();
        });
      }
    });
  },

  bid: function() {
    var _itemNo = $("#bid-item #item-number").val();
    if (_itemNo == "") {
      return;
    }

    var _bidAmount = $("#bid-item #bid-amount").val();
    if (_bidAmount == "") {
      return;
    }

    _bidAmount = web3.toWei(Number(_bidAmount));

    console.log(_bidAmount);

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.getItemData(_itemNo);
    }).then(function(data) {
      console.log(web3.fromWei(data[2]));
      if (data[2] < _bidAmount) {
        App.auctionInstance.bid(Number(_itemNo), {from: App.account, value: _bidAmount}).then(function(receipt) {
          App.render();
        });
      }

      else {
        return;
      }
    });
  },

  endAuction: function() {
    var _itemNo = $("#end-auction #item-number").val();
    if (_itemNo == "") {
      return;
    }

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.admin();
    }).then(function(admin) {
      if (admin == App.account) {
        App.auctionInstance.endAuction(Number(_itemNo), {from: App.account}).then(function(receipt) {
          App.render();
        });
      }
    });
  },

  claimItem: function() {
    var _itemNo = $("#claim-item #item-number").val();
    if (_itemNo == "") {
      return;
    }

    App.auction.deployed().then(function(instance) {
      App.auctionInstance = instance;
      return App.auctionInstance.getItemData(Number(_itemNo));
    }).then(function(data) {
      if (data[3] == App.account) {
        App.auctionInstance.claimItem(Number(_itemNo), {from: App.account, value: data[2] / 5}).then(function(receipt) {
          App.render();
        });
      }
    });
  }
}

$(function() {
  $(window).on("load", function() {
    console.log("hello");
    App.init();
  });
});

$(document).ready(function() {
  $("#add-item #enter-data").on("click", function() {App.initItem()});
  $("#bid-item #enter-data").on("click", function() {App.bid()});
  $("#end-auction #enter-data").on("click", function() {App.endAuction()});
  $("#claim-item #enter-data").on("click", function() {App.claimItem()});
});
